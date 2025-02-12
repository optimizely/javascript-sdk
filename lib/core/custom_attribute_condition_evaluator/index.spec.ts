/**
 * Copyright 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as customAttributeEvaluator from './';
import { MISSING_ATTRIBUTE_VALUE, UNEXPECTED_TYPE_NULL } from 'log_message';
import { UNKNOWN_MATCH_TYPE, UNEXPECTED_TYPE, OUT_OF_BOUNDS, UNEXPECTED_CONDITION_VALUE } from 'error_message';
import exp from 'constants';
import { Condition } from '../../shared_types';

const browserConditionSafari = {
  name: 'browser_type',
  value: 'safari',
  type: 'custom_attribute',
};
const booleanCondition = {
  name: 'is_firefox',
  value: true,
  type: 'custom_attribute',
};
const integerCondition = {
  name: 'num_users',
  value: 10,
  type: 'custom_attribute',
};
const doubleCondition = {
  name: 'pi_value',
  value: 3.14,
  type: 'custom_attribute',
};

const getMockUserContext: any = (attributes: any) => ({
  getAttributes: () => ({ ...(attributes || {}) }),
});

const createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => createLogger(),
});

describe('custom_attribute_condition_evaluator', () => {
  const mockLogger = createLogger();
  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when the attributes pass the audience conditions and no match type is provided', () => {
    const userAttributes = {
      browser_type: 'safari',
    };

    expect(
      customAttributeEvaluator.getEvaluator().evaluate(browserConditionSafari, getMockUserContext(userAttributes))
    ).toBe(true);
  });

  it('should return false when the attributes do not pass the audience conditions and no match type is provided', () => {
    const userAttributes = {
      browser_type: 'firefox',
    };

    expect(
      customAttributeEvaluator.getEvaluator().evaluate(browserConditionSafari, getMockUserContext(userAttributes))
    ).toBe(false);
  });

  it('should evaluate different typed attributes', () => {
    const userAttributes = {
      browser_type: 'safari',
      is_firefox: true,
      num_users: 10,
      pi_value: 3.14,
    };

    expect(
      customAttributeEvaluator.getEvaluator().evaluate(browserConditionSafari, getMockUserContext(userAttributes))
    ).toBe(true);
    expect(customAttributeEvaluator.getEvaluator().evaluate(booleanCondition, getMockUserContext(userAttributes))).toBe(
      true
    );
    expect(customAttributeEvaluator.getEvaluator().evaluate(integerCondition, getMockUserContext(userAttributes))).toBe(
      true
    );
    expect(customAttributeEvaluator.getEvaluator().evaluate(doubleCondition, getMockUserContext(userAttributes))).toBe(
      true
    );
  });

  it('should log and return null when condition has an invalid match property', () => {
    const invalidMatchCondition = { match: 'weird', name: 'weird_condition', type: 'custom_attribute', value: 'hi' };
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidMatchCondition, getMockUserContext({ weird_condition: 'bye' }));

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(UNKNOWN_MATCH_TYPE, JSON.stringify(invalidMatchCondition));
  });
});

describe('exists match type', () => {
  const existsCondition = {
    match: 'exists',
    name: 'input_value',
    type: 'custom_attribute',
    value: '',
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if there is no user-provided value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(existsCondition, getMockUserContext({}));

    expect(result).toBe(false);
    expect(mockLogger.debug).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return false if the user-provided value is undefined', () => {
    const result = customAttributeEvaluator
      .getEvaluator()
      .evaluate(existsCondition, getMockUserContext({ input_value: undefined }));

    expect(result).toBe(false);
  });

  it('should return false if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator()
      .evaluate(existsCondition, getMockUserContext({ input_value: null }));

    expect(result).toBe(false);
  });

  it('should return true if the user-provided value is a string', () => {
    const result = customAttributeEvaluator
      .getEvaluator()
      .evaluate(existsCondition, getMockUserContext({ input_value: 'hi' }));

    expect(result).toBe(true);
  });

  it('should return true if the user-provided value is a number', () => {
    const result = customAttributeEvaluator
      .getEvaluator()
      .evaluate(existsCondition, getMockUserContext({ input_value: 10 }));

    expect(result).toBe(true);
  });

  it('should return true if the user-provided value is a boolean', () => {
    const result = customAttributeEvaluator
      .getEvaluator()
      .evaluate(existsCondition, getMockUserContext({ input_value: true }));

    expect(result).toBe(true);
  });
});

describe('exact match type - with a string condition value', () => {
  const exactStringCondition = {
    match: 'exact',
    name: 'favorite_constellation',
    type: 'custom_attribute',
    value: 'Lacerta',
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if the user-provided value is equal to the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator()
      .evaluate(exactStringCondition, getMockUserContext({ favorite_constellation: 'Lacerta' }));

    expect(result).toBe(true);
  });

  it('should return false if the user-provided value is not equal to the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator()
      .evaluate(exactStringCondition, getMockUserContext({ favorite_constellation: 'The Big Dipper' }));

    expect(result).toBe(false);
  });

  it('should log and return null if condition value is of an unexpected type', () => {
    const invalidExactCondition = {
      match: 'exact',
      name: 'favorite_constellation',
      type: 'custom_attribute',
      value: null,
    };
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidExactCondition, getMockUserContext({ favorite_constellation: 'Lacerta' }));

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(UNEXPECTED_CONDITION_VALUE, JSON.stringify(invalidExactCondition));
  });

  it('should log and return null if the user-provided value is of a different type than the condition value', () => {
    const unexpectedTypeUserAttributes: Record<string, boolean> = { favorite_constellation: false };
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactStringCondition, getMockUserContext(unexpectedTypeUserAttributes));
    const userValue = unexpectedTypeUserAttributes[exactStringCondition.name];
    const userValueType = typeof userValue;

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(exactStringCondition),
      userValueType,
      exactStringCondition.name
    );
  });

  it('should log and return null if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactStringCondition, getMockUserContext({ favorite_constellation: null }));

    expect(result).toBe(null);
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      UNEXPECTED_TYPE_NULL,
      JSON.stringify(exactStringCondition),
      exactStringCondition.name
    );
  });

  it('should log and return null if there is no user-provided value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactStringCondition, getMockUserContext({}));

    expect(result).toBe(null);
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      MISSING_ATTRIBUTE_VALUE,
      JSON.stringify(exactStringCondition),
      exactStringCondition.name
    );
  });

  it('should log and return null if the user-provided value is of an unexpected type', () => {
    const unexpectedTypeUserAttributes: Record<string, unknown> = { favorite_constellation: [] };
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactStringCondition, getMockUserContext(unexpectedTypeUserAttributes));
    const userValue = unexpectedTypeUserAttributes[exactStringCondition.name];
    const userValueType = typeof userValue;

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(exactStringCondition),
      userValueType,
      exactStringCondition.name
    );
  });
});

describe('exact match type - with a number condition value', () => {
  const exactNumberCondition = {
    match: 'exact',
    name: 'lasers_count',
    type: 'custom_attribute',
    value: 9000,
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if the user-provided value is equal to the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactNumberCondition, getMockUserContext({ lasers_count: 9000 }));

    expect(result).toBe(true);
  });

  it('should return false if the user-provided value is not equal to the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactNumberCondition, getMockUserContext({ lasers_count: 8000 }));

    expect(result).toBe(false);
  });

  it('should log and return null if the user-provided value is of a different type than the condition value', () => {
    const unexpectedTypeUserAttributes1: Record<string, any> = { lasers_count: 'yes' };
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactNumberCondition, getMockUserContext(unexpectedTypeUserAttributes1));

    expect(result).toBe(null);

    const unexpectedTypeUserAttributes2: Record<string, any> = { lasers_count: '1000' };
    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactNumberCondition, getMockUserContext(unexpectedTypeUserAttributes2));

    expect(result).toBe(null);

    const userValue1 = unexpectedTypeUserAttributes1[exactNumberCondition.name];
    const userValueType1 = typeof userValue1;
    const userValue2 = unexpectedTypeUserAttributes2[exactNumberCondition.name];
    const userValueType2 = typeof userValue2;

    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(exactNumberCondition),
      userValueType1,
      exactNumberCondition.name
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(exactNumberCondition),
      userValueType2,
      exactNumberCondition.name
    );
  });

  it('should log and return null if the user-provided number value is out of bounds', () => {
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactNumberCondition, getMockUserContext({ lasers_count: -Infinity }));

    expect(result).toBe(null);

    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactNumberCondition, getMockUserContext({ lasers_count: -Math.pow(2, 53) - 2 }));

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      OUT_OF_BOUNDS,
      JSON.stringify(exactNumberCondition),
      exactNumberCondition.name
    );
  });

  it('should return null if there is no user-provided value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactNumberCondition, getMockUserContext({}));

    expect(result).toBe(null);
  });

  it('should log and return null if the condition value is not finite', () => {
    const invalidValueCondition1 = {
      match: 'exact',
      name: 'lasers_count',
      type: 'custom_attribute',
      value: Infinity,
    };
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition1, getMockUserContext({ lasers_count: 9000 }));

    expect(result).toBe(null);

    const invalidValueCondition2 = {
      match: 'exact',
      name: 'lasers_count',
      type: 'custom_attribute',
      value: Math.pow(2, 53) + 2,
    };
    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition2, getMockUserContext({ lasers_count: 9000 }));

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(UNEXPECTED_CONDITION_VALUE, JSON.stringify(invalidValueCondition1));
    expect(mockLogger.warn).toHaveBeenCalledWith(UNEXPECTED_CONDITION_VALUE, JSON.stringify(invalidValueCondition2));
  });
});

describe('exact match type - with a boolean condition value', () => {
  const exactBoolCondition = {
    match: 'exact',
    name: 'did_register_user',
    type: 'custom_attribute',
    value: false,
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if the user-provided value is equal to the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactBoolCondition, getMockUserContext({ did_register_user: false }));

    expect(result).toBe(true);
  });

  it('should return false if the user-provided value is not equal to the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactBoolCondition, getMockUserContext({ did_register_user: true }));

    expect(result).toBe(false);
  });

  it('should return null if the user-provided value is of a different type than the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactBoolCondition, getMockUserContext({ did_register_user: 10 }));

    expect(result).toBe(null);
  });

  it('should return null if there is no user-provided value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(exactBoolCondition, getMockUserContext({}));

    expect(result).toBe(null);
  });
});

describe('substring match type', () => {
  const mockLogger = createLogger();
  const substringCondition = {
    match: 'substring',
    name: 'headline_text',
    type: 'custom_attribute',
    value: 'buy now',
  };

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if the condition value is a substring of the user-provided value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      substringCondition,
      getMockUserContext({
        headline_text: 'Limited time, buy now!',
      })
    );

    expect(result).toBe(true);
  });

  it('should return false if the user-provided value is not a substring of the condition value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      substringCondition,
      getMockUserContext({
        headline_text: 'Breaking news!',
      })
    );

    expect(result).toBe(false);
  });

  it('should log and return null if the user-provided value is not a string', () => {
    const unexpectedTypeUserAttributes: Record<string, unknown> = { headline_text: 10 };
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(substringCondition, getMockUserContext(unexpectedTypeUserAttributes));
    const userValue = unexpectedTypeUserAttributes[substringCondition.name];
    const userValueType = typeof userValue;

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(substringCondition),
      userValueType,
      substringCondition.name
    );
  });

  it('should log and return null if the condition value is not a string', () => {
    const nonStringCondition = {
      match: 'substring',
      name: 'headline_text',
      type: 'custom_attribute',
      value: 10,
    };

    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(nonStringCondition, getMockUserContext({ headline_text: 'hello' }));

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(UNEXPECTED_CONDITION_VALUE, JSON.stringify(nonStringCondition));
  });

  it('should log and return null if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(substringCondition, getMockUserContext({ headline_text: null }));

    expect(result).toBe(null);
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      UNEXPECTED_TYPE_NULL,
      JSON.stringify(substringCondition),
      substringCondition.name
    );
  });

  it('should return null if there is no user-provided value', function() {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(substringCondition, getMockUserContext({}));

    expect(result).toBe(null);
  });
});

describe('greater than match type', () => {
  const gtCondition = {
    match: 'gt',
    name: 'meters_travelled',
    type: 'custom_attribute',
    value: 48.2,
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if the user-provided value is greater than the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(gtCondition, getMockUserContext({ meters_travelled: 58.4 }));

    expect(result).toBe(true);
  });

  it('should return false if the user-provided value is not greater than the condition value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(gtCondition, getMockUserContext({ meters_travelled: 20 }));

    expect(result).toBe(false);
  });

  it('should log and return null if the user-provided value is not a number', () => {
    const unexpectedTypeUserAttributes1 = { meters_travelled: 'a long way' };
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(gtCondition, getMockUserContext(unexpectedTypeUserAttributes1));

    expect(result).toBeNull();

    const unexpectedTypeUserAttributes2 = { meters_travelled: '1000' };
    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(gtCondition, getMockUserContext(unexpectedTypeUserAttributes2));

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(gtCondition),
      'string',
      gtCondition.name
    );
  });

  it('should log and return null if the user-provided number value is out of bounds', () => {
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(gtCondition, getMockUserContext({ meters_travelled: -Infinity }));

    expect(result).toBeNull();

    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(gtCondition, getMockUserContext({ meters_travelled: Math.pow(2, 53) + 2 }));

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(OUT_OF_BOUNDS, JSON.stringify(gtCondition), gtCondition.name);
  });

  it('should log and return null if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(gtCondition, getMockUserContext({ meters_travelled: null }));

    expect(result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(UNEXPECTED_TYPE_NULL, JSON.stringify(gtCondition), gtCondition.name);
  });

  it('should return null if there is no user-provided value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(gtCondition, getMockUserContext({}));

    expect(result).toBeNull();
  });

  it('should return null if the condition value is not a finite number', () => {
    const userAttributes = { meters_travelled: 58.4 };
    const invalidValueCondition: Condition = {
      match: 'gt',
      name: 'meters_travelled',
      type: 'custom_attribute',
      value: Infinity,
    };
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition, getMockUserContext(userAttributes));

    expect(result).toBeNull();

    invalidValueCondition.value = null;

    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition, getMockUserContext(userAttributes));

    expect(result).toBeNull();

    invalidValueCondition.value = Math.pow(2, 53) + 2;
    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition, getMockUserContext(userAttributes));

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    expect(mockLogger.warn).toHaveBeenCalledWith(UNEXPECTED_CONDITION_VALUE, JSON.stringify(invalidValueCondition));
  });
});

describe('less than match type', () => {
  const ltCondition = {
    match: 'lt',
    name: 'meters_travelled',
    type: 'custom_attribute',
    value: 48.2,
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if the user-provided value is less than the condition value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      ltCondition,
      getMockUserContext({
        meters_travelled: 10,
      })
    );

    expect(result).toBe(true);
  });

  it('should return false if the user-provided value is not less than the condition value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      ltCondition,
      getMockUserContext({
        meters_travelled: 64.64,
      })
    );

    expect(result).toBe(false);
  });

  it('should log and return null if the user-provided value is not a number', () => {
    const unexpectedTypeUserAttributes1: Record<string, unknown> = { meters_travelled: true };
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(ltCondition, getMockUserContext(unexpectedTypeUserAttributes1));

    expect(result).toBeNull();

    const unexpectedTypeUserAttributes2: Record<string, unknown> = { meters_travelled: '48.2' };
    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(ltCondition, getMockUserContext(unexpectedTypeUserAttributes2));

    expect(result).toBeNull();

    const userValue1 = unexpectedTypeUserAttributes1[ltCondition.name];
    const userValueType1 = typeof userValue1;
    const userValue2 = unexpectedTypeUserAttributes2[ltCondition.name];
    const userValueType2 = typeof userValue2;

    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(ltCondition),
      userValueType1,
      ltCondition.name
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(ltCondition),
      userValueType2,
      ltCondition.name
    );
  });

  it('should log and return null if the user-provided number value is out of bounds', () => {
    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(ltCondition, getMockUserContext({ meters_travelled: Infinity }));

    expect(result).toBeNull();

    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(ltCondition, getMockUserContext({ meters_travelled: Math.pow(2, 53) + 2 }));

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(OUT_OF_BOUNDS, JSON.stringify(ltCondition), ltCondition.name);
    expect(mockLogger.warn).toHaveBeenCalledWith(OUT_OF_BOUNDS, JSON.stringify(ltCondition), ltCondition.name);
  });

  it('should log and return null if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(ltCondition, getMockUserContext({ meters_travelled: null }));

    expect(result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(UNEXPECTED_TYPE_NULL, JSON.stringify(ltCondition), ltCondition.name);
  });

  it('should return null if there is no user-provided value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(ltCondition, getMockUserContext({}));

    expect(result).toBeNull();
  });

  it('should return null if the condition value is not a finite number', () => {
    const userAttributes = { meters_travelled: 10 };
    const invalidValueCondition: Condition = {
      match: 'lt',
      name: 'meters_travelled',
      type: 'custom_attribute',
      value: Infinity,
    };

    let result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition, getMockUserContext(userAttributes));

    expect(result).toBeNull();

    invalidValueCondition.value = null;
    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition, getMockUserContext(userAttributes));

    expect(result).toBeNull();

    invalidValueCondition.value = Math.pow(2, 53) + 2;
    result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(invalidValueCondition, getMockUserContext(userAttributes));

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    expect(mockLogger.warn).toHaveBeenCalledWith(UNEXPECTED_CONDITION_VALUE, JSON.stringify(invalidValueCondition));
  });
});

describe('less than or equal match type', () => {
  const leCondition = {
    match: 'le',
    name: 'meters_travelled',
    type: 'custom_attribute',
    value: 48.2,
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if the user-provided value is greater than the condition value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      leCondition,
      getMockUserContext({
        meters_travelled: 48.3,
      })
    );

    expect(result).toBe(false);
  });

  it('should return true if the user-provided value is less than or equal to the condition value', () => {
    const versions = [48, 48.2];
    for (const userValue of versions) {
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        leCondition,
        getMockUserContext({
          meters_travelled: userValue,
        })
      );

      expect(result).toBe(true);
    }
  });
});

describe('greater than and equal to match type', () => {
  const geCondition = {
    match: 'ge',
    name: 'meters_travelled',
    type: 'custom_attribute',
    value: 48.2,
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if the user-provided value is less than the condition value', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      geCondition,
      getMockUserContext({
        meters_travelled: 48,
      })
    );

    expect(result).toBe(false);
  });

  it('should return true if the user-provided value is less than or equal to the condition value', () => {
    const versions = [100, 48.2];
    versions.forEach(userValue => {
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        geCondition,
        getMockUserContext({
          meters_travelled: userValue,
        })
      );

      expect(result).toBe(true);
    });
  });
});

describe('semver greater than match type', () => {
  const semvergtCondition = {
    match: 'semver_gt',
    name: 'app_version',
    type: 'custom_attribute',
    value: '2.0.0',
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if the user-provided version is greater than the condition version', () => {
    const versions = [['1.8.1', '1.9']];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvergtCondition = {
        match: 'semver_gt',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvergtCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(true);
    });
  });

  it('should return false if the user-provided version is not greater than the condition version', function() {
    const versions = [
      ['2.0.1', '2.0.1'],
      ['2.0', '2.0.0'],
      ['2.0', '2.0.1'],
      ['2.0.1', '2.0.0'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvergtCondition = {
        match: 'semver_gt',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvergtCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(false);
    });
  });

  it('should log and return null if the user-provided version is not a string', () => {
    let result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      semvergtCondition,
      getMockUserContext({
        app_version: 22,
      })
    );

    expect(result).toBe(null);

    result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      semvergtCondition,
      getMockUserContext({
        app_version: false,
      })
    );

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(semvergtCondition),
      'number',
      'app_version'
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(semvergtCondition),
      'boolean',
      'app_version'
    );
  });

  it('should log and return null if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(semvergtCondition, getMockUserContext({ app_version: null }));

    expect(result).toBe(null);
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      UNEXPECTED_TYPE_NULL,
      JSON.stringify(semvergtCondition),
      'app_version'
    );
  });

  it('should return null if there is no user-provided value', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(semvergtCondition, getMockUserContext({}));

    expect(result).toBe(null);
  });
});

describe('semver less than match type', () => {
  const semverltCondition = {
    match: 'semver_lt',
    name: 'app_version',
    type: 'custom_attribute',
    value: '2.0.0',
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if the user-provided version is greater than the condition version', () => {
    const versions = [
      ['2.0.0', '2.0.1'],
      ['1.9', '2.0.0'],
      ['2.0.0', '2.0.0'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemverltCondition = {
        match: 'semver_lt',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemverltCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(false);
    });
  });

  it('should return true if the user-provided version is less than the condition version', () => {
    const versions = [
      ['2.0.1', '2.0.0'],
      ['2.0.0', '1.9'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemverltCondition = {
        match: 'semver_lt',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemverltCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(true);
    });
  });

  it('should log and return null if the user-provided version is not a string', () => {
    let result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      semverltCondition,
      getMockUserContext({
        app_version: 22,
      })
    );

    expect(result).toBe(null);

    result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      semverltCondition,
      getMockUserContext({
        app_version: false,
      })
    );

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(semverltCondition),
      'number',
      'app_version'
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(semverltCondition),
      'boolean',
      'app_version'
    );
  });

  it('should log and return null if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(semverltCondition, getMockUserContext({ app_version: null }));

    expect(result).toBe(null);
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      UNEXPECTED_TYPE_NULL,
      JSON.stringify(semverltCondition),
      'app_version'
    );
  });

  it('should return null if there is no user-provided value', function() {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(semverltCondition, getMockUserContext({}));

    expect(result).toBe(null);
  });
});
describe('semver equal to match type', () => {
  const semvereqCondition = {
    match: 'semver_eq',
    name: 'app_version',
    type: 'custom_attribute',
    value: '2.0',
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if the user-provided version is greater than the condition version', () => {
    const versions = [
      ['2.0.0', '2.0.1'],
      ['2.0.1', '2.0.0'],
      ['1.9.1', '1.9'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvereqCondition = {
        match: 'semver_eq',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvereqCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(false);
    });
  });

  it('should return true if the user-provided version is equal to the condition version', () => {
    const versions = [
      ['2.0.1', '2.0.1'],
      ['1.9', '1.9.1'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvereqCondition = {
        match: 'semver_eq',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvereqCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(true);
    });
  });

  it('should log and return null if the user-provided version is not a string', () => {
    let result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      semvereqCondition,
      getMockUserContext({
        app_version: 22,
      })
    );

    expect(result).toBe(null);

    result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      semvereqCondition,
      getMockUserContext({
        app_version: false,
      })
    );

    expect(result).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(semvereqCondition),
      'number',
      'app_version'
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_TYPE,
      JSON.stringify(semvereqCondition),
      'boolean',
      'app_version'
    );
  });

  it('should log and return null if the user-provided value is null', () => {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(semvereqCondition, getMockUserContext({ app_version: null }));

    expect(result).toBe(null);
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      UNEXPECTED_TYPE_NULL,
      JSON.stringify(semvereqCondition),
      'app_version'
    );
  });

  it('should return null if there is no user-provided value', function() {
    const result = customAttributeEvaluator
      .getEvaluator(mockLogger)
      .evaluate(semvereqCondition, getMockUserContext({}));

    expect(result).toBe(null);
  });
});

describe('semver less than or equal to match type', () => {
  const semverleCondition = {
    match: 'semver_le',
    name: 'app_version',
    type: 'custom_attribute',
    value: '2.0.0',
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if the user-provided version is greater than the condition version', () => {
    const versions = [['2.0.0', '2.0.1']];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvereqCondition = {
        match: 'semver_le',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvereqCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(false);
    });
  });

  it('should return true if the user-provided version is less than or equal to the condition version', () => {
    const versions = [
      ['2.0.1', '2.0.0'],
      ['2.0.1', '2.0.1'],
      ['1.9', '1.9.1'],
      ['1.9.1', '1.9'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvereqCondition = {
        match: 'semver_le',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvereqCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(true);
    });
  });

  it('should return true if the user-provided version is equal to the condition version', () => {
    const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
      semverleCondition,
      getMockUserContext({
        app_version: '2.0',
      })
    );

    expect(result).toBe(true);
  });
});

describe('semver greater than or equal to match type', () => {
  const semvergeCondition = {
    match: 'semver_ge',
    name: 'app_version',
    type: 'custom_attribute',
    value: '2.0',
  };
  const mockLogger = createLogger();

  beforeEach(() => {
    vi.spyOn(mockLogger, 'error');
    vi.spyOn(mockLogger, 'debug');
    vi.spyOn(mockLogger, 'info');
    vi.spyOn(mockLogger, 'warn');
  })

  afterEach(() => {
    vi.restoreAllMocks();
  })

  it('should return true if the user-provided version is greater than or equal to the condition version', () => {
    const versions = [
      ['2.0.0', '2.0.1'],
      ['2.0.1', '2.0.1'],
      ['1.9', '1.9.1'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvereqCondition = {
        match: 'semver_ge',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvereqCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(true);
    })
  });

  it('should return false if the user-provided version is less than the condition version', () => {
    const versions = [
      ['2.0.1', '2.0.0'],
      ['1.9.1', '1.9'],
    ];
    versions.forEach(([targetVersion, userVersion]) => {
      const customSemvereqCondition = {
        match: 'semver_ge',
        name: 'app_version',
        type: 'custom_attribute',
        value: targetVersion,
      };
      const result = customAttributeEvaluator.getEvaluator(mockLogger).evaluate(
        customSemvereqCondition,
        getMockUserContext({
          app_version: userVersion,
        })
      );

      expect(result).toBe(false);
    })
  });
});
