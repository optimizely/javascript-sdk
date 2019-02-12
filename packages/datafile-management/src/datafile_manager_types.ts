export type Datafile = object

type DatafileUpdateListener = (datafile: Datafile) => void

export type ListenerDisposer = () => void

export interface DatafileManager {
  get: () => Datafile | null
  onReady: Promise<Datafile>
  onUpdate: (listener: DatafileUpdateListener) => ListenerDisposer
}
