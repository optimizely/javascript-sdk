// TODO: Logging all over the place

export {
  default as createInstanceWithManagedDatafile,
  OptimizelyWithManagedDatafileConfig,
} from './optimizely_with_managed_datafile'

export {
  Datafile,
  DatafileManager,
} from './datafile_manager_types'

export {
  default as createBrowserDefaultDatafileManager,
} from './browser_datafile_manager'

export {
  default as createNodeDefaultDatafileManager,
} from './node_datafile_manager'
