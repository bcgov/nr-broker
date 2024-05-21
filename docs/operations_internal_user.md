# Adding internal users for automated processes

Internal users can be added to the database so that teams have the option to include them on their teams. The main use case for this is automated processes.

You may want to add a single internal user for use with all automation or multiple. In either case, teams need to add them like any other user.

The following is an example JSON to send to `/v1/collection/user/import` to add an internal user. If you are an admin user, you can use the interactive Swagger documentation to send the request. You should generate your own guid.

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
