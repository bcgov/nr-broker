# Backstage catalog sync reference

This reference describes the fields NR Broker reads from Backstage catalog YAML. It is not a complete Backstage schema or a validator for Backstage itself. Backstage may impose additional requirements.

- For scheduling, configuration, manual scans and graph behavior, see [GitHub sync (catalog)](/operations_github_catalog_sync.md).
- [Component schema](/backstage-doc/component.md): Services, instances and Service relationships.
- [System schema](/backstage-doc/system.md): Projects.
- [Location schema](/backstage-doc/location.md): files to read from a repository.

## What Broker reads

Broker reads `catalog-info.yaml` at the root of the default branch and follows root Location targets one level. A file can contain multiple YAML documents separated by `---`. Component and System documents are processed in the root and target files; Location documents are processed only in the root. Other kinds, including API, Resource and Domain, are ignored. Broker selects documents by the exact `kind` value and does not validate `apiVersion`. Use `backstage.io/v1alpha1` for Backstage compatibility.

The schemas in this folder describe one YAML document each. Fields not listed are ignored by this sync, even if Backstage uses them. In particular, Broker does not create graph entities from annotations or from an API document.

## Checks and open-ended values

| Category | Broker behavior |
| --- | --- |
| Document and field shape | Invalid YAML, missing Component or System names, malformed Component relationships, and invalid instance links produce parse errors. The affected document is skipped and the scan is incomplete. Other valid documents can still sync. |
| References and graph integrity | A Component's system must match an existing Project to create a project link. Relationship references must resolve to existing Services and graph rules apply. Instance environments must already exist. These checks happen during sync, not just YAML parsing. Failures are reported; they do not create missing targets. |
| Descriptive values | Titles, descriptions, types, lifecycle, owner, domain and tags are not checked against a catalog of approved values by this sync. For example, the standard Service configuration offers `service`, `website` and `library` types and `experimental`, `production` and `deprecated` lifecycles; these are UI options, not sync-enforced enums. |
| Ignored values | Unsupported kinds and fields are ignored. Invalid Location targets are ignored rather than reported as document errors. Optional scalar values that are empty or not strings are generally treated as absent; malformed tag arrays are also treated as absent. See each schema for exceptions. |

Use stable, unique, lowercase kebab-case names as a convention. Project and Service names identify existing graph vertices globally; a Component name is also the name used by Service references. The catalog parser trims Component and System names and rejects names that are empty after trimming. The collection configuration describes names as unique and lowercase kebab-case, but the parser does not enforce that format.

Trimming changes the lookup name. Existing Projects or Services whose names contain leading or trailing whitespace are not renamed automatically; a scan may instead create a separate item with the trimmed name.

For new vertices, collection configuration defaults supply fields not set by the catalog. For existing vertices, absent catalog values normally leave existing values unchanged. Tags are different: a supplied string array replaces tags after removing `&`, `<`, `>`, `"`, and `'`, trimming, removing empty entries and deduplicating. An empty array clears tags; omitted or malformed tags leave them unchanged. Removing a Component owner or supplying a blank owner does not clear an existing owner.

Catalog ownership, partial scans and edge cleanup affect the outcome of updates. Read [catalog graph behavior](/operations_github_catalog_sync.md#catalog-graph-behavior) before changing or removing declarations.
