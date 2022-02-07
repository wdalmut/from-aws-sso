#!/usr/bin/env node

const R = require('ramda')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { program } = require('commander');
const package = require('./package.json')

program.version(package.version);

const homedir = require('os').homedir();

program
  .option('-p, --profile <profile>', 'update credentials profile with name', 'default')
  .option('-d, --duration <duration>', 'session token duration in seconds', 3600)

program.parse(process.argv);

const get_user_from_current_identity = R.compose(R.last, R.split("/"))
const get_role_arn_from_current_identity = R.compose(R.join("/"), R.slice(0, -1), R.insert(1, 'aws-reserved/sso.amazonaws.com/eu-central-1'), R.split("/"), R.replace("sts", "iam"), R.replace('assumed-role', 'role'))

exec(`aws sts get-caller-identity --profile ${program.profile}`) // force CLI folder generation
  .then(R.compose(R.prop('Arn'), JSON.parse, R.prop('stdout')))
  .then(identity_arn => [get_user_from_current_identity(identity_arn), get_role_arn_from_current_identity(identity_arn)])
  .then(([user, role_arn]) => exec(`aws sts assume-role --duration-seconds ${program.duration} --role-arn ${role_arn} --role-session-name ${user} --profile ${program.profile}`))
  .then(R.compose(d => JSON.stringify(d, null, 2), R.assoc('Version', '1'), R.prop('Credentials'), JSON.parse, R.prop('stdout')))
  .then(console.log)