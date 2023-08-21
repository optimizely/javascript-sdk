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

import { UAParser } from 'ua-parser-js';
import { UserAgentInfo } from "../../../core/odp/user_agent_info";
import { IUserAgentParser } from '../../../core/odp/user_agent_parser';

const userAgentParser: IUserAgentParser = {
  parseUserAgentInfo(): UserAgentInfo {
    const parser = new UAParser();
    const agentInfo = parser.getResult();
    const { os, device } = agentInfo;
    return { os, device };
  }
}

export function getUserAgentParser(): IUserAgentParser {
  return userAgentParser;
}

