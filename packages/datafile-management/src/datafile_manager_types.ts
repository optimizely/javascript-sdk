export type Datafile = object

export type DatafileUpdateListener = (datafile: Datafile) => void

export type ListenerDisposer = () => void

export interface DatafileManager {
  get: () => Datafile | null
  start: () => void
  stop: () => void
  onReady: Promise<Datafile>
  onUpdate: (listener: DatafileUpdateListener) => ListenerDisposer
}
