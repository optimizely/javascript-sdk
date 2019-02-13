import { Datafile, DatafileManager } from './datafile_manager_types'

const doNothing = () => {}

class StaticDatafileManager implements DatafileManager {
  private datafile: Datafile

  onReady: Promise<Datafile>

  constructor(datafile: Datafile) {
    this.datafile = datafile
    this.onReady = Promise.resolve(datafile)
  }

  get() {
    return this.datafile
  }

  onUpdate() {
    return doNothing
  }

  start() {
  }

  stop() {
  }
}

export default function createStaticDatafileManager(datafile: Datafile) {
  return new StaticDatafileManager(datafile)
}
