// Shared DTO: Copy in backend and frontend should be identical

export interface EdgeInsertDto {
  name: string;
  prop?: any;
  source: string;
  target: string;
}
