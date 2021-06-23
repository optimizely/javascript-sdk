declare module 'murmurhash' {
  /**
   * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
   *
   * @param key - ASCII only
   * @param seed - (optional) positive integer
   * @returns 32-bit positive integer hash
   */
  function v3(key: string | Uint8Array, seed?: number): number;
}

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
    start(): void;
    onReady(): Promise<void>;
    on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void): Disposer;
    get(): string;
    stop(): Promise<void>;
  }
}