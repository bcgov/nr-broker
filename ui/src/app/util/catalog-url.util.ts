import { ProvenanceDto, ProvenanceType } from '../service/persistence/dto/provenance.dto';

/**
 * The GitHub prefix used to recognise catalog repositories that can be linked to
 * the file on GitHub. Only GitHub hosts are supported; other SCM hosts such as
 * GitLab or Bitbucket are not linked.
 */
const GITHUB_REPOSITORY_PREFIX = 'https://github.com/';

/**
 * For a catalog provenance record, builds a link to the catalog file on GitHub
 * when the repository is a GitHub URL and a path is present. The link opens the
 * file on the default branch using HEAD. Returns undefined for other record
 * types, non-GitHub repositories or when no path is available.
 */
export function getCatalogFileUrl(
  record: Pick<ProvenanceDto, 'type' | 'repository' | 'path'>,
): string | undefined {
  if (record.type !== ProvenanceType.CATALOG) {
    return undefined;
  }
  const { repository, path } = record;
  if (!repository || !path || !repository.startsWith(GITHUB_REPOSITORY_PREFIX)) {
    return undefined;
  }
  // The catalog file may live at the repository root or in a subdirectory.
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${repository.replace(/\/+$/, '')}/blob/HEAD/${encodedPath}`;
}
