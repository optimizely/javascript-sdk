	/**
 * Copyright 2020, Optimizely
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

declare module '@optimizely/optimizely-sdk/lib/core/projet_config_manager' {
   import { ProjectConfig } from '@optimizely/optimizely-sdk/lib/core/project_config';
   interface ProjectConfigManager {
      getConfig(): ProjectConfig | null;
      onUpdate(): (listener: (config: ProjectConfig) => void) => () => void;
      onReady(): Promise<{ success: boolean; reason?: string }>;
      getOptimizelyConfig(): ProjectConfig | null;
      stop(): Promise<void> | void;
   }

   export function ProjectConfigManager(config: ProjectConfig): ProjectConfigManager;
}
