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

import { BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT } from './config';

function randomMilliseconds(): number {
  return Math.round(Math.random() * 1000);
}

export default class BackoffController {
  private errorCount = 0;

  getDelay(): number {
    if (this.errorCount === 0) {
      return 0;
    }
    const baseWaitSeconds =
      BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT[
        Math.min(BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT.length - 1, this.errorCount)
      ];
    return baseWaitSeconds * 1000 + randomMilliseconds();
  }

  countError(): void {
    if (this.errorCount < BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT.length - 1) {
      this.errorCount++;
    }
  }

  reset(): void {
    this.errorCount = 0;
  }
}
