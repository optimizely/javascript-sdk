export interface TimeoutFactory {
  setTimeout(onTimeout: () => void, timeout: number): () => void
}

export const DEFAULT_TIMEOUT_FACTORY: TimeoutFactory = {
  setTimeout(onTimeout: () => void, timeout: number) {
    const timeoutId = setTimeout(onTimeout, timeout)
    return () => {
      clearTimeout(timeoutId)
    }
  }
}
