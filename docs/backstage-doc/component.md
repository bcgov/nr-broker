# Component schema

A `Component` creates or updates a Broker Service and links it to the source Repository. It can also link a Project, other Services and deployed Service instances. See [expected values and checks](/backstage-doc/README.md).

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: artist-web
  title: Artist web
  description: Website for artists
  tags: [frontend, music]
  links:
    - type: instance
      env: test
      title: test
      url: https://artist-test.example.gov.bc.ca
spec:
  system: artist
  type: website
  lifecycle: production
  owner: artist-team
  subcomponentOf: artist
  dependsOn:
    - component:default/artist-api
```

In this example, the `artist` Project and the `artist` and `artist-api` Services must exist, or be created by other catalog documents, for the corresponding links to be made. The `test` Environment must already exist.

## Fields

| Field | Expected value | Broker mapping and checks |
| --- | --- | --- |
| `kind` | `Component` | Exact match selects this parser. |
| `metadata.name` | Non-blank string | Required. Trimmed Service name and global lookup key. Use a stable lowercase kebab-case name. |
| `metadata.title`, `metadata.description` | Strings | Optional descriptive Service fields; no fixed vocabulary. Empty or non-string values are treated as absent. |
| `metadata.tags` | Array of strings | Optional replacement Service tags. See [tag handling](/backstage-doc/README.md#checks-and-open-ended-values). |
| `metadata.links` | Array of links | Optional. Only links with `type: instance` are used; non-object entries and other link types are ignored. An absent value, `null` or an empty array declares no desired instances for edge reconciliation. A non-array or invalid instance link rejects the entire Component document. |
| `spec.system` | Project name string | Optional. Looked up literally by Project name, not parsed as a Backstage entity reference. A `component` edge links the Project to the Service. If missing, the Service still syncs without a Project link and a warning is logged. If the named Project is missing, the Service still syncs but the scan reports a partial result. |
| `spec.type` | String | Optional Service type. Standard UI options are `service`, `website` and `library`, but sync does not enforce this list. |
| `spec.lifecycle` | String | Optional Service lifecycle. Standard UI options are `experimental`, `production` and `deprecated`, but sync does not enforce this list. |
| `spec.owner` | String | Optional free-form text stored in the Service vertex's `prop.owner` after trimming. It is not resolved to a user or group. A blank or omitted value does not clear an existing owner. |
| `spec.subcomponentOf` | One Component reference | Optional parent Service. When present it must be a non-empty string. Creates a child-to-parent `subcomponent-of` edge. |
| `spec.dependsOn` | Array of Component references | Optional dependency Services. When present it must be an array of non-empty strings. Creates `depends-on` edges; duplicate references are deduplicated. |

Except for the relationship and instance fields, optional scalar strings are treated as absent when empty or not strings. An empty `dependsOn` array declares no dependencies.

## Service references

References may be `name`, `default/name`, `component:name` or `component:default/name`. The optional `component` and `default` prefixes are case-insensitive; the name must begin with a letter or digit and contain only letters, digits, `_`, `.` or `-`. Surrounding whitespace is trimmed. Other kinds and namespaces are unsupported. Broker looks up the resulting name as a Service; it does not create a placeholder. Targets can be Components in this scan or existing Services in another repository.

Malformed field shapes reject the document during parsing. A syntactically unsupported reference or missing Service instead produces a partial sync and skips that relationship. Standard graph rules reject self-links, cycles and additional parents. Relationships are processed after all Components, so document order does not determine target availability.

The standard configuration marks both relationship edge types as restricted, so new edges do not carry inherited graph permissions. Existing edges retain their restriction setting. These edges do not cascade deletion to related Services in the standard configuration.

## Instance links

| Field | Expected value | Broker mapping and checks |
| --- | --- | --- |
| `type` | `instance` | Required to select the link; other values are ignored. |
| `env` | Non-blank string | Required. Trimmed and matched to an existing Environment name, short name or alias. |
| `title` | Non-blank string | Optional; trimmed and used as the instance name. Defaults to the trimmed `env` when omitted. Names must be distinct within the Component after trimming. |
| `url` | HTTP or HTTPS URL string | Required. Broker parses the URL and checks its protocol. It does not check whether the endpoint is reachable. |

Each instance gets an `instance` edge from the Service and a `deploy-type` edge to its Environment. An unknown environment fails that instance; Broker tries the remaining instances, reports a partial sync and skips stale-edge cleanup. The failed Component's Service relationships are not planned in that scan. An existing instance managed by a different catalog file or OpenSearch sync is skipped and also prevents stale-edge cleanup; an instance with manual or intention provenance can be adopted. An existing instance cannot be moved to another environment through catalog sync. Remove it in Broker or choose a new title.

Omitting `metadata.links`, setting it to `null` or removing an instance link does not preserve that instance's catalog-owned edges. On a complete scan, stale edges can be removed and trigger graph cascades. See [catalog graph behavior](/operations_github_catalog_sync.md#catalog-graph-behavior).
