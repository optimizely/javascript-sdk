import { DatafileManager, DatafileUpdateListener} from '../../shared_types';

class NoOpDatafileManager implements DatafileManager {

  /* eslint-disable @typescript-eslint/no-unused-vars */
  on(_eventName: string, _listener: DatafileUpdateListener): () => void {
      return (): void => {}
  }

  get(): string {
    return '';
  }

  onReady(): Promise<void> {
    return Promise.resolve();
  }

  start(): void {}

  stop(): Promise<void> {
    return Promise.resolve();
  }
}

export function createNoOpDatafileManager(): DatafileManager {
  return new NoOpDatafileManager();
}
