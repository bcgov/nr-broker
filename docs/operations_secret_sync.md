# Tools Secret Syncronization

Note: This document is about NR Broker secret syncronization. Vault can do secret syncronization as well.

## Github Secrets

NR Broker can synchronize a service's tools secrets from Vault to GitHub. The main purpose is to use Broker Account tokens in GitHub actions. The automation means GitHub always has the most recent active token avialable.

### Prerequisites

* Your deployment must be setup for GitHub Syncronization
* Service must have its SCM URL set
* GitHub repository must be in an organization enabled

## How it works

After a token is generated or secrets are manually syncronized, all secrets in the tools namespace for a service (`apps-kv-mount`/tools/`project`/`service`) in Vault will be syncronized to the associated services' GitHub repository as secrets.

> GitHub Secrets have a more restrictive key format than Vault. Please ensure that secret keys in Vault also work well as GitHub secret keys.

### Setup

NR Broker must be configured with a [Github App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) to enable this feature. See: [Backend Environment Variables](dev_env_vars.md)

Install the [Github App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) in all repositories associated with services. Grant the app read/write access to repository secrets.

The token used by NR Broker must also be permitted to read secrets from the tools path. It is not recommended to enable access to other service environments.
