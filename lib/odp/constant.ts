/**
 * Copyright 2024, Optimizely
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

export enum ODP_USER_KEY {
  VUID = 'vuid',
  FS_USER_ID = 'fs_user_id',
  FS_USER_ID_ALIAS = 'fs-user-id',
}

export enum ODP_EVENT_ACTION {
  IDENTIFIED = 'identified',
  INITIALIZED = 'client_initialized',
}

export const ODP_DEFAULT_EVENT_TYPE = 'fullstack';
