import { ResourceLoader, LoadedResourceMetadata, FailedLoadedResourceMetadata } from "./ResourceLoader";
import { OptimizelyDatafile } from './OptimizelySDKWrapper'
import { UserAttributes } from '@optimizely/optimizely-sdk'

type ResourceLoaderState<K> = {
  resource: K | null
  metadata: LoadedResourceMetadata | null
  isReady: boolean
  failed: boolean
  failureReason: string
}

type ResourceManagerConfig = {
  datafileLoader: ResourceLoader<OptimizelyDatafile>
  attributesLoader: ResourceLoader<UserAttributes>
}

type ResourceEntry<K> = {
  loader: ResourceLoader<K>
  state: ResourceLoaderState<K>
}

export class ResourceManager {
  public onReadyPromise: Promise<{
    datafile: ResourceLoaderState<OptimizelyDatafile>,
    attributes: ResourceLoaderState<UserAttributes>
  }>

  private datafile: ResourceEntry<OptimizelyDatafile>
  private attributes: ResourceEntry<UserAttributes>

  private resolvePromise: () => void

  constructor(loaders: ResourceManagerConfig) {
    this.datafile = {
      loader: loaders.datafileLoader,
      state: {
        resource: null,
        metadata: null,
        isReady: false,
        failed: false,
        failureReason: '',
      }
    }

    this.attributes = {
      loader: loaders.attributesLoader,
      state: {
        resource: {},
        metadata: null,
        isReady: false,
        failed: false,
        failureReason: '',
      }
    }

    this.onReadyPromise = new Promise((resolve, reject) => {
      this.resolvePromise = () => {

        resolve({
          attributes: this.attributes.state,
          datafile: this.datafile.state,
        })
      }
    })

    this.setupLoader(this.datafile)
    this.setupLoader(this.attributes)
  }

  getDatafile(): OptimizelyDatafile | null{
    return this.datafile.state.resource
  }

  getAttributes(): UserAttributes {
    if (!this.attributes.state.resource) {
      return {}
    }
    return this.attributes.state.resource
  }

  isReady(): boolean {
    return this.areAllResourcesDone()
  }

  setupLoader<K>(entry: ResourceEntry<K>) :void{
    let state = entry.state
    entry.loader.load({
      load(resource: K, metadata: LoadedResourceMetadata) {
        if (!state.isReady && !state.failed) {
          // can only load if not ready or failed
          state.resource = resource
          state.metadata = metadata
        }
      },
      ready: () => {
        state.isReady = true
        if (this.areAllResourcesDone()) {
          this.resolvePromise()
        }
      },
      fail: (metadata: FailedLoadedResourceMetadata) => {
        state.failed = true
        state.failureReason = metadata.reason
        if (this.areAllResourcesDone()) {
          this.resolvePromise()
        }
      },
    })
  }

  private areAllResourcesDone = (): boolean => {
    const resourceKeys = ['datafile', 'attributes']
    const allDone: boolean = true
    for (let key of resourceKeys) {
      const state = this[key].state
      if (!state.failed && !state.isReady) {
        return false
      }
    }

    return allDone
  }
}
