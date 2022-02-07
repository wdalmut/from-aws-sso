# AWS SSO Credentials Generator

Simplify the AWS credentials for AWS SSO

## Install

```sh
npm i -g @wdalmut/from-aws-sso
```

## Login with SSO

First of all be sure that you have the credentials

```sh
aws sso login --profile my-profile
```

## Setup AWS credentials

First of you have to setup your `.aws/config` file. In this file you will find
your AWS SSO configuration like

```ini
[profile my-profile]

sso_start_url = ...
sso_region = ...
sso_account_id = ...
sso_role_name = ...
region = ...
```

In this configuration add the following line

```
credential_process=from-aws-sso -p my-profile
```

Your configuration will be something like:

```ini
[profile my-profile]
credential_process=from-aws-sso -p my-profile

sso_start_url = ...
sso_region = ...
sso_account_id = ...
sso_role_name = ...
region = ...
```

Thanks to the `credential_process` the credentials will be automatically
generated and refreshed for your application

In order to use the profile from your application you have to pass a couple
of environment variables `AWS_PROFILE` and `AWS_SDK_LOAD_CONFIG`. For example

```sh
AWS_PROFILE=my-profile AWS_SDK_LOAD_CONFIG=1 node index.js
```

For example you can check that everything works using something like (need `aws-sdk`)

```sh
AWS_PROFILE=my-profile AWS_SDK_LOAD_CONFIG=1 node -e "new (require('aws-sdk')).STS().getCallerIdentity(console.log)"
```
