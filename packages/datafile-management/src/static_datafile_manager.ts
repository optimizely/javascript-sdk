// TODO: Is this the only way to "import type definitions"? Or the best way?
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
}

export default StaticDatafileManager
