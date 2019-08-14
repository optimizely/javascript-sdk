/**
 * Copyright 2019, Optimizely
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

import { AbstractEventProcessor, ProcessableEvents } from '../eventProcessor'
import { EventV1Request } from '../eventDispatcher'
import { makeBatchedEventV1 } from './buildEventV1'

export class LogTierV1EventProcessor extends AbstractEventProcessor {
  protected formatEvents(events: ProcessableEvents[]): EventV1Request {
    return {
      url: 'https://logx.optimizely.com/v1/events',
      httpVerb: 'POST',
      params: makeBatchedEventV1(events),
    }
  }
}
