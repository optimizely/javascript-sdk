// TODO: live/not live boolean
// TODO: abstract class instead of fetch function
// TODO: allow passing a timeout to onReady
// TODO: Logging all over the place
// TODO: handle setForceVariation before ready and when internal instance is re-instantiated
// TODO: handle notificationCenter before ready and when internal instance is re-instantiated
// TODO: use a 3rd-party library for event emitter instead of writing my own?

export {
  default as createInstanceWithManagedDatafile,
  OptimizelyWithManagedDatafileConfig,
} from './optimizely_with_managed_datafile'

export {
  Datafile,
  DatafileManager,
} from './datafile_manager_types'

// TODO: Need separate entry points here for node vs browser (index.node.ts, index.browser.ts), instead of exporting both
export {
  default as createBrowserDefaultDatafileManager,
} from './browser_datafile_manager'

export {
  default as createNodeDefaultDatafileManager,
} from './node_datafile_manager'
