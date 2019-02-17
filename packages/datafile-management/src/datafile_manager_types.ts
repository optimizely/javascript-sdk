import { ListenerDisposer } from './event_emitter'

export interface Datafile {
  revision?: number
}

// onUpdate callback - will be called with a Datafile
export type DatafileUpdateListener = (datafile: Datafile) => void

// createDatafileManager must return this
export interface DatafileManager {
  get: () => Datafile | null
  start: () => void
  stop: () => void
  onReady: Promise<Datafile>
  onUpdate: (listener: DatafileUpdateListener) => ListenerDisposer
}

// Wrapper calls createDatafileManager, passing this
export interface DatafileManagerConfig {
  sdkKey: string
  datafile?: string | Datafile
}
