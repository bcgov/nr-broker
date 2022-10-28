export interface ActionError {
  message: string;
  data: {
    action: string;
    action_id: string;
    key: string;
    value: string;
  };
}
