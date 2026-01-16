import { ApiProperty } from '@nestjs/swagger';

export class IntentionCloseDto {
  @ApiProperty({ example: 200, description: 'The http status code' })
  statusCode!: number;
  @ApiProperty({ description: 'Human readable message' })
  message!: string;
  @ApiProperty({ description: 'URL to view audit of this intention' })
  audit?: string;
  @ApiProperty({ description: 'Detailed error message' })
  error?: string;
}
