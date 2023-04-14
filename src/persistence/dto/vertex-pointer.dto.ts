import { Column } from 'typeorm';

export abstract class VertexPointerDto {
  @Column()
  deleted: boolean;

  @Column()
  vertex: string;
}
