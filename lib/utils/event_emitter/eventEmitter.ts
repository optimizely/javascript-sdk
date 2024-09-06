/**
 * Copyright 2024, Optimizely
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

import { Fn } from "../type";

type Consumer<T> = (arg: T) => void;

type Listeners<T> = {
  [Key in keyof T]?: Map<number, Consumer<T[Key]>>;
};

export class EventEmitter<T> {
  private id: number = 0;
  private listeners: Listeners<T> = {} as Listeners<T>;

  on<E extends keyof T>(eventName: E, listener: Consumer<T[E]>): Fn {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = new Map();
    }

    const curId = this.id++;
    this.listeners[eventName]?.set(curId, listener);
    return () => {
      this.listeners[eventName]?.delete(curId);
    }
  }

  emit<E extends keyof T>(eventName: E, data: T[E]) {
    const listeners = this.listeners[eventName];
    if (listeners) {
      listeners.forEach(listener => {
        listener(data);
      });
    }
  }

  removeAllListeners() {
    this.listeners = {};
  }
}
