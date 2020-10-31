# AWS SSO Credentials Generator

Create or updates the `.aws/credentials` file with AWS SSO temporary credentials

## Install

```sh
npm i -g @wdalmut/from-aws-sso
```

## Usage

First of all create your AWS SSO credentials

```sh
aws sso login --profile saml
```

then transfer that credentials to `.aws/credentials` file

```sh
from-aws-sso --profile saml
```

