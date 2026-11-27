# System schema

A `System` creates or updates a Broker Project, even when no Component references it. Systems are synced before Components, regardless of document or file order. A Component can link to the Project by placing the System's `metadata.name` in `spec.system`. See [expected values and checks](/backstage-doc/README.md).

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: artist
  title: Artist
  description: Services for artists
  tags: [music]
spec:
  domain: entertainment
  type: product
```

| Field | Expected value | Broker mapping and checks |
| --- | --- | --- |
| `kind` | `System` | Exact match selects this parser. |
| `metadata.name` | Non-blank string | Required. Trimmed Project name and global lookup key. Use a stable lowercase kebab-case name. |
| `metadata.title`, `metadata.description` | Strings | Optional descriptive Project fields; no fixed vocabulary. |
| `metadata.tags` | Array of strings | Optional replacement Project tags. See [tag handling](/backstage-doc/README.md#checks-and-open-ended-values). |
| `spec.domain` | String | Optional free-form Project field stored as supplied. Broker does not resolve it or create a Domain entity. |
| `spec.type` | String | Optional free-form Project type, such as `product` or `platform`; no fixed vocabulary is enforced by this sync. |

Optional scalar values that are empty or not strings are treated as absent. A malformed tag array is also treated as absent. Other System fields, including `spec.owner`, are not used by this sync. Existing Projects managed by another catalog file are linked without updating their fields.
