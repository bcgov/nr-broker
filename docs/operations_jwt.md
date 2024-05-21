Applications authenticate with the Broker using a JWT. Users associated with a'team' vertex in the graph can generate tokens for that team. The team's properties and its connections in the graph provides authorization.

# JWT Payload

| Claim | Type | Usage |
| ----- | ---- | ----- |
| client_id | Public | The client id associated with the broker account |
| exp | Public | Expiry |
| iat | Public | Issued at |
| nbf | Public | Not Before |
| jti | Public | JWT ID |
| sub | Public | Subject. Email address for team. |

See: https://www.iana.org/assignments/jwt/jwt.xhtml

# JWT Tools

https://jwt.io/#debugger-io

### Updating JWT allow/block list

The JWT allow and block lists are stored in the collections jwtAllow and jwtBlock, respectively. The lists allow you to filter on the cliams 'jti', 'sub' and 'client_id'. Allowing or blocking is specified by adding a document to the associated collection with any, all or none of those cliams specified. Keys that are not present are considered to match. This means you can allow (or block) all JWTs by adding an empty object. An allow document of `{"sub":"cool@person.tv"}` means all JWT cliams with a sub matching "cool@person.tv" will be allowed. If you add a JTI key/value as well then both the JTI and sub will need to match. The block list works similarly.
