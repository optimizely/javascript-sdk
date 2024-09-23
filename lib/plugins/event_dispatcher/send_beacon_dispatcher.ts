/**
 * Copyright 2023, Optimizely
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

import { EventDispatcher, EventDispatcherResponse } from '../../event_processor';

export type Event = {
  url: string;
  httpVerb: 'POST';
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  params: any;
}

/**
 * Sample event dispatcher implementation for tracking impression and conversions
 * Users of the SDK can provide their own implementation
 * @param  {Event}    eventObj
 * @param  {Function} callback
 */
export const dispatchEvent = function(
  eventObj: Event,
): Promise<EventDispatcherResponse> {
  const { params, url } = eventObj;
  const blob = new Blob([JSON.stringify(params)], {
    type: "application/json",
  });

  const success = navigator.sendBeacon(url, blob);
  if(success) return Promise.resolve({});
  return Promise.reject(new Error('sendBeacon failed'));
}

const eventDispatcher : EventDispatcher = {
  dispatchEvent,
}

export default eventDispatcher;
