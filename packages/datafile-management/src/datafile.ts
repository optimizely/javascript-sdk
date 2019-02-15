import { Datafile } from './datafile_manager_types'

// TODO: Move to another module
export function getDatafileRevision(datafile: Datafile | null): number {
  if (!datafile) {
    return -Infinity
  }
  const revision = datafile.revision
  if (typeof revision === 'undefined') {
    // TODO: Log?
    return -Infinity
  }
  return revision
}

