/**
 * Copyright 2020, Optimizely
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

class RequestTracker {
  private reqsInFlightCount: number = 0
  private reqsCompleteResolvers: Array<() => void> = []

  public trackRequest(reqPromise: Promise<void>): void {
    this.reqsInFlightCount++
    const onReqComplete = () => {
      this.reqsInFlightCount--
      if (this.reqsInFlightCount === 0) {
        this.reqsCompleteResolvers.forEach(resolver => resolver())
        this.reqsCompleteResolvers = []
      }
    }
    reqPromise.then(onReqComplete, onReqComplete)
  }

  public onRequestsComplete(): Promise<void> {
    return new Promise(resolve => {
      if (this.reqsInFlightCount === 0) {
        resolve()
      } else {
        this.reqsCompleteResolvers.push(resolve)
      }
    })
  }
}

export default RequestTracker
