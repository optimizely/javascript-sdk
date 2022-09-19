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
  public type: string;

  public action: string;

  public identifiers: Map<string, string>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public data: Map<string, any>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(type: string, action: string, identifiers?: Map<string, string>, data?: Map<string, any>) {
    this.type = type;
    this.action = action;
    this.identifiers = identifiers ?? new Map<string, string>();
    this.data = data ?? new Map<string, any>();
  }
}
