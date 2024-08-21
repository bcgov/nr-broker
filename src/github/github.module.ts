import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
@Module({
  imports: [],
  providers: [GithubService, GithubController],
})
export class GithubModule {}