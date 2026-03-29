export interface IMicroService {
  baseUrl: string; // if starts with http, it is a full URL, otherwise it is a relative URL
  context: string;
  version: string;
  default?: boolean;
  name: string;
}