# Intention User Reference

The user object in the intention must uniquely identify a user in the Broker database. This can be achieved by defining either the id field or both the name and domain fields. As a shortcut, the name field can also specify the domain using an at mark (name@domain).

## Internal users

It is suggested that internal users used for automated processes use the 'internal' domain. See: [Adding Internal Users](/operations_internal_user.md)

## User Aliases

Users may be able to link their internal account with an external service like GitHub. This creates a unique alias to the internal account. An intention then can specify the user using that alias. This makes it easier to send the user associated with events triggered in an external service (like GitHub Actions). As as security measure, the GUID is used with external services instead of a name (username). So, the name field shortcut is specified as GUID@domain.
