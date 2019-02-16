import { Datafile } from './datafile_manager_types'

export function getDatafileRevision(datafile: Datafile | null): number {
  if (!datafile) {
    return -Infinity
  }
  const revision = datafile.revision
  if (typeof revision === 'undefined') {
    return -Infinity
  }
  return revision
}

