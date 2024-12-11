// Shared DTO: Copy in back-end and front-end should be identical

export class PointGeomDto {
  type!: 'Point';
  coordinates!: number[];
}
