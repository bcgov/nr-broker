import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { MikroORM } from '@mikro-orm/core';

import { TokenService } from './token.service';
import { VaultService } from '../vault/vault.service';

describe('TokenService', () => {
  let service: TokenService;
  let vaultService: {
    hasValidToken: ReturnType<typeof vi.fn>;
    postAuthMountRoleNameSecretId: ReturnType<typeof vi.fn>;
    postSysAuditHash: ReturnType<typeof vi.fn>;
    postAuthLogin: ReturnType<typeof vi.fn>;
    getAuthTokenLookupSelf: ReturnType<typeof vi.fn>;
    getAuthMountRoleNameRoleId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    process.env.VAULT_SYNC_APP_AUTH_MOUNT = 'vs_apps_approle';
    process.env.VAULT_AUDIT_DEVICE_NAME = 'file';
    process.env.VAULT_KV_APPS_MOUNT = 'apps';

    vaultService = {
      hasValidToken: vi.fn(() => false),
      postAuthMountRoleNameSecretId: vi.fn(),
      postSysAuditHash: vi.fn(),
      postAuthLogin: vi.fn(),
      getAuthTokenLookupSelf: vi.fn(() => of({ data: { data: { creation_time: 1, creation_ttl: 60 } } })),
      getAuthMountRoleNameRoleId: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: VaultService, useValue: vaultService },
        { provide: MikroORM, useValue: {} },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hasValidToken should proxy Vault token state', () => {
    vaultService.hasValidToken.mockReturnValueOnce(true);
    expect(service.hasValidToken()).toBe(true);

    vaultService.hasValidToken.mockReturnValueOnce(false);
    expect(service.hasValidToken()).toBe(false);
  });

  it('provisionSecretId should return wrapped token and audit hash', async () => {
    vaultService.postAuthMountRoleNameSecretId.mockReturnValueOnce(
      of({ data: { wrap_info: { token: 'wrapped-token' } } }),
    );
    vaultService.postSysAuditHash.mockReturnValueOnce(
      of({ data: { data: { hash: 'audit-hash' } } }),
    );

    const result = await service
      .provisionSecretId('my_project', 'my_app', 'production')
      .toPromise();

    expect(vaultService.postAuthMountRoleNameSecretId).toHaveBeenCalledWith(
      'vs_apps_approle',
      'my-project_my-app_prod',
      { wrapResponse: true },
    );
    expect(result).toEqual({
      audit: { clientToken: 'audit-hash' },
      wrappedToken: { wrap_info: { token: 'wrapped-token' } },
    });
  });

  it('provisionToken should use secret id and return audit hash', async () => {
    vaultService.postAuthMountRoleNameSecretId.mockReturnValueOnce(
      of({ data: { data: { secret_id: 'secret-id' } } }),
    );
    vaultService.postAuthLogin.mockReturnValueOnce(
      of({ data: { wrap_info: { token: 'client-token' } } }),
    );
    vaultService.postSysAuditHash.mockReturnValueOnce(
      of({ data: { data: { hash: 'audit-hash' } } }),
    );

    const result = await service
      .provisionToken('my_project', 'my_app', 'test', 'role-id')
      .toPromise();

    expect(vaultService.postAuthMountRoleNameSecretId).toHaveBeenCalledWith(
      'vs_apps_approle',
      'my-project_my-app_test',
    );
    expect(vaultService.postAuthLogin).toHaveBeenCalledWith(
      'vs_apps_approle',
      'role-id',
      'secret-id',
    );
    expect(result).toEqual({
      audit: { clientToken: 'audit-hash' },
      wrappedToken: { wrap_info: { token: 'client-token' } },
    });
  });

  it('getAppRoleInfoForApplication should map role metadata', async () => {
    vaultService.getAuthMountRoleNameRoleId.mockReturnValueOnce(
      of({ data: { data: { role_id: 'role-id' } } }),
    );

    const result = await service
      .getAppRoleInfoForApplication('my_project', 'my_app', 'production')
      .toPromise();

    expect(vaultService.getAuthMountRoleNameRoleId).toHaveBeenCalledWith(
      'vs_apps_approle',
      'my-project_my-app_prod',
    );
    expect(result).toEqual({
      id: 'role-id',
      kvUiPath: 'ui/vault/secrets/apps/kv/list/prod/my_project/my_app',
      kvApiDataPath: 'apps/data/prod/my_project/my_app',
      kvApiMetadataPath: 'apps/metadata/prod/my_project/my_app',
      mount: 'vs_apps_approle',
      name: 'my-project_my-app_prod',
    });
  });
});
