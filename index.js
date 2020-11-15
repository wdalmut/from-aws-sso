#!/usr/bin/env node

const R = require('ramda')
const path = require('path')
const fs = require('fs').promises
const ini = require('ini')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { program } = require('commander');
const package = require('./package.json')

program.version(package.version);

const homedir = require('os').homedir();

const aws_credentials = path.join(homedir, ".aws/credentials")
const sso_folder = path.join(homedir, ".aws/cli/cache")

program
  .option('-p, --profile <profile>', 'update credentials profile with name', 'default')
  .option('-d, --duration <duration>', 'session token duration in seconds', 3600)

program.parse(process.argv);

const prepare_credentials = R.curry(identity => {
  return Promise.resolve(R.prop('Credentials', identity))
  
    .then(R.invertObj)
    .then(R.map(R.cond([
      [R.equals('AccessKeyId'), R.always('aws_access_key_id')],
      [R.equals('SecretAccessKey'), R.always('aws_secret_access_key')],
      [R.equals('SessionToken'), R.always('aws_session_token')],
      [R.equals('Expiration'), R.always('expiration')],
      [R.T, R.F]
    ])))
    .then(R.invertObj)
    .then(credentials => ({[program.profile]: credentials}))
})

const create_aws_credentials_file = R.curry((aws_credentials, account_id) => {
  return fs.stat(aws_credentials)
    .catch(() => fs.writeFile(aws_credentials, "")) // crea il file se manca
    .then(R.always(account_id))
})

const update_credentials_in_ini_file = R.curry((aws_credentials, new_credentials) => {
  return Promise.all([new_credentials, fs.readFile(aws_credentials)])
    .then(([new_credentials, ini_file]) => Promise.all([new_credentials, ini.parse(ini_file.toString())]))
    .then(([new_credentials, ini_file]) => R.mergeDeepRight(ini_file, new_credentials))
})

const write_to_ini_file = R.curry((aws_credentials, new_credentials) => {
  const updatedCredentials = ini.encode(new_credentials)
  return fs.writeFile(aws_credentials, updatedCredentials)
})

const get_user_from_current_identity = R.compose(R.last, R.split("/"))
const get_role_arn_from_current_identity = R.compose(R.join("/"), R.slice(0, -1), R.insert(1, 'aws-reserved/sso.amazonaws.com/eu-central-1'), R.split("/"), R.replace("sts", "iam"), R.replace('assumed-role', 'role'))

exec(`aws sts get-caller-identity --profile ${program.profile}`) // force CLI folder generation
  .then(R.compose(R.prop('Arn'), JSON.parse, R.prop('stdout')))
  .then(identity_arn => [get_user_from_current_identity(identity_arn), get_role_arn_from_current_identity(identity_arn)])
  .then(([user, role_arn]) => exec(`aws sts assume-role --duration-seconds ${program.duration} --role-arn ${role_arn} --role-session-name ${user} --profile ${program.profile}`))
  .then(R.compose(JSON.parse, R.prop('stdout')))
  .then(create_aws_credentials_file(aws_credentials))
  .then(prepare_credentials)
  .then(update_credentials_in_ini_file(aws_credentials))
  .then(write_to_ini_file(aws_credentials))
  .then(() => console.log("Your profile is correctly updated!"))
  .catch(R.compose(console.log, R.prop('message')))