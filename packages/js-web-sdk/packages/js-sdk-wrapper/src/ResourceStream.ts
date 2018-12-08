export namespace ResourceEmitter {
  export type DataMessage<K> = {
    resource: K
    resourceKey: string
    metadata: DataMessage.Metadata
  }

  export namespace DataMessage {
    export interface Metadata {
      source: 'fresh' | 'cache'
    }
  }

  export type ErrorMessage = {
    resourceKey: string
    reason: string
  }
}

export interface ResourceEmitter<K> {
  data: (msg: ResourceEmitter.DataMessage<K>) => void
  ready: () => void
  error: (msg: ResourceEmitter.ErrorMessage) => void
}

type PartialResourceEmitter<K> = Partial<ResourceEmitter<K>>

export interface ResourceLoader<K> {
  load: (emitter: ResourceEmitter<K>) => void
}

type DataStreamMessage<K> = {
  type: 'data'
  payload: ResourceEmitter.DataMessage<K>
}

type ReadyStreamMessage = {
  type: 'ready'
  payload: null
}

type ErrorStreamMessage = {
  type: 'error'
  payload: ResourceEmitter.ErrorMessage
}

export type ResourceStreamMessage<K> = DataStreamMessage<K> | ReadyStreamMessage | ErrorStreamMessage

export interface ResourceStream<K> {
  subscribe: (emitter: PartialResourceEmitter<K>) => () => void
}

abstract class ReplayableResourceStream<K> implements ResourceStream<K> {
  streamMessages: ResourceStreamMessage<K>[]
  subscribers: PartialResourceEmitter<K>[]
  emitter: ResourceEmitter<K>

  constructor() {
    this.streamMessages = []
    this.subscribers = []

    this.emitter = {
      data: this.data,
      ready: this.ready,
      error: this.error,
    }
  }

  protected data = (data: ResourceEmitter.DataMessage<K>) => {
    const msg: Readonly<ResourceStreamMessage<K>> = {
      type: 'data',
      payload: data,
    }
    this.emitOnAll(msg)
    this.streamMessages.push(msg)
  }

  protected ready = () => {
    const msg: Readonly<ResourceStreamMessage<K>> = {
      type: 'ready',
      payload: null,
    }
    this.emitOnAll(msg)
    this.streamMessages.push(msg)
  }

  protected error = (data: ResourceEmitter.ErrorMessage) => {
    const msg: Readonly<ResourceStreamMessage<K>> = {
      type: 'error',
      payload: data,
    }
    this.emitOnAll(msg)
    this.streamMessages.push(msg)
  }

  subscribe(emitter: PartialResourceEmitter<K>): () => void {
    if (this.streamMessages.length > 0) {
      this.streamMessages.forEach(msg => {
        this.emit(msg, emitter)
      })
    }
    this.subscribers.push(emitter)

    return () => {
      if (!this.subscribers) {
        return
      }
      const index = this.subscribers.indexOf(emitter)
      this.subscribers.splice(index, 1)
    }
  }

  protected emitOnAll(msg: ResourceStreamMessage<K>): void {
    this.subscribers.forEach(emitter => {
      this.emit(msg, emitter)
    })
  }

  protected emit(msg: ResourceStreamMessage<K>, emitter: PartialResourceEmitter<K>): void {
    if (msg.type === 'ready' && emitter.ready) {
      emitter.ready()
    } else if (msg.type === 'error' && emitter.error) {
      emitter.error(msg.payload)
    } else if (msg.type === 'data' && emitter.data) {
      emitter.data(msg.payload)
    }
  }
}

export class SingleResourceStream<K> extends ReplayableResourceStream<K> {
  constructor(loader: ResourceLoader<K>) {
    super()
    loader.load(this.emitter)
  }
}

export class CombinedResourceStream extends ReplayableResourceStream<any> {
  private unsubscribeFns: (() => void)[]
  private remainingReady: number

  constructor(streams: ResourceStream<any>[]) {
    super()

    this.remainingReady = streams.length
    this.unsubscribeFns = streams.map(stream =>
      stream.subscribe({
        data: (msg: ResourceEmitter.DataMessage<any>) => {
          this.emitter.data(msg)
        },
        ready: () => {
          if (--this.remainingReady === 0) {
            this.emitter.ready()
          }
        },
        error: (msg: ResourceEmitter.ErrorMessage) => {
          this.emitter.error(msg)
        },
      }),
    )
  }

  unsubscribe(): void {
    while (this.unsubscribeFns.length > 0) {
      const fn = this.unsubscribeFns.shift()
      if (fn) {
        fn()
      }
    }
  }
}
