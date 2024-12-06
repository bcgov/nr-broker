export class GroupRegistryByAccountDto {
  _id: { accountId: string };
  createdAt: Date[];
  jti: string[];
  blocked: boolean[];
}
