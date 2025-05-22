/**
 * Copyright 2016, 2018-2020, 2022, 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { 
  DATAFILE_VERSIONS,
} from '../enums';
import {
  INVALID_DATAFILE_MALFORMED,
  INVALID_DATAFILE_VERSION,
  NO_DATAFILE_SPECIFIED,
} from 'error_message';
import { OptimizelyError } from '../../error/optimizly_error';

const SUPPORTED_VERSIONS = [DATAFILE_VERSIONS.V2, DATAFILE_VERSIONS.V3, DATAFILE_VERSIONS.V4];

/**
 * Validates the datafile
 * @param {Object|string}  datafile
 * @return {Object} The datafile object if the datafile is valid
 * @throws If the datafile is not valid for any of the following reasons:
 - The datafile string is undefined
 - The datafile string cannot be parsed as a JSON object
 - The datafile version is not supported
 */
// eslint-disable-next-line
export const validateDatafile = function(datafile: unknown): any {
  if (!datafile) {
    throw new OptimizelyError(NO_DATAFILE_SPECIFIED);
  }
  if (typeof datafile === 'string') {
    // Attempt to parse the datafile string
    try {
      datafile = JSON.parse(datafile);
    } catch (ex) {
      throw new OptimizelyError(INVALID_DATAFILE_MALFORMED);
    }
  }
  if (typeof datafile === 'object' && !Array.isArray(datafile) && datafile !== null) {
    if (SUPPORTED_VERSIONS.indexOf(datafile['version' as keyof unknown]) === -1) {
      throw new OptimizelyError(INVALID_DATAFILE_VERSION, datafile['version' as keyof unknown]);
    }
  } else {
    throw new OptimizelyError(INVALID_DATAFILE_MALFORMED);
  }

  return datafile;
};

export default {
  validateDatafile: validateDatafile,
}
