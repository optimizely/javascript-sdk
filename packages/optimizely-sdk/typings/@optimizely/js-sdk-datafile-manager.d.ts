declare module '@optimizely/js-sdk-datafile-manager' {
  interface DatafileManagerConfig {
    sdkKey: string;
  }
  interface DatafileUpdate {
    datafile: string;
  }
  type Disposer = () => void;

  export class HttpPollingDatafileManager {
    constructor(config: DatafileManagerConfig);
    get(): string;
    on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void): Disposer;
    onReady(): Promise<void>;
    start(): void;
    stop(): Promise<void>;
  }
}
