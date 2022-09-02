/**
 * Copyright 2022, Optimizely
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
  private readonly _type: string;

  private readonly _action: string;

  private readonly _identifiers: Map<string, string>;

  private readonly _data: Map<string, object>;

  constructor(type: string, action: string, identifiers: Map<string, string>, data: Map<string, object>) {
    this._type = type;
    this._action = action;
    this._identifiers = identifiers;
    this._data = data;
  }
}
