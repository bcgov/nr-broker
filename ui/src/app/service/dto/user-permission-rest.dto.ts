// Shared DTO: Copy in back-end and front-end should be identical

export class UserPermissionRestDto {
  create!: string[];
  delete!: string[];
  sudo!: string[];
  update!: string[];
  approve!: string[];
}

export type UserPermissionNames = keyof UserPermissionRestDto;
