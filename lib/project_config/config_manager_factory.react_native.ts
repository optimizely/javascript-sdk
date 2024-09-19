import { getPollingConfigManager, PollingConfigManagerConfig } from "./config_manager_factory";
import { BrowserRequestHandler } from "../utils/http_request_handler/browser_request_handler";
import { ProjectConfigManager } from "./project_config_manager";
import ReactNativeAsyncStorageCache from "../plugins/key_value_cache/reactNativeAsyncStorageCache";

export const createPollingProjectConfigManager = (config: PollingConfigManagerConfig): ProjectConfigManager => {
  const defaultConfig = {
    autoUpdate: true,
    requestHandler: new BrowserRequestHandler(),
    cache: new ReactNativeAsyncStorageCache(),
  };
  return getPollingConfigManager({ ...defaultConfig, ...config });
};
