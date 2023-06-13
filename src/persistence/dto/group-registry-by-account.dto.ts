import { ObjectId } from 'mongodb';

export interface GroupRegistryByAccountDto {
  _id: { accountId: ObjectId };
  createdAt: Date[];
  jti: string[];
  blocked: boolean[];
}
