import { Controller, Post, Body } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post('update-secret')
  async updateSecret(
    @Body('repoUrl') repoUrl: string,
    @Body('secretName') secretName: string,
    @Body('secretValue') secretValue: string,
  ): Promise<void> {
    await this.githubService.updateSecret(repoUrl, secretName, secretValue);
  }
}
