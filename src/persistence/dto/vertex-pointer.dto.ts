import { Column } from 'typeorm';

export abstract class VertexPointerDto {
  @Column()
  vertex: string;
}
