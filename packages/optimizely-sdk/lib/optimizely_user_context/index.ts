/****************************************************************************
 * Copyright 2020, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import Optimizely from '../optimizely';
import { UserAttributes } from '../shared_types';


export default class OptimizelyUserContext {
  private optimizely: Optimizely;
  private userId: string;
  private attributes: UserAttributes;

  constructor({
    optimizely,
    userId,
    attributes,
  }: {
    optimizely: Optimizely,
    userId: string,
    attributes?: UserAttributes,
  }) {
    this.optimizely = optimizely;
    this.userId = userId;
    this.attributes = attributes ?? {};
  }

  /**
   * Sets an attribute for a given key.
   * @param  {string}   key   An attribute key
   * @param  {any}      value An attribute value
   *
   */
  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  decide() {

  }

  decideForKeys() {

  }

}
