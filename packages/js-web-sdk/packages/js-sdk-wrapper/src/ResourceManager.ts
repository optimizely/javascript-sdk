import { OptimizelyDatafile } from './OptimizelySDKWrapper'
import { UserAttributes } from '@optimizely/optimizely-sdk'
import { UserId } from './UserIdLoaders'

import {
  ResourceEmitter,
  ResourceStream,
  SingleResourceStream,
  ResourceLoader,
  CombinedResourceStream,
} from './ResourceStream'

interface Resource<K> {
  getValue(): K | undefined
  hasValue(): boolean
  isReady(): boolean
  hasFailed(): boolean
  getMetadata(): ResourceEmitter.DataMessage.Metadata | undefined
  getFailureReason(): string
}

type ResourceLoaderState<K> = {
  resource: K | undefined
  metadata: ResourceEmitter.DataMessage.Metadata | undefined
  isReady: boolean
  failed: boolean
  failureReason: string
}

class BaseResource<K> implements Resource<K> {
  public stream: ResourceStream<K>
  protected state: ResourceLoaderState<K>

  constructor(loader: ResourceLoader<K>) {
    this.state = {
      resource: undefined,
      metadata: undefined,
      isReady: false,
      failed: false,
      failureReason: '',
    }

    this.stream = new SingleResourceStream(loader)
    this.stream.subscribe({
      data: msg => {
        this.state.resource = msg.resource
        this.state.metadata = msg.metadata
      },
      complete: () => {
        this.state.isReady = true
      },
      error: msg => {
        this.state.failed = true
        this.state.failureReason = msg.reason
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

  getMetadata(): ResourceEmitter.DataMessage.Metadata | undefined {
    return this.state.metadata
  }

  getFailureReason(): string {
    return this.state.failureReason
  }
}

export class ResourceManager {
  protected resourceKeys = ['datafile', 'attributes', 'userId']

  public datafile: BaseResource<OptimizelyDatafile>
  public attributes: BaseResource<UserAttributes>
  public userId: BaseResource<UserId>

  public stream: ResourceStream<any>

  constructor(loaders: {
    datafile: ResourceLoader<OptimizelyDatafile>
    attributes: ResourceLoader<UserAttributes>
    userId: ResourceLoader<UserId>
  }) {
    this.datafile = new BaseResource(loaders.datafile)
    this.attributes = new BaseResource(loaders.attributes)
    this.userId = new BaseResource(loaders.userId)

    this.stream = new CombinedResourceStream([this.datafile.stream, this.attributes.stream, this.userId.stream])
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
