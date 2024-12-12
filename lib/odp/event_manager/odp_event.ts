/**
 * Copyright 2022-2024, Optimizely
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

export class OdpEvent {
  /**
   * Type of event (typically "fullstack")
   */
  type: string;

  /**
   * Subcategory of the event type
   */
  action: string;

  /**
   * Key-value map of user identifiers
   */
  identifiers: Map<string, string>;

  /**
   * Event data in a key-value map
   */
  data: Map<string, unknown>;

  /**
   * Event to be sent and stored in the Optimizely Data Platform
   * @param type Type of event (typically "fullstack")
   * @param action Subcategory of the event type
   * @param identifiers Key-value map of user identifiers
   * @param data Event data in a key-value map.
   */
  constructor(type: string, action: string, identifiers?: Map<string, string>, data?: Map<string, unknown>) {
    this.type = type;
    this.action = action;
    this.identifiers = identifiers ?? new Map<string, string>();
    this.data = data ?? new Map<string, unknown>();
  }
}
