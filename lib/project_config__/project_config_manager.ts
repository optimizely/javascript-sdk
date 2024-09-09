import { ProjectConfig, tryCreatingProjectConfig } from '../core/project_config';
import { Consumer, Fn } from '../utils/type';
import { RequestHandler } from '../utils/http_request_handler/http';
import { Ticker, ExponentialBackoff, IntervalTicker } from '../utils/ticker/ticker';
import { LoggerFacade } from '../modules/logging';
import { Service } from '../service';
import { OptimizelyConfig } from '../shared_types';

export interface ProjectConfigManager extends Service {
  setLogger(logger: LoggerFacade): void;
  getConfig(): ProjectConfig | undefined;
  getOptimizelyConfig(): OptimizelyConfig | undefined;
  onUpdate(listener: Consumer<ProjectConfig>): Fn;
}

export type DatafileOptions = { 
  updateInterval?: number; 
  urlTemplate?: string; 
  datafileAccessToken?: string; 
} 

// export type PollingConfigManagerOptions = { 
//   sdkKey: string; 
//   datafile?: string; 
//   datafileOptions?: DatafileOptions; 
// }

// export class PollingProjectConfigManager implements ProjectConfigManager {
//   private datafile: string | object;
//   private logger: LoggerFacade;
//   private config?: ProjectConfig;
//   private isReady = false;
//   private readyPromise: Promise<void>;
//   private eventEmitter: EventEmitter<{ update: ProjectConfig }> = new EventEmitter();
//   private ticker: Ticker;

//   constructor(options: PollingConfigManagerOptions, requestHandler: RequestHandler, logger: LoggerFacade) {
//     this.logger = logger;
//     const backoffController = new ExponentialBackoff(1000, options.datafileOptions?.updateInterval || 30000, 1000);
//     this.ticker = new IntervalTicker(options.datafileOptions?.updateInterval || 30000, backoffController);
  

//     // const { configObj: config, error } = tryCreatingProjectConfig({
//     //   datafile: this.datafile,
//     //   logger: this.logger,
//     // });



//     // this.config = config || undefined;
//     // if (config) {
//     //   this.isReady = true;
//     //   this.readyPromise = Promise.resolve();
//     // } else {
//     //   this.readyPromise = Promise.reject(error);
//     // }
//   }
  
//   async start() {
//     if (this.config) {
//       this.eventEmitter.emit('update', this.config);
//     }
//     return this.readyPromise;
//   }

//   onReady(): Promise<void> {
//     return this.readyPromise;
//   }

//   getConfig(): ProjectConfig | undefined {
//     return this.config;
//   }

//   onUpdate(listener: Comsumer<ProjectConfig>) {
//     this.eventEmitter.on('update', listener);
//   }

//   async stop() {
    
//   }
// }
