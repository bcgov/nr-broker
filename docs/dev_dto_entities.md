# Data Transfer Objects

Data Transfer Objects (DTOs) encapsulate data exchanged with the back-end APIs. Files ending with `dto.ts` must remain identical between the back-end and front-end.

## Location

The path `./ui/service` contains a copy of the back-end project, stripped of all files except the DTOs.

There is a script `./scripts/copy-dto.sh` that can be used to copy the dto files from the the back-end to the front-end.

## References

DTOs may only import from the following:

- Other DTOs, using relative paths.
- `'class-transformer'`.
- `'class-validator'`.

This restriction ensures the DTO code can be easily shared with the front-end and other TypeScript code utilizing the REST APIs.

## Relation to Back-end Entities

The database layer uses **entities**, which are similar in purpose to DTOs but handle data transfer to and from the database.

- **Back-end `service` code** is allowed to manipulate entities as they serve as abstractions.
- **Back-end `controller` code** must not manipulate entities. Instead, the REST API should only send or receive DTOs.

Some DTOs closely mirror the structure of database entities. However, the back-end rarely (if ever) transforms entities into DTOs when returning data via controllers and the REST API. Instead, entities are configured to use Mikro-ORM's built-in serialization, which transforms them into plain objects (POJOs) that match the DTO structure.

Sharing entities with the front-end would introduce several issues:
- **Incorrect typing:** Fields stripped in the front-end would need to be optional in the back-end.
- **Unnecessary exposure:** Fields like `_id`, a binary `ObjectId`, have no utility in the front-end and should not appear in the API.

Additionally, sensitive fields are excluded. Since there is a significant difference between the data schema used for storage and the schema consumed by the front-end, DTOs are created to:
1. Validate incoming data.
2. Transform JSON fields (e.g., `boolean`, `string`, `number`) into higher-order objects like `Date`, in a consistent manner.

The primary drawback is the need to copy DTO data to entities when creating or updating entities.

## Embedded versus Entities

The database layer uses **Embeddable** objects to represent reusable components within database entities. These objects:
- Can be shared among multiple entities.
- Are stored as objects in the database.

## Embedded DTOs?

DTOs are often composed for specific use cases, such as pagination responses. Since all DTOs are embeddable, class names do not explicitly distinguish between "root" DTOs and embedded ones.
