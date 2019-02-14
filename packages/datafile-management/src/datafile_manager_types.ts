import { ListenerDisposer } from './event_emitter'

export type Datafile = object

export type DatafileUpdateListener = (datafile: Datafile) => void

export interface DatafileManager {
  get: () => Datafile | null
  start: () => void
  stop: () => void
  onReady: Promise<Datafile>
  onUpdate: (listener: DatafileUpdateListener) => ListenerDisposer
}
