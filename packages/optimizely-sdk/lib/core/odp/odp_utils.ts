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
 * Validate event data value types
 * @param data Event data to be validated
 * @returns True if an invalid type was found in the data otherwise False
 * @private
 */
export function invalidOdpDataFound(data: Map<string, any>): boolean {
  const validTypes: string[] = ['string', 'number', 'boolean'];
  let foundInvalidValue = false;
  data.forEach(value => {
    if (!validTypes.includes(typeof value) && value !== null) {
      foundInvalidValue = true;
    }
  });
  return foundInvalidValue;
}
