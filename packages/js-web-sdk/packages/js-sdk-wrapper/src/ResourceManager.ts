// import {
//   ResourceLoader,
//   LoadedResourceMetadata,
//   FailedLoadedResourceMetadata,
//   ResourceObserver,
// } from './ResourceLoader'
import * as Observable from 'zen-observable'
import { OptimizelyDatafile } from './OptimizelySDKWrapper'
import { UserAttributes } from '@optimizely/optimizely-sdk'
import { UserId, UniversalAnalyticsClientIdUserIdLoader } from './UserIdManagers'

export interface ResourceLoader<K> {
  load: (observer: ResourceObserver<K>) => void;
}

export interface LoadedResourceMetadata {
  source: 'fresh' | 'cache';
}

export interface FailedLoadedResourceMetadata extends LoadedResourceMetadata {
  reason: string;
}

export interface ResourceObserver<K> {
  next: (data: ResourceObservableMessage<K>) => void;
  error: (metadata: FailedLoadedResourceMetadata) => void;
  complete: () => void;
}

type ResourceLoaderState<K> = {
  resource: K | undefined
  metadata: LoadedResourceMetadata | undefined
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

interface Resource<K> {
  observable: Observable<ResourceObservableMessage<K>>
  getValue(): K | undefined
  hasValue(): boolean
  isReady(): boolean
  hasFailed(): boolean
  getMetadata(): LoadedResourceMetadata | undefined
  getFailureReason(): string
}

interface ResourceObservableMessage<K> {
  resource: K
  resourceKey: string
  metadata: LoadedResourceMetadata
}

abstract class BaseResource<K> implements Resource<K> {
  protected loader: ResourceLoader<K>
  protected state: ResourceLoaderState<K>
  private observer: ResourceObserver<K>
  public observable: Observable<ResourceObservableMessage<K>>

  constructor(loader: ResourceLoader<K>) {
    this.loader = loader
    this.state = {
      resource: undefined,
      metadata: undefined,
      isReady: false,
      failed: false,
      failureReason: '',
    }

    this.observable = new Observable(observable => {
      console.log('setting up observable')
      loader.load(observable)
    })

    this.observable.subscribe({
      next: (data: { metadata: LoadedResourceMetadata; resource: K }) => {
        this.state.resource = data.resource
        this.state.metadata = data.metadata
      },

      complete: () => {
        console.log("isComplete")
        this.state.isReady = true
      },

      error: (errorMetadata: FailedLoadedResourceMetadata): void => {
        this.state.failed = true
        this.state.failureReason = errorMetadata.reason
      },
    })
  }

  getValue(): K | undefined {
    return this.state.resource
  }

  hasValue(): boolean {
    return this.getValue() !== void 0
  }

  isReady(): boolean {
    return this.state.isReady
  }

  hasFailed(): boolean {
    return this.state.failed
    throw new Error('Method not implemented.')
  }

  getMetadata(): LoadedResourceMetadata | undefined {
    return this.state.metadata
  }

  getFailureReason(): string {
    return this.state.failureReason
  }
}

class DatafileResource extends BaseResource<OptimizelyDatafile> {}
class UserIdResource extends BaseResource<UserId> {}
class UserAttributesResource extends BaseResource<UserAttributes> {}
export function merge(...sources: Observable<any>[]) : Observable<any>{
  return new Observable(observer => {
    console.log('merge')

    let count = sources.length;

    let subscriptions = sources.map(source => Observable.from(source).subscribe({
      next(v) {
        observer.next(v);
      },
      error(e) {
        observer.error(e);
      },
      complete() {
        if (--count === 0)
          observer.complete();
      },
    }));

    return () => subscriptions.forEach(s => s.unsubscribe());
  });
}

export class ResourceManager2 {
  protected resourceKeys = ['datafile', 'attributes', 'userId']

  public datafile: DatafileResource
  public attributes: UserAttributesResource
  public userId: UserIdResource
  public observable: Observable<ResourceObservableMessage<any>>

  constructor(loaders: {
    datafile: ResourceLoader<OptimizelyDatafile>
    attributes: ResourceLoader<UserAttributes>
    userId: ResourceLoader<UserId>
  }) {
    console.log("creating manager2")
    this.datafile = new DatafileResource(loaders.datafile)
    this.attributes = new UserAttributesResource(loaders.attributes)
    this.userId = new UserIdResource(loaders.userId)

    this.observable = merge(
      this.datafile.observable,
      this.attributes.observable,
      this.userId.observable,
    )
  }

  allResourcesHaveValues(): boolean {
    return this.everyResource(resource => resource.hasValue())
  }

  allResourcesReady(): boolean {
    return this.everyResource(resource => resource.isReady())
  }

  private everyResource(fn: (resource: Resource<any>) => boolean): boolean {
    return this.resourceKeys.every(key => fn(this[key]))
  }
}

// export class ResourceManager {
//   public onReadyPromise: Promise<{
//     datafile: ResourceLoaderState<OptimizelyDatafile>
//     attributes: ResourceLoaderState<UserAttributes>
//   }>

//   private datafile: ResourceEntry<OptimizelyDatafile>
//   private attributes: ResourceEntry<UserAttributes>

//   private resolvePromise: () => void

//   constructor(loaders: ResourceManagerConfig) {
//     this.datafile = {
//       loader: loaders.datafileLoader,
//       state: {
//         resource: null,
//         metadata: null,
//         isReady: false,
//         failed: false,
//         failureReason: '',
//       },
//     }

//     this.attributes = {
//       loader: loaders.attributesLoader,
//       state: {
//         resource: {},
//         metadata: null,
//         isReady: false,
//         failed: false,
//         failureReason: '',
//       },
//     }

//     this.onReadyPromise = new Promise((resolve, reject) => {
//       this.resolvePromise = () => {
//         resolve({
//           attributes: this.attributes.state,
//           datafile: this.datafile.state,
//         })
//       }
//     })

//     this.setupLoader(this.datafile)
//     this.setupLoader(this.attributes)
//   }

//   getDatafile(): OptimizelyDatafile | null {
//     return this.datafile.state.resource
//   }

//   getAttributes(): UserAttributes {
//     if (!this.attributes.state.resource) {
//       return {}
//     }
//     return this.attributes.state.resource
//   }

//   isReady(): boolean {
//     return this.areAllResourcesDone()
//   }

//   setupLoader<K>(entry: ResourceEntry<K>): void {
//     let state = entry.state
//     entry.loader.load({
//       next(value: { resource: K; metadata: LoadedResourceMetadata }) {
//         const { resource, metadata } = value
//         if (!state.isReady && !state.failed) {
//           // can only load if not ready or failed
//           state.resource = resource
//           state.metadata = metadata
//         }
//       },
//       complete: () => {
//         state.isReady = true
//         if (this.areAllResourcesDone()) {
//           this.resolvePromise()
//         }
//       },
//       error: (metadata: FailedLoadedResourceMetadata) => {
//         state.failed = true
//         state.failureReason = metadata.reason
//         if (this.areAllResourcesDone()) {
//           this.resolvePromise()
//         }
//       },
//     })
//   }

//   private areAllResourcesDone = (): boolean => {
//     const resourceKeys = ['datafile', 'attributes']
//     const allDone: boolean = true
//     for (let key of resourceKeys) {
//       const state = this[key].state
//       if (!state.failed && !state.isReady) {
//         return false
//       }
//     }

//     return allDone
//   }
// }
