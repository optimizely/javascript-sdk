/**
 * Copyright 2022-2024 Optimizely
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
import { ConversionEvent, ImpressionEvent } from './events'
import { EventV1Request } from './event_dispatcher'
import { getLogger } from '../modules/logging'
import { Service } from '../service'
import { Consumer, Fn } from '../utils/type';

export const DEFAULT_FLUSH_INTERVAL = 30000 // Unit is ms - default flush interval is 30s
export const DEFAULT_BATCH_SIZE = 10

export type ProcessableEvent = ConversionEvent | ImpressionEvent

export interface EventProcessor extends Service {
  process(event: ProcessableEvent): Promise<unknown>;
  onDispatch(handler: Consumer<EventV1Request>): Fn;
}
