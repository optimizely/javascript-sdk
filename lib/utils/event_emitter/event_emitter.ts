type Consumer<T> = (arg: T) => void;

type Disposer = () => void;

interface Listeners<T> {
  [index: string]: {
    // index is event name
    [index: string]: Listener; // index is listener id
  };
}

export class EventEmitter<T> {
  private listeners: Listeners = {};

  private listenerId = 1;

  on<E extends keyof T>(eventName: E, listener: Consumer<T[E]>): Disposer {
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

  emit(eventName: string, arg?: DatafileUpdate): void {
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
