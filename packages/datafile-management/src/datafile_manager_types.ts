import { ListenerDisposer } from './event_emitter'

export interface Datafile {
  revision?: number
}

export type DatafileUpdateListener = (datafile: Datafile) => void

export interface DatafileManager {
  get: () => Datafile | null
  start: () => void
  stop: () => void
  onReady: Promise<Datafile>
  onUpdate: (listener: DatafileUpdateListener) => ListenerDisposer
}

export interface DatafileManagerConfig {
  sdkKey: string
  datafile?: string | Datafile
}
