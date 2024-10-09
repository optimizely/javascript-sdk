export interface Managed {
  start(): Promise<any>;
  stop(): Promise<any>;
}
