import { TimeoutFactory } from '../src/timeoutFactory'

export default class TestTimeoutFactory implements TimeoutFactory {
  timeoutFns: Array<() => void> = []

  cancelFns: Array<() => void> = []

  setTimeout(onTimeout: () => void, timeout: number): () => void {
    const cancelFn = jest.fn()
    this.timeoutFns.push(() => {
      onTimeout()
    })
    this.cancelFns.push(cancelFn)
    return cancelFn
  }

  cleanup() {
    this.timeoutFns = []
    this.cancelFns = []
  }
}
