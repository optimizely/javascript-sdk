/**
 * Copyright 2023, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Checks to see if browser localStorage available. If so, runs and returns browserCallback. Otherwise, runs and returns nonBrowserCallback.
 * @param {object} callbacks
 * @param {[object.browserCallback]} callbacks.browserCallback
 * @param {[object.nonBrowserCallback]} callbacks.nonBrowserCallback
 * @returns
 */
export const tryWithLocalStorage = <K>({
  browserCallback,
  nonBrowserCallback,
}: {
  browserCallback: (localStorage?: Storage) => K;
  nonBrowserCallback: () => K;
}): K => {
  return typeof window !== 'undefined' ? browserCallback(window?.localStorage) : nonBrowserCallback();
};
