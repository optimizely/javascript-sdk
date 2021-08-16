export interface DatafileUpdate {
  datafile: string;
}

export interface DatafileUpdateListener {
  (datafileUpdate: DatafileUpdate): void;
}

// TODO: Replace this with the one from js-sdk-models
interface Managed {
  start(): void;

  stop(): Promise<any>;
}

export interface DatafileManager extends Managed {
  get: () => string;
  on(eventName: string, listener: DatafileUpdateListener): () => void;
  onReady: () => Promise<void>;
}

// export class EdgeDatafileManager implements DatafileManager {

//   on(_eventName: string, _listener: DatafileUpdateListener): () => void {
//       return (): void => {}
//   }

//   get(): string {
//     return '';
//   }

//   onReady(): Promise<void> {
//     return Promise.resolve();
//   }

//   start(): void {}

//   stop(): Promise<void> {
//     return Promise.resolve();
//   }
// }
