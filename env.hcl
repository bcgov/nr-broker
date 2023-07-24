vault {
  address = "http://localhost:8200"
  renew_token = false
  retry {
    enabled = true
    attempts = 12
    backoff = "250ms"
    max_backoff = "1m"
  }
}

secret {
    no_prefix = true
    path   = "database/creds/broker-role"

    key {
      name   = "username"
      format = "MONGODB_USERNAME"
    }
    key {
      name   = "password"
      format = "MONGODB_PASSWORD"
    }
}

exec {
  splay = "0s"
  env {
    pristine = false
  }
  kill_timeout = "5s"
}
