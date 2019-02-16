export type IntervalClearer = () => void

export type IntervalListener = (...args: any[]) => any

export interface IntervalSetter {
  setInterval: (listener: IntervalListener, intervalMs: number) => IntervalClearer
}
