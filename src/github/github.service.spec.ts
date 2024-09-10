import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { GithubService } from './github.service';

describe('GithubService', () => {
  let service: GithubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<GithubService>(GithubService);
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
