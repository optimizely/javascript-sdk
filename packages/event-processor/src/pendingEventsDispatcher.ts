/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { getLogger } from '@optimizely/js-sdk-logging'
import { EventDispatcher, EventV1Request, EventDispatcherCallback } from './eventDispatcher'
import { PendingEventsStore, LocalStorageStore } from './pendingEventsStore'
import { generateUUID, getTimestamp } from '@optimizely/js-sdk-utils'

const logger = getLogger('EventProcessor')

export type DispatcherEntry = {
  uuid: string
  timestamp: number
  request: EventV1Request
}

export class PendingEventsDispatcher implements EventDispatcher {
  protected dispatcher: EventDispatcher
  protected store: PendingEventsStore<DispatcherEntry>

  constructor({
    eventDispatcher,
    store,
  }: {
    eventDispatcher: EventDispatcher
    store: PendingEventsStore<DispatcherEntry>
  }) {
    this.dispatcher = eventDispatcher
    this.store = store
  }

  dispatchEvent(request: EventV1Request, callback: EventDispatcherCallback): void {
    this.send(
      {
        uuid: generateUUID(),
        timestamp: getTimestamp(),
        request,
      },
      callback,
    )
  }

  sendPendingEvents(): void {
    this.store.values().then((pendingEvents) => {
      logger.debug('Sending %s pending events from previous page', pendingEvents.length)
      pendingEvents.forEach(item => {
        try {
          this.send(item, () => {})
        } catch (e) {}
      })
    })
  }

  protected send(entry: DispatcherEntry, callback: EventDispatcherCallback): void {
    this.store.set(entry.uuid, entry).then(() => {
      this.dispatcher.dispatchEvent(entry.request, response => {
        this.store.remove(entry.uuid).then(() => callback(response))
      })
    })
  }
}

export class LocalStoragePendingEventsDispatcher extends PendingEventsDispatcher {
  constructor({ eventDispatcher }: { eventDispatcher: EventDispatcher }) {
    super({
      eventDispatcher,
      store: new LocalStorageStore({
        // TODO make this configurable
        maxValues: 100,
        key: 'fs_optly_pending_events',
      }),
    })
  }
}
