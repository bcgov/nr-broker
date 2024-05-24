# Adding internal users

When opening an intention, NR Broker requires an authorized user be attached to the actions. If a user triggers a deploy then the attached user should be who triggered it. It can be impractical to force teams to attach a real user to intentions opened by automated processes like cron jobs. As an alternative, internal users can be added to the database so that teams have the option to include them on their teams.

You may want to add a single internal user for use with all automation or multiple. In either case, teams need to add them like any other user.

The following is an example JSON to send to `/v1/collection/user/import` to add an internal user. If you are an admin user, you can use the interactive Swagger API documentation to send the request. You should generate your own guid.

```json
{
  "domain": "internal",
  "email": "",
  "guid": "7cf679ad-3924-4093-839a-f1f9a650b5e2",
  "name": "GitHub Action",
  "username": "github"
}
```

Teams should be encouraged to use the most appropriate user (internal or real) for their use case.
