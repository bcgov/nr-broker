import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GithubSyncService } from './github-sync.service';

describe('GithubSyncService', () => {
  let service: GithubSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubSyncService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<GithubSyncService>(GithubSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOwnerAndRepoFromUrl', () => {
    it('should extract owner and repo from URL', () => {
      const repoUrl = 'https://github.com/myorg/mytestrepo.git';
      const result = service['getOwnerAndRepoFromUrl'](repoUrl); // Using private method directly for testing

      expect(result).toEqual({ owner: 'myorg', repo: 'mytestrepo' });
    });

    it('should throw an error for invalid URL', () => {
      const repoUrl = 'invalid_url';
      expect(() => service['getOwnerAndRepoFromUrl'](repoUrl)).toThrow(
        'Invalid GitHub URL',
      );
    });
  });
});
