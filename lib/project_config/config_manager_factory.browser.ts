import { getPollingConfigManager, PollingConfigManagerConfig } from './config_manager_factory';
import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import { ProjectConfigManager } from './project_config_manager';

export const createPollingProjectConfigManager = (config: PollingConfigManagerConfig): ProjectConfigManager => {
  const defaultConfig = {
    autoUpdate: false,
    requestHandler: new BrowserRequestHandler(),
  };
  return getPollingConfigManager({ ...defaultConfig, ...config });
};
