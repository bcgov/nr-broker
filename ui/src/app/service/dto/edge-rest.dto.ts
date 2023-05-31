// Shared DTO: Copy in back-end and front-end should be identical

export interface EdgeInsertDto {
  name: string;
  prop?: any;
  source: string;
  target: string;
}
