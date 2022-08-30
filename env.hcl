vault {
  address = "https://vault-iit.apps.silver.devops.gov.bc.ca"
  retry {
    enabled = true
    attempts = 12
    backoff = "250ms"
    max_backoff = "1m"
  }
}

secret {
    no_prefix = true
    path = "apps/prod/fluent/fluent-bit"
}

exec {
  command = "node dist/main"
  splay = "0s"
  env {
    pristine = false
  }
  kill_timeout = "5s"
}
