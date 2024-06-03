# Intention Action Reference

## Actions

| Action | Description |
| --- | --- |
| backup | Backing up files, database and other activities like this. |
| database-access | Access a database for any purpose |
| server-access | Access a server for any purpose |
| package-build | Building a package that will later be used by a 'package-installation' action. |
| package-configure | Altering an installed package configuration. This configuration must not be a secret or token used to access resources like the database or another service. |
| package-installation | Deploying a new version of a service. This includes activities like changing a deployment configuration in OpenShift or running Terraform in AWS as well as copying files to a server. |
| package-provision | Providing an installed package with tokens or other secrets for it to operate |
| process-end | Indicates the ending of a process (shutting down of a service) |
| process-start | Indicates the starting of a process (starting up of a service) |

The actions are loosely based on Elastic Common Schema [event.action](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-action) which is "more specific than" [event.category](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-category). The [accepted values for event.category](https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-category.html) are a good starting point if you need to add a new value.

The first pass at defining actions directly used the event category and type fields. This proved difficult as the audit logs themselves are events (that should be categorized). The Elastic Common Schema definition for those fields, while logical, had to be twisted to define many actions, obscured what the action was and setting two or more fields was error prone. So, the action became a single separate field, but, we still want it to be similar to the event.action field.

### Extended Attributes

Actions should extend the action with the following Elastic Common Schema field set where appropriate.

| Action | cloud |
| --- | --- |
| backup | |
| database-access | |
| server-access | |
| package-configure | |
| package-installation | yes |
| package-provision | yes |

## Examples

Developers are encouraged to populate as many fields as possible.

### On-premise Deployment Intention

```json
{
  "event": {
    "reason": "Job triggered",
    "url": "JOB_URL"
  },
  "actions": [
    {
      "action": "server-access",
      "id": "login",
      "provision": ["token/self"],
      "service": {
        "name": "jenkins_isss",
        "project": "jenkins",
        "environment": "production"
      }
    },
    {
      "action": "package-installation",
      "id": "install",
      "provision": [],
      "service": {
        "name": "fluent-bit",
        "project": "fluent",
        "environment": "production",
        "version": "2.73.2"
      }
    },
    {
      "action": "package-provision",
      "id": "provision",
      "provision": ["approle/secret-id"],
      "service": {
        "name": "fluent-bit",
        "project": "fluent",
        "environment": "production"
      }
    }
  ],
  "user": {
    "id": "USER_ID"
  }
}
```

### DB Patch Intention

```json
{
  "event": {
    "reason": "Job triggered",
    "url": "JOB_URL"
  },
  "actions": [
    {
      "action": "server-access",
      "id": "login",
      "provision": ["token/self"],
      "service": {
        "name": "jenkins_isss",
        "project": "jenkins",
        "environment": "production"
      }
    },
    {
      "action": "database-access",
      "id": "database",
      "provision": ["approle/secret-id"],
      "service": {
        "name": "mydb-service-db",
        "project": "myproject",
        "environment": "production"
      }
    }
  ],
  "user": {
    "id": "USER_ID"
  }
}
```