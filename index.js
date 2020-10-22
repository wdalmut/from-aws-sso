#!/usr/bin/env node

const R = require('ramda')
const path = require('path')
const fs = require('fs').promises
const ini = require('ini')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const glob = util.promisify(require('glob'))
const { program } = require('commander');
const package = require('./package.json')

program.version(package.version);

const homedir = require('os').homedir();

const aws_credentials = path.join(homedir, ".aws/credentials")
const sso_folder = path.join(homedir, ".aws/cli/cache")

program
  .option('-p, --profile <profile>', 'update credentials profile with name', 'default')

program.parse(process.argv);

const get_latest_credentials = R.curry((sso_folder, account_id) => {
  return glob(path.join(sso_folder, '*.json'))
    .then(R.ifElse(R.length, R.identity, () => Promise.reject("Missing CLI credentials in .aws/cli/*.json")))
    .then(R.compose(R.bind(Promise.all, Promise), R.map(fs.readFile)))
    .then(R.map(JSON.parse))
    .then(R.map(R.over(R.lensPath(['Credentials', 'Expiration']), R.compose(Date.parse, R.replace("UTC", "Z")))))
    .then(R.compose(R.reverse, R.sort(R.path(['Credentials', 'Expiration']))))
    .then(R.compose(R.prop('Credentials'), R.head))
    .then(R.invertObj)
    .then(R.map(R.cond([
      [R.equals('AccessKeyId'), R.always('aws_access_key_id')],
      [R.equals('SecretAccessKey'), R.always('aws_secret_access_key')],
      [R.equals('SessionToken'), R.always('aws_session_token')],
      [R.T, R.F]
    ])))
    .then(R.filter(R.identity))
    .then(R.invertObj)
    .then(credentials => ({[account_id]: credentials}))
})

const create_aws_credentials_file = R.curry((aws_credentials, account_id) => {
  return fs.stat(aws_credentials)
    .catch(() => fs.writeFile(aws_credentials, "")) // crea il file se manca
    .then(R.always(account_id))
})

const update_credentials_in_ini_file = R.curry(new_credentials => {
  return Promise.all([new_credentials, fs.readFile(aws_credentials)])
    .then(([new_credentials, ini_file]) => Promise.all([new_credentials, ini.parse(ini_file.toString())]))
    .then(([new_credentials, ini_file]) => R.mergeDeepRight(ini_file, new_credentials))
})

const write_to_ini_file = R.curry((aws_credentials, new_credentials) => {
  const updatedCredentials = ini.encode(new_credentials)
  return fs.writeFile(aws_credentials, updatedCredentials)
})

exec(`aws sts get-caller-identity --profile ${program.profile}`) // force CLI folder generation
  .then(R.always(program.profile))
  .then(create_aws_credentials_file(aws_credentials))
  .then(get_latest_credentials(sso_folder))
  .then(update_credentials_in_ini_file)
  .then(write_to_ini_file(aws_credentials))
  .then(() => console.log("Your profile is correctly updated!"))
  .catch(R.compose(console.log, R.prop('message')))
