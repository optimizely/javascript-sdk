import { vi, vitest } from 'vitest';

import { ProjectConfigManager } from "../../lib/project_config/project_config_manager";
import { ProjectConfig } from '../../lib/core/project_config';
import { Consumer } from '../../lib/utils/type';

type MockOpt = {
  initConfig?: ProjectConfig,
  onRunning?: Promise<void>,
  onTerminated?: Promise<void>,
}

export const getMockProjectConfigManager = (opt: MockOpt = {}): ProjectConfigManager => {
  return {
    config: opt.initConfig,
    start: vi.fn(),
    onRunning: () => opt.onRunning || Promise.resolve(),
    stop: vi.fn(),
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
