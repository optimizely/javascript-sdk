/**
 * Copyright 2019-2020, Optimizely
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

export type Disposer = () => void;

export type Listener = (arg?: any) => void;

interface Listeners {
  [index: string]: {
    // index is event name
    [index: string]: Listener; // index is listener id
  };
}

export default class EventEmitter {
  private listeners: Listeners = {};

  private listenerId = 1;

  on(eventName: string, listener: Listener): Disposer {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = {};
    }
    const currentListenerId = String(this.listenerId);
    this.listenerId++;
    this.listeners[eventName][currentListenerId] = listener;
    return (): void => {
      if (this.listeners[eventName]) {
        delete this.listeners[eventName][currentListenerId];
      }
    };
  }

  emit(eventName: string, arg?: any): void {
    const listeners = this.listeners[eventName];
    if (listeners) {
      Object.keys(listeners).forEach(listenerId => {
        const listener = listeners[listenerId];
        listener(arg);
      });
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

// TODO: Create a typed event emitter for use in TS only (not JS)
