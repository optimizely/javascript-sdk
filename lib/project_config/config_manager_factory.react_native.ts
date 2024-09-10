import { getPollingConfigManager, PollingConfigManagerConfig } from "./config_manager_factory";
import { NodeRequestHandler } from "../utils/http_request_handler/node_request_handler";
import { ProjectConfigManager } from "./project_config_manager";
import { DEFAULT_URL_TEMPLATE, DEFAULT_AUTHENTICATED_URL_TEMPLATE } from './config';
import ReactNativeAsyncStorageCache from "../plugins/key_value_cache/reactNativeAsyncStorageCache";

export const createPollingProjectConfigManager = (config: PollingConfigManagerConfig): ProjectConfigManager => {
  const defaultConfig = {
    autoUpdate: true,
    requestHandler: new NodeRequestHandler(),
    cache: new ReactNativeAsyncStorageCache(),
  };
  return getPollingConfigManager({ ...defaultConfig, ...config });
};
