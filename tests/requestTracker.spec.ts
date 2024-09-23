/**
 * Copyright 2022, Optimizely
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
import { describe, it, expect } from 'vitest';

import RequestTracker from '../lib/event_processor/requestTracker'

describe('requestTracker', () => {
  describe('onRequestsComplete', () => {
    it('returns an immediately-fulfilled promise when no requests are in flight', async () => {
      const tracker = new RequestTracker()
      await tracker.onRequestsComplete()
    })

    it('returns a promise that fulfills after in-flight requests are complete', async () => {
      let resolveReq1: () => void
      const req1 = new Promise<void>(resolve => {
        resolveReq1 = resolve
      })
      let resolveReq2: () => void
      const req2 = new Promise<void>(resolve => {
        resolveReq2 = resolve
      })
      let resolveReq3: () => void
      const req3 = new Promise<void>(resolve => {
        resolveReq3 = resolve
      })

      const tracker = new RequestTracker()
      tracker.trackRequest(req1)
      tracker.trackRequest(req2)
      tracker.trackRequest(req3)

      let reqsComplete = false
      const reqsCompletePromise = tracker.onRequestsComplete().then(() => {
        reqsComplete = true
      })

      resolveReq1!()
      await req1
      expect(reqsComplete).toBe(false)

      resolveReq2!()
      await req2
      expect(reqsComplete).toBe(false)

      resolveReq3!()
      await req3
      await reqsCompletePromise
      expect(reqsComplete).toBe(true)
    })
  })
})
