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

First of you have to setup your `.aws/credentials` file

```ini
[my-profile]
credential_process=from-aws-sso -p my-profile
```

Thanks to the `credential_process` the credentials will be automatically
generated and refreshed for your application
