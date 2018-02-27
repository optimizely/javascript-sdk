/**
 * Copyright 2016-2017, Optimizely
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
var fns = require('../fns');
var validate = require('json-schema').validate;
var sprintf = require('sprintf');

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;
var MODULE_NAME = 'JSON_SCHEMA_VALIDATOR';

module.exports = {
  /**
   * Validate the given json object against the specified schema
   * @param  {Object} jsonSchema The json schema to validate against
   * @param  {Object} jsonObject The object to validate against the schema
   * @return {Boolean}           True if the given object is valid
   */
  validate: function(jsonSchema, jsonObject) {
    if (!jsonSchema) {
      throw new Error(sprintf(ERROR_MESSAGES.JSON_SCHEMA_EXPECTED, MODULE_NAME));
    }

    if (!jsonObject) {
      throw new Error(sprintf(ERROR_MESSAGES.NO_JSON_PROVIDED, MODULE_NAME));
    }

    var result = validate(jsonObject, jsonSchema);
    if (result.valid) {
      return true;
    } else {
      if (fns.isArray(result.errors)) {
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_DATAFILE, MODULE_NAME, result.errors[0].property, result.errors[0].message));
      }
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_JSON, MODULE_NAME));
    }
  }
};
