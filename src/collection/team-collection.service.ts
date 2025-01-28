import { Injectable } from '@nestjs/common';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionIndex } from '../graph/graph.constants';
import { BrokerAccountDto } from '../persistence/dto/broker-account.dto';
import { AccountService } from './account.service';

@Injectable()
export class TeamCollectionService {
  constructor(
    private readonly accountService: AccountService,
    private readonly graphRepository: GraphRepository,
  ) {}

  async refresh(id: string) {
    const accounts =
      await this.graphRepository.getDownstreamVertex<BrokerAccountDto>(
        id,
        CollectionIndex.BrokerAccount,
        1,
      );
    for (const account of accounts) {
      await this.accountService.refresh(account.collection.id);
    }
  }
}
