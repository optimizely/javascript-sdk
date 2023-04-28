/**
 * Copyright 2016-2017, 2020, 2022 Optimizely
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
import { sprintf } from '../fns';
import { JSONSchema4, validate as jsonSchemaValidator } from 'json-schema';

import { ERROR_MESSAGES } from '../enums';
import schema from '../../core/project_config/project_config_schema';

const MODULE_NAME = 'JSON_SCHEMA_VALIDATOR';

/**
 * Validate the given json object against the specified schema
 * @param {unknown} jsonObject The object to validate against the schema
 * @param {JSONSchema4} validationSchema Provided schema to use for validation
 * @param {boolean} shouldThrowOnError Should validation throw if invalid JSON object
 * @return {boolean} true if the given object is valid; throws or false if invalid
 */
export function validate(
  jsonObject: unknown,
  validationSchema: JSONSchema4 = schema,
  shouldThrowOnError = true
): boolean {
  const moduleTitle = `${MODULE_NAME} (${validationSchema.title})`;

  if (typeof jsonObject !== 'object' || jsonObject === null) {
    throw new Error(sprintf(ERROR_MESSAGES.NO_JSON_PROVIDED, moduleTitle));
  }

  const result = jsonSchemaValidator(jsonObject, validationSchema);
  if (result.valid) {
    return true;
  }

  if (!shouldThrowOnError) {
    return false;
  }

  if (Array.isArray(result.errors)) {
    throw new Error(
      sprintf(ERROR_MESSAGES.INVALID_DATAFILE, moduleTitle, result.errors[0].property, result.errors[0].message)
    );
  }

  throw new Error(sprintf(ERROR_MESSAGES.INVALID_JSON, moduleTitle));
}
