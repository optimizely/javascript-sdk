export interface Managed {
  start(): void

  stop(): Promise<any>
}
