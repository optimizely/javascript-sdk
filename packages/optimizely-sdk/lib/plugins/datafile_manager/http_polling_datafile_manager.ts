import { LoggerFacade } from '@optimizely/js-sdk-logging';
import { HttpPollingDatafileManager } from '@optimizely/js-sdk-datafile-manager';
import { DatafileOptions, DatafileManagerConfig, DatafileManager } from '../../shared_types';
import { toDatafile, tryCreatingProjectConfig } from '../../core/project_config';
import fns from '../../utils/fns';

export function createHttpPollingDatafileManager(
  sdkKey: string,
  logger: LoggerFacade,  
  datafile?: string,
  datafileOptions?: DatafileOptions,
): DatafileManager {  
  const datafileManagerConfig: DatafileManagerConfig = { sdkKey };
  if (datafileOptions === undefined || (typeof datafileOptions === 'object' && datafileOptions !== null)) {
    fns.assign(datafileManagerConfig, datafileOptions);
  }
  if (datafile) {
    const { configObj, error } = tryCreatingProjectConfig({
      datafile: datafile,
      jsonSchemaValidator: undefined,
      logger: logger,
    });
    
    if (error) {
      logger.error(error);
    }
    if (configObj) {
      datafileManagerConfig.datafile = toDatafile(configObj);
    }
  }
  return new HttpPollingDatafileManager(datafileManagerConfig);
}
