# Location schema

A root `Location` identifies additional catalog files in the same repository. It does not create a Broker graph vertex. See [expected values and checks](/backstage-doc/README.md).

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: artist-catalog
spec:
  type: path
  targets:
    - ./api/catalog-info.yaml
    - ./web/catalog-info.yaml
```

| Field | Expected value | Broker mapping and checks |
| --- | --- | --- |
| `kind` | `Location` | Exact match selects this parser in the root file only. |
| `metadata.name` | String | Conventional Backstage metadata; ignored by Broker. |
| `spec.type` | `path` | Conventional Backstage value; ignored by Broker. |
| `spec.target` | Relative path string | Optional single target. |
| `spec.targets` | Array of relative path strings | Optional multiple targets. Both `target` and `targets` are collected if supplied. |

Paths are resolved relative to the declaring file and normalized. Broker ignores non-strings, empty strings, absolute paths, strings containing `://` or `*`, and paths that resolve outside the repository. A non-array `targets` is ignored. Target paths are deduplicated, and the root file is not read again if it is listed as a target. Broker reads each accepted target from the default branch; it does not expand globs or fetch URLs.

Only Component and System documents in target files are processed. Nested Location documents are ignored. An accepted target that cannot be found makes the scan incomplete; other readable files can still sync. Invalid targets that are filtered out do not themselves make the scan incomplete, so check paths carefully before removing or changing them.
