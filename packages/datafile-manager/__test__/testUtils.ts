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

export function advanceTimersByTime(waitMs: number): Promise<void> {
  const timeoutPromise: Promise<void> = new Promise(res => setTimeout(res, waitMs));
  jest.advanceTimersByTime(waitMs);
  return timeoutPromise;
}

export function getTimerCount(): number {
  // Type definition for jest doesn't include this, but it exists
  // https://jestjs.io/docs/en/jest-object#jestgettimercount
  return (jest as any).getTimerCount();
}
