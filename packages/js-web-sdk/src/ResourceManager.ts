import { OptimizelyDatafile } from './OptimizelySDKWrapper'
import { UserAttributes } from '@optimizely/optimizely-sdk'

export interface ResourceLoader<K> {
  load: () => K | Promise<K>
}

export class Resource<K> {
  private loader: ResourceLoader<K>

  private _value?: K

  private _hasLoaded: boolean

  public readonly promise: Promise<K>

  public get value(): K | undefined {
    return this._value
  }

  public get hasLoaded(): boolean {
    return this._hasLoaded
  }

  constructor(loader: ResourceLoader<K>) {
    this.loader = loader
    this._hasLoaded = false
    this.promise = this.load()
  }

  private updateStateFromLoadResult(value: K) {
    this._value = value
    this._hasLoaded = true
  }

  private load(): Promise<K> {
    const maybeValue = this.loader.load()
    // TODO: test does this work with polyfilled promise?
    if (maybeValue instanceof Promise) {
      return maybeValue.then(value => {
        this.updateStateFromLoadResult(value)
        return value
      })
    }
    this.updateStateFromLoadResult(maybeValue)
    return Promise.resolve(maybeValue)
  }
}