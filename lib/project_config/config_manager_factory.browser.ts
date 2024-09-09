import { Transformer } from "../utils/type";
import { ProjectConfigManagerImpl, ProjectConfigManager } from "./project_config_manager";
import { DatafileManagerConfig } from "./datafileManager";
import { PollingConfigManagerConfig, PollingConfigManagerFactoryOptions } from "./config_manager_factory";
import { createPollingConfigManager as createPollingConfigManagerInternal } from "./config_manager_factory";
import { BrowserRequestHandler } from "../utils/http_request_handler/browser_request_handler";

export const createPollingConfigManager = (config: PollingConfigManagerConfig): ProjectConfigManager => {
  const options: PollingConfigManagerFactoryOptions = {
    autoUpdate: false,
    requestHandler: new BrowserRequestHandler(),
    ...config,
  }
  return createPollingConfigManagerInternal(options);
}
