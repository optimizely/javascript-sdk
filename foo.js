declare const createInstance: (config: Config) => Client | null; 

export interface ConfigLite {
  datafile?: object | string;
  errorHandler?: ErrorHandler;
  eventDispatcher?: EventDispatcher;
  closingEventDispatcher?: EventDispatcher;
  jsonSchemaValidator?: {
      validate(jsonObject: unknown): boolean;
  };
  logLevel?: LogLevel | string;
  logger?: LogHandler;
  userProfileService?: UserProfileService;
  defaultDecideOptions?: OptimizelyDecideOption[];
  clientEngine?: string;
  clientVersion?: string;
}

export interface DatafileOptions {
  autoUpdate?: boolean;
  updateInterval?: number;
  urlTemplate?: string;
  datafileAccessToken?: string;
}

export interface OdpOptions {
  disabled?: boolean;
  segmentsCache?: ICache<string, string[]>;
  segmentsCacheSize?: number;
  segmentsCacheTimeout?: number;
  segmentsApiTimeout?: number;
  segmentsRequestHandler?: RequestHandler;
  segmentManager?: IOdpSegmentManager;
  eventFlushInterval?: number;
  eventBatchSize?: number;
  eventQueueSize?: number;
  eventApiTimeout?: number;
  eventRequestHandler?: RequestHandler;
  eventManager?: IOdpEventManager;
  userAgentParser?: IUserAgentParser;
}

export interface Config extends ConfigLite { 
  datafileOptions?: DatafileOptions; 
  eventBatchSize?: number; 
  eventFlushInterval?: number; 
  eventMaxQueueSize?: number; 
  sdkKey?: string; 
  odpOptions?: OdpOptions; 
  persistentCacheProvider?: PersistentCacheProvider; 
}
