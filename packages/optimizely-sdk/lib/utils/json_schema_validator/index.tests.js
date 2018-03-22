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
var chai = require('chai');
var assert = chai.assert;
var jsonSchemaValidator = require('./');
var projectConfigSchema = require('../../optimizely/project_config_schema');
var sprintf = require('sprintf');
var testData = require('../../tests/test_data.js');

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;

describe('lib/utils/json_schema_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given object against the specified schema', function() {
        assert.isTrue(jsonSchemaValidator.validate({'type': 'number'}, 4));
      });

      it('should throw an error if the object is not valid', function() {
        assert.throws(function() {
          jsonSchemaValidator.validate({'type': 'number'}, 'not a number');
        }, sprintf(ERROR_MESSAGES.INVALID_DATAFILE, 'JSON_SCHEMA_VALIDATOR', '', 'string value found, but a number is required'));
      });

      it('should throw an error if no schema is passed in', function() {
        assert.throws(function() {
          jsonSchemaValidator.validate();
        }, sprintf(ERROR_MESSAGES.JSON_SCHEMA_EXPECTED, 'JSON_SCHEMA_VALIDATOR'));
      });

      it('should throw an error if no json object is passed in', function() {
        assert.throws(function() {
          jsonSchemaValidator.validate({'type': 'number'});
        }, sprintf(ERROR_MESSAGES.NO_JSON_PROVIDED, 'JSON_SCHEMA_VALIDATOR'));
      });

      it('should validate specified Optimizely datafile with the Optimizely datafile schema', function() {
        assert.isTrue(jsonSchemaValidator.validate(projectConfigSchema, testData.getTestProjectConfig()));
      });
    });
  });
});
