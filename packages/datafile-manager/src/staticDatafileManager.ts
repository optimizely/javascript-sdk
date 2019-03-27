import { DatafileManager, DatafileUpdate } from './datafileManager';

const doNothing = () => {};

export default class StaticDatafileManager implements DatafileManager {
  private readonly datafile: object | null

  private readyPromise: Promise<void>

  constructor(datafile: object | null) {
    this.datafile = datafile
    this.readyPromise = Promise.resolve();
  }

  get() {
    return this.datafile
  }

  onReady() {
    return this.readyPromise
  }

  start() {
  }

  stop() {
    return Promise.resolve();
  }

  on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void) {
    return doNothing
  }
}
