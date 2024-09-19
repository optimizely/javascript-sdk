import { RequestHandler } from "../utils/http_request_handler/http";
import { Transformer } from "../utils/type";
import { DatafileManagerConfig } from "./datafile_manager";
import { ProjectConfigManagerImpl, ProjectConfigManager } from "./project_config_manager";
import { PollingDatafileManager } from "./polling_datafile_manager";
import PersistentKeyValueCache from "../plugins/key_value_cache/persistentKeyValueCache";
import { DEFAULT_UPDATE_INTERVAL, MIN_UPDATE_INTERVAL, DEFAULT_URL_TEMPLATE, UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE } from './constant';
import { ExponentialBackoff, IntervalRepeater } from "../utils/repeater/repeater";

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
  cache?: PersistentKeyValueCache;
};

export type PollingConfigManagerFactoryOptions = PollingConfigManagerConfig & { requestHandler: RequestHandler };

export const getPollingConfigManager = (
  opt: PollingConfigManagerFactoryOptions
): ProjectConfigManager => {
  const updateInterval = opt.updateInterval ?? DEFAULT_UPDATE_INTERVAL;

  const backoff = new ExponentialBackoff(1000, updateInterval, 500);
  const repeater = new IntervalRepeater(updateInterval, backoff);

  const datafileManagerConfig: DatafileManagerConfig = {
    sdkKey: opt.sdkKey,
    autoUpdate: opt.autoUpdate,
    updateInterval: updateInterval,
    urlTemplate: opt.urlTemplate,
    datafileAccessToken: opt.datafileAccessToken,
    requestHandler: opt.requestHandler,
    cache: opt.cache,
    repeater,
  };
  
  const datafileManager = new PollingDatafileManager(datafileManagerConfig);

  return new ProjectConfigManagerImpl({
    datafile: opt.datafile,
    datafileManager,
    jsonSchemaValidator: opt.jsonSchemaValidator,
  });
};
