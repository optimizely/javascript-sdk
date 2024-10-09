export class Queue<T> {
  private maxQueueSize: number;
  private queue: T[];
  private nItems: number;
  private tail: number;

  constructor(maxQueueSize: number) {
    this.maxQueueSize = maxQueueSize;
    this.queue = new Array<T>(maxQueueSize);
    this.nItems = 0;
    this.tail = 0;
  }

  enqueue(item: T): void {
    if (this.nItems === this.maxQueueSize) {
      throw new Error("Queue is full");
    }
    this.queue[this.tail] = item;
    this.nItems++;
    this.tail = (this.tail + 1) % this.maxQueueSize;
  }

  dequeue(): T | undefined {
    if (this.nItems === 0) {
      return undefined;
    }
    const item = this.queue[(this.tail - this.nItems + this.maxQueueSize) % this.maxQueueSize];
    this.nItems--;
    return item;
  }

  size(): number {
    return this.nItems;
  }

  isEmpty(): boolean {
    return this.nItems === 0;
  }
  
  isFull(): boolean {
    return this.nItems === this.maxQueueSize;
  }
}
