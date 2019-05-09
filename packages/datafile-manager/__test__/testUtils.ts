export function advanceTimersByTime(waitMs: number): Promise<void> {
  const timeoutPromise: Promise<void> = new Promise(res => setTimeout(res, waitMs))
  jest.advanceTimersByTime(waitMs)
  return timeoutPromise
}

export function getTimerCount(): number {
  // Type definition for jest doesn't include this, but it exists
  // https://jestjs.io/docs/en/jest-object#jestgettimercount
  return (jest as any).getTimerCount()
}
