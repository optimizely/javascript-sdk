/**
 * Copyright 2024, Optimizely
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

import { ProjectConfigManager } from '../../project_config/project_config_manager';
import { ProjectConfig } from '../../project_config/project_config';
import { Consumer } from '../../utils/type';

type MockOpt = {
  initConfig?: ProjectConfig,
  onRunning?: Promise<void>,
  onTerminated?: Promise<void>,
}

export const getMockProjectConfigManager = (opt: MockOpt = {}): ProjectConfigManager => {
  return {
    config: opt.initConfig,
    start: () => {},
    setSsr: function(isSsr?:boolean) {
      this.isSsr = isSsr;
    },
    onRunning: () => opt.onRunning || Promise.resolve(),
    stop: () => {},
    onTerminated: () => opt.onTerminated || Promise.resolve(),
    getConfig: function() {
      return this.config;
    },
    setConfig: function(config: ProjectConfig) {
      this.config = config;
    },
    onUpdate: function(listener: Consumer<ProjectConfig>) {
      if (this.listeners === undefined) {
        this.listeners = [];
      }
      this.listeners.push(listener);
      return () => {};
    },
    pushUpdate: function(config: ProjectConfig) {
      this.listeners.forEach((listener: any) => listener(config));
    }
  } as any as ProjectConfigManager;
};
