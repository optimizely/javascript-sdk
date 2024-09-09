import { RequestHandler } from "../utils/http_request_handler/http";
import { Transformer } from "../utils/type";
import { DatafileManagerConfig } from "./datafileManager";
import { ProjectConfigManagerImpl, ProjectConfigManager } from "./project_config_manager";
import { HttpPollingDatafileManager } from "./httpPollingDatafileManager";

export const createStaticProjectConfigManager = (
  datafile: string,
  jsonSchemaValidator?: Transformer<unknown, boolean>
): ProjectConfigManager => {
  const config = {
    datafile,
    jsonSchemaValidator,
  };
  return new ProjectConfigManagerImpl(config);
};

export type PollingConfigManagerConfig = {
  datafile?: string,
  sdkKey: string,
  jsonSchemaValidator?: Transformer<unknown, boolean>,
  autoUpdate?: boolean;
  updateInterval?: number;
  urlTemplate?: string;
  datafileAccessToken?: string;
};

export type PollingConfigManagerFactoryOptions = PollingConfigManagerConfig & { requestHandler: RequestHandler };

export const createPollingConfigManager = (
  opt: PollingConfigManagerFactoryOptions
): ProjectConfigManager => {

  const datafileManagerConfig: DatafileManagerConfig = {
    sdkKey: opt.sdkKey,
    autoUpdate: opt.autoUpdate,
    updateInterval: opt.updateInterval,
    urlTemplate: opt.urlTemplate,
    datafileAccessToken: opt.datafileAccessToken,
    requestHandler: opt.requestHandler,
  };
  
  const datafileManager = new HttpPollingDatafileManager(datafileManagerConfig);

  return new ProjectConfigManagerImpl({
    datafile: opt.datafile,
    datafileManager,
    jsonSchemaValidator: opt.jsonSchemaValidator,
  });
};
