import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { GithubTokenService } from './github-token.service';

describe('GithubTokenService', () => {
  const build = () => {
    const githubService = {
      getOrgInstallationId: vi.fn().mockResolvedValue(123),
      createInstallationAccessToken: vi.fn().mockResolvedValue({
        token: 'installation-token',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    };
    const service = new GithubTokenService(githubService as any);
    vi.spyOn(service, 'generateJWT').mockReturnValue('app-jwt');
    return { service, githubService };
  };

  it('adds organization lookup context when GitHub rejects the request', async () => {
    const { service, githubService } = build();
    const failure = new AxiosError(
      'Request failed with status code 401',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 401,
        data: { message: 'Bad credentials' },
      } as any,
    );
    githubService.getOrgInstallationId.mockRejectedValue(failure);

    await expect(service.getOrgInstallationToken('example')).rejects.toMatchObject({
      name: 'GithubApiOperationError',
      operation: 'getOrgInstallationId',
      status: 401,
      message: expect.stringContaining(
        'GitHub rejected the app JWT; check the app ID and private key',
      ),
      cause: failure,
    });
    expect(githubService.createInstallationAccessToken).not.toHaveBeenCalled();
  });

  it('adds token creation context and identifies rate limits', async () => {
    const { service, githubService } = build();
    const failure = new AxiosError(
      'Request failed with status code 403',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 403,
        data: { message: 'You have exceeded a secondary rate limit' },
        headers: { 'retry-after': '60' },
      } as any,
    );
    githubService.createInstallationAccessToken.mockRejectedValue(failure);

    const rejection = service.getOrgInstallationToken('example');
    await expect(rejection).rejects.toMatchObject({
      name: 'GithubApiOperationError',
      operation: 'createInstallationAccessToken',
      status: 403,
      isRateLimited: true,
      message: expect.stringContaining('GitHub rate limit reached'),
      cause: failure,
    });
  });
});
