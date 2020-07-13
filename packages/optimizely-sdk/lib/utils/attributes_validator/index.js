/**
 * Copyright 2016, 2018-2020, Optimizely
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
import { sprintf } from '@optimizely/js-sdk-utils';

import fns from '../../utils/fns';
import { ERROR_MESSAGES } from '../enums';

var MODULE_NAME = 'ATTRIBUTES_VALIDATOR';

/**
 * Validates user's provided attributes
 * @param  {Object}  attributes
 * @return {boolean} True if the attributes are valid
 * @throws If the attributes are not valid
 */
export var validate = function(attributes) {
  if (typeof attributes === 'object' && !Array.isArray(attributes) && attributes !== null) {
    Object.keys(attributes).forEach(function(key) {
      if (typeof attributes[key] === 'undefined') {
        throw new Error(sprintf(ERROR_MESSAGES.UNDEFINED_ATTRIBUTE, MODULE_NAME, key));
      }
    });
    return true;
  } else {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, MODULE_NAME));
  }
};

export var isAttributeValid = function(attributeKey, attributeValue) {
  return (
    typeof attributeKey === 'string' &&
    (typeof attributeValue === 'string' ||
      typeof attributeValue === 'boolean' ||
      (fns.isNumber(attributeValue) && fns.isSafeInteger(attributeValue)))
  );
};

export var compareVersion = (userProvidedVersion, conditionsVersion) => {
  // any version
  if (!userProvidedVersion) {
    return 0;
  }

  var userVersionParts = userProvidedVersion.split('.');
  var conditionsVersionParts = conditionsVersion.split('.');

  for (var idx = 0; idx < userVersionParts.length; idx++) {
    if (conditionsVersionParts.length <= idx) {
      return -1;
    } else if (!fns.isNumber(conditionsVersionParts[idx])) {
      // compare string
      if (conditionsVersionParts[idx] !== userVersionParts[idx]) {
        return -1;
      }
    } else if (fns.isNumber(parseInt(userVersionParts[idx])) && fns.isNumber(parseInt(conditionsVersionParts[idx]))) {
        var userVersionPart = parseInt(userVersionParts[idx]);
        var conditionsVersionPart = parseInt(conditionsVersionParts[idx]);
        if (conditionsVersionPart < userVersionPart) {
          return -1;
        } else if (conditionsVersionPart > userVersionPart) {
          return 1;
        }
    } else {
        return -1;
    }
  }

  return 0;
}

/**
 * Provides utility method for validating that the attributes user has provided are valid
 */
export default {
  validate: validate,
  isAttributeValid: isAttributeValid,
  compareVersion: compareVersion
};
