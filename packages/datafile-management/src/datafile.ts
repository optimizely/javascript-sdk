import { Datafile } from './datafile_manager_types'

export function getDatafileRevision(datafile: Datafile | null): number {
  if (!datafile) {
    return -Infinity
  }
  const revision = datafile.revision
  if (typeof revision === 'undefined') {
    return -Infinity
  }
  const revisionNum = parseInt(revision, 10)
  if (Number.isNaN(revisionNum)) {
    return -Infinity
  }
  return revisionNum
}

