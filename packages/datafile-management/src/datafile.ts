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
  if (isNaN(revisionNum)) {
    return -Infinity
  }
  return revisionNum
}

export function parseAndValidateDatafileString(datafileStr: string): Datafile | null {
  let maybeDatafile: any
  try {
    maybeDatafile = JSON.parse(datafileStr)
  } catch (e) {
    return null
  }

  if (typeof maybeDatafile !== 'object') {
    return null
  }

  const revision = maybeDatafile.revision
  if (typeof revision === 'string' || revision instanceof String) {
    return maybeDatafile
  }

  return null
}
