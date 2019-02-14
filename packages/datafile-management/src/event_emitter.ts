// TODO: move this type in here? Does it need exported from top level module?
import { ListenerDisposer } from './datafile_manager_types'

// TODO: Is this the right type? any sucks
export type Listener = (...args: any[]) => any

interface Listeners {
  [index: string]: { [index: number]: { listener: Listener, id: number } }
}

export default class EventEmitter {
  private listeners: Listeners = {}

  private listenerId = 1

  on(eventName: string, listener: Listener): ListenerDisposer {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = {}
    }
    const currentListenerId = this.listenerId

    this.listeners[eventName][currentListenerId] = { listener, id: currentListenerId }

    this.listenerId++

    return () => {
      if (this.listeners[eventName]) {
        delete this.listeners[eventName][currentListenerId]
      }
    }
  }

  // TODO: Bad type? any is bad
  emit(eventName: string, ...args: any[]) {
    const listeners = this.listeners[eventName]
    if (listeners) {
      Object.values(listeners).forEach(({ listener }) => listener(...args))
    }
  }
}
