import { Test, TestingModule } from '@nestjs/testing';
import { GithubService } from './github.service';
import axios from 'axios';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';

jest.mock('axios');
jest.mock('fs');
jest.mock('jsonwebtoken');

describe('GithubService', () => {
  let service: GithubService;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockJwt: jest.Mocked<typeof jwt>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(async () => {
    mockAxios = axios as jest.Mocked<typeof axios>;
    mockJwt = jwt as jest.Mocked<typeof jwt>;
    mockFs = fs as jest.Mocked<typeof fs>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubService],
    }).compile();

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

      expect(() => service['getOwnerAndRepoFromUrl'](repoUrl)).toThrow('Invalid GitHub URL');
    });
  });

  describe('updateSecret', () => {
    it('should update a secret in a repository', async () => {
      const repoUrl = 'https://github.com/owner/repo';
      const secretName = 'MY_SECRET';
      const secretValue = 'my_secret_value';
      const publicKey = 'public_key';
      const keyId = 'key_id';
      const encryptedSecret = 'encrypted_secret';
      const token = 'access_token';

      jest.spyOn(service as any, 'getInstallationAccessToken').mockResolvedValue(token);
      jest.spyOn(service as any, 'encryptSecret').mockReturnValue(encryptedSecret);
      mockAxios.get.mockResolvedValue({ data: { key: publicKey, key_id: keyId } });
      mockAxios.put.mockResolvedValue({});

      await service.updateSecret(repoUrl, secretName, secretValue);

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repos/owner/repo/actions/secrets/public-key`,
        { headers: { Authorization: `token ${token}` } }
      );
      expect(mockAxios.put).toHaveBeenCalledWith(
        `/repos/owner/repo/actions/secrets/${secretName}`,
        { encrypted_value: encryptedSecret, key_id: keyId },
        { headers: { Authorization: `token ${token}` } }
      );
    });
  });
});
