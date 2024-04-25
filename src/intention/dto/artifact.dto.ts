import {
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  ValidationOptions,
  isHash,
  registerDecorator,
} from 'class-validator';
import { Entity, Column } from 'typeorm';

export function IsValidHash(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidHash',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          return (
            typeof value === 'string' && !isHash.call(null, value.split(':'))
          );
        },
      },
    });
  };
}

@Entity()
export class ArtifactDto {
  @Column()
  @IsOptional()
  @IsString()
  @IsValidHash()
  checksum?: string;

  @Column()
  @IsDefined()
  @IsString()
  name: string;

  @Column()
  @IsOptional()
  @IsNumber()
  size?: number;

  @Column()
  @IsOptional()
  @IsString()
  type?: string;
}
