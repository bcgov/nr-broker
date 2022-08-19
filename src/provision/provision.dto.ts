interface EventDto {
  category: string;
  type: string;
}

interface LabelsDto {
  project: string;
}

interface ServiceDto {
  name: string;
  environment: string;
  version: string;
}

interface UserDto {
  id: string;
}

export interface ProvisionDto {
  event: EventDto;
  labels: LabelsDto;
  service: ServiceDto;
  user: UserDto;
}
