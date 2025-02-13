/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { beforeEach, afterEach, describe, it, vi, expect } from 'vitest';

import AudienceEvaluator, { createAudienceEvaluator } from './index';
import * as conditionTreeEvaluator from '../condition_tree_evaluator';
import * as customAttributeConditionEvaluator from '../custom_attribute_condition_evaluator';
import { AUDIENCE_EVALUATION_RESULT, EVALUATING_AUDIENCE } from '../../message/log_message';
import { getMockLogger } from '../../tests/mock/mock_logger';
import { Audience, OptimizelyDecideOption, OptimizelyDecision } from '../../shared_types';
import { IOptimizelyUserContext } from '../../optimizely_user_context';

let mockLogger = getMockLogger();

const getMockUserContext = (attributes?: unknown, segments?: string[]): IOptimizelyUserContext => ({
  getAttributes: () => ({ ...(attributes || {}) }),
  isQualifiedFor: segment => segments ? segments.indexOf(segment) > -1 : false,
  qualifiedSegments: segments || [],
  getUserId: () => 'mockUserId',
  setAttribute: (key: string, value: any) => {},

  decide: (key: string, options?: OptimizelyDecideOption[]): OptimizelyDecision => ({
    variationKey: 'mockVariationKey',
    enabled: true,
    variables: { mockVariable: 'mockValue' },
    ruleKey: 'mockRuleKey',
    reasons: ['mockReason'],
    flagKey: 'flagKey',
    userContext: getMockUserContext()
  }),
}) as IOptimizelyUserContext;

const chromeUserAudience = {
  id: '0',
  name: 'chromeUserAudience',
  conditions: [
    'and',
    {
      name: 'browser_type',
      value: 'chrome',
      type: 'custom_attribute',
    },
  ],
};
const iphoneUserAudience = {
  id: '1',
  name: 'iphoneUserAudience',
  conditions: [
    'and',
    {
      name: 'device_model',
      value: 'iphone',
      type: 'custom_attribute',
    },
  ],
};
const specialConditionTypeAudience = {
  id: '3',
  name: 'specialConditionTypeAudience',
  conditions: [
    'and',
    {
      match: 'interest_level',
      value: 'special',
      type: 'special_condition_type',
    },
  ],
};
const conditionsPassingWithNoAttrs = [
  'not',
  {
    match: 'exists',
    name: 'input_value',
    type: 'custom_attribute',
  },
];
const conditionsPassingWithNoAttrsAudience = {
  id: '2',
  name: 'conditionsPassingWithNoAttrsAudience',
  conditions: conditionsPassingWithNoAttrs,
};

const audiencesById: {
[id: string]: Audience;
} = {
  "0": chromeUserAudience,
  "1": iphoneUserAudience,
  "2": conditionsPassingWithNoAttrsAudience,
  "3": specialConditionTypeAudience,
};


describe('lib/core/audience_evaluator', () => {
  let audienceEvaluator: AudienceEvaluator; 

  beforeEach(() => {
    mockLogger = getMockLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('APIs', () => {
    describe('with default condition evaluator', () => {
      beforeEach(() => {
        audienceEvaluator = createAudienceEvaluator({});
      });
      describe('evaluate', () => {
        it('should return true if there are no audiences', () => {
          expect(audienceEvaluator.evaluate([], audiencesById, getMockUserContext({}))).toBe(true);
        });

        it('should return false if there are audiences but no attributes', () => {
          expect(audienceEvaluator.evaluate(['0'], audiencesById, getMockUserContext({}))).toBe(false);
        });

        it('should return true if any of the audience conditions are met', () => {
          const iphoneUsers = {
            device_model: 'iphone',
          };

          const chromeUsers = {
            browser_type: 'chrome',
          };

          const iphoneChromeUsers = {
            browser_type: 'chrome',
            device_model: 'iphone',
          };

          expect(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(iphoneUsers))).toBe(true);
          expect(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(chromeUsers))).toBe(true);
          expect(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(iphoneChromeUsers))).toBe(
            true
          );
        });

        it('should return false if none of the audience conditions are met', () => {
          const nexusUsers = {
            device_model: 'nexus5',
          };

          const safariUsers = {
            browser_type: 'safari',
          };

          const nexusSafariUsers = {
            browser_type: 'safari',
            device_model: 'nexus5',
          };

          expect(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(nexusUsers))).toBe(false);
          expect(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(safariUsers))).toBe(false);
          expect(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(nexusSafariUsers))).toBe(
            false
          );
        });

        it('should return true if no attributes are passed and the audience conditions evaluate to true in the absence of attributes', () => {
          expect(audienceEvaluator.evaluate(['2'], audiencesById, getMockUserContext({}))).toBe(true);
        });

        describe('complex audience conditions', () => {
          it('should return true if any of the audiences in an "OR" condition pass', () => {
            const result = audienceEvaluator.evaluate(
              ['or', '0', '1'],
              audiencesById,
              getMockUserContext({ browser_type: 'chrome' })
            );
            expect(result).toBe(true);
          });

          it('should return true if all of the audiences in an "AND" condition pass', () => {
            const result = audienceEvaluator.evaluate(
              ['and', '0', '1'],
              audiencesById,
              getMockUserContext({
                browser_type: 'chrome',
                device_model: 'iphone',
              })
            );
            expect(result).toBe(true);
          });

          it('should return true if the audience in a "NOT" condition does not pass', () => {
            const result = audienceEvaluator.evaluate(
              ['not', '1'],
              audiencesById,
              getMockUserContext({ device_model: 'android' })
            );
            expect(result).toBe(true);
          });
        });

        describe('integration with dependencies', () => {
          beforeEach(() => {
            vi.clearAllMocks();
          });

          afterEach(() => {
            vi.resetAllMocks();
          });

          it('returns true if conditionTreeEvaluator.evaluate returns true', () => {
            vi.spyOn(conditionTreeEvaluator, 'evaluate').mockReturnValue(true);
            const result = audienceEvaluator.evaluate(
              ['or', '0', '1'],
              audiencesById,
              getMockUserContext({ browser_type: 'chrome' })
            );
            expect(result).toBe(true);
          });

          it('returns false if conditionTreeEvaluator.evaluate returns false', () => {
            vi.spyOn(conditionTreeEvaluator, 'evaluate').mockReturnValue(false);
            const result = audienceEvaluator.evaluate(
              ['or', '0', '1'],
              audiencesById,
              getMockUserContext({ browser_type: 'safari' })
            );
            expect(result).toBe(false);
          });

          it('returns false if conditionTreeEvaluator.evaluate returns null', () => {
            vi.spyOn(conditionTreeEvaluator, 'evaluate').mockReturnValue(null);
            const result = audienceEvaluator.evaluate(
              ['or', '0', '1'],
              audiencesById,
              getMockUserContext({ state: 'California' })
            );
            expect(result).toBe(false);
          });

          it('calls customAttributeConditionEvaluator.evaluate in the leaf evaluator for audience conditions', () => {
            const conditionTreeEvaluator = {
              evaluate: vi.fn((conditions, leafEvaluator) => leafEvaluator(conditions[1])),
            };
          
            const mockCustomAttributeConditionEvaluator = vi.fn().mockReturnValue(false);
          
            vi.spyOn(customAttributeConditionEvaluator, 'getEvaluator').mockReturnValue({
              evaluate: mockCustomAttributeConditionEvaluator,
            });          

            const audienceEvaluator = createAudienceEvaluator(conditionTreeEvaluator);

            const userAttributes = { device_model: 'android' };
            const user = getMockUserContext(userAttributes);
            const result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);

            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledTimes(1);
            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledWith(
              iphoneUserAudience.conditions[1],
              user,
            );

            expect(result).toBe(false);

            vi.restoreAllMocks();
          });
        });

        describe('Audience evaluation logging', () => {
          let mockCustomAttributeConditionEvaluator: ReturnType<typeof vi.fn>;

          beforeEach(() => {
            mockCustomAttributeConditionEvaluator = vi.fn();
            vi.spyOn(conditionTreeEvaluator, 'evaluate');
            vi.spyOn(customAttributeConditionEvaluator, 'getEvaluator').mockReturnValue({
              evaluate: mockCustomAttributeConditionEvaluator,
            });
          });

          afterEach(() => {
            vi.restoreAllMocks();
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns null', () => {
            vi.spyOn(conditionTreeEvaluator, 'evaluate').mockImplementationOnce((conditions: any, leafEvaluator) => {
              return leafEvaluator(conditions[1]);
            });

            mockCustomAttributeConditionEvaluator.mockReturnValue(null);
            const userAttributes = { device_model: 5.5 };
            const user = getMockUserContext(userAttributes);

            const audienceEvaluator = createAudienceEvaluator({}, mockLogger);

            const result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);

            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledTimes(1);
            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledWith(iphoneUserAudience.conditions[1], user);
            expect(result).toBe(false);
            expect(mockLogger.debug).toHaveBeenCalledTimes(2);

            expect(mockLogger.debug).toHaveBeenCalledWith(
              EVALUATING_AUDIENCE,
              '1',
              JSON.stringify(['and', iphoneUserAudience.conditions[1]])
            );

            expect(mockLogger.debug).toHaveBeenCalledWith(AUDIENCE_EVALUATION_RESULT, '1', 'UNKNOWN');
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns true', () => {
            vi.spyOn(conditionTreeEvaluator, 'evaluate').mockImplementationOnce((conditions: any, leafEvaluator) => {
              return leafEvaluator(conditions[1]);
            });

            mockCustomAttributeConditionEvaluator.mockReturnValue(true);

            const userAttributes = { device_model: 'iphone' };
            const user = getMockUserContext(userAttributes);

            const audienceEvaluator = createAudienceEvaluator({}, mockLogger);

            const result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);
            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledTimes(1);
            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledWith(iphoneUserAudience.conditions[1], user);
            expect(result).toBe(true);
            expect(mockLogger.debug).toHaveBeenCalledTimes(2)
            expect(mockLogger.debug).toHaveBeenCalledWith(
              EVALUATING_AUDIENCE,
              '1',
              JSON.stringify(['and', iphoneUserAudience.conditions[1]])
            );

            expect(mockLogger.debug).toHaveBeenCalledWith(AUDIENCE_EVALUATION_RESULT, '1', 'TRUE');
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns false', () => {
            vi.spyOn(conditionTreeEvaluator, 'evaluate').mockImplementationOnce((conditions: any, leafEvaluator) => {
              return leafEvaluator(conditions[1]);
            });

            mockCustomAttributeConditionEvaluator.mockReturnValue(false);

            const userAttributes = { device_model: 'android' };
            const user = getMockUserContext(userAttributes);

            const audienceEvaluator = createAudienceEvaluator({}, mockLogger);

            const result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);
            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledTimes(1);
            expect(mockCustomAttributeConditionEvaluator).toHaveBeenCalledWith(iphoneUserAudience.conditions[1], user);
            expect(result).toBe(false);
            expect(mockLogger.debug).toHaveBeenCalledTimes(2)
            expect(mockLogger.debug).toHaveBeenCalledWith(
              EVALUATING_AUDIENCE,
              '1',
              JSON.stringify(['and', iphoneUserAudience.conditions[1]])
            );

            expect(mockLogger.debug).toHaveBeenCalledWith(AUDIENCE_EVALUATION_RESULT, '1', 'FALSE');
          });
        });
      });
    });

    describe('with additional custom condition evaluator', () => {
      describe('when passing a valid additional evaluator', () => {
        beforeEach(() => {
          const mockEnvironment = {
            special: true,
          };
          audienceEvaluator = createAudienceEvaluator({
            special_condition_type: {
              evaluate: (condition: any, user: any) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const result = mockEnvironment[condition.value] && user.getAttributes()[condition.match] > 0;
                return result;
              },
            },
          });
        });

        it('should evaluate an audience properly using the custom condition evaluator', () => {
          expect(audienceEvaluator.evaluate(['3'], audiencesById, getMockUserContext({ interest_level: 0 }))).toBe(
            false
          );
          expect(audienceEvaluator.evaluate(['3'], audiencesById, getMockUserContext({ interest_level: 1 }))).toBe(
            true
          );
        });
      });

      describe('when passing an invalid additional evaluator', () => {
        beforeEach(() => {
          audienceEvaluator = createAudienceEvaluator({
            custom_attribute: {
              evaluate: () => {
                return false;
              },
            },
          });
        });

        it('should not be able to overwrite built in `custom_attribute` evaluator', () => {
          expect(
            audienceEvaluator.evaluate(
              ['0'],
              audiencesById,
              getMockUserContext({
                browser_type: 'chrome',
              })
            )
          ).toBe(true);
        });
      });
    });

    describe('with odp segment evaluator', () => {
      describe('Single ODP Audience', () => {
        const singleAudience = {
          id: '0',
          name: 'singleAudience',
          conditions: [
            'and',
            {
              value: 'odp-segment-1',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
          ],
        };
        const audiencesById = {
          0: singleAudience,
        };
        const audience = new AudienceEvaluator({});

        it('should evaluate to true if segment is found', () => {
          expect(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-1']))).toBe(true);
        });

        it('should evaluate to false if segment is not found', () => {
          expect(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-2']))).toBe(false);
        });

        it('should evaluate to false if not segments are provided', () => {
          expect(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}))).toBe(false);
        });
      });

      describe('Multiple ODP conditions in one Audience', () => {
        const singleAudience = {
          id: '0',
          name: 'singleAudience',
          conditions: [
            'and',
            {
              value: 'odp-segment-1',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
            {
              value: 'odp-segment-2',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
            [
              'or',
              {
                value: 'odp-segment-3',
                type: 'third_party_dimension',
                name: 'odp.audiences',
                match: 'qualified',
              },
              {
                value: 'odp-segment-4',
                type: 'third_party_dimension',
                name: 'odp.audiences',
                match: 'qualified',
              },
            ],
          ],
        };
        const audiencesById = {
          0: singleAudience,
        };
        const audience = new AudienceEvaluator({});

        it('should evaluate correctly based on the given segments', () => {
          expect(
            audience.evaluate(
              ['or', '0'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-3'])
            )
          ).toBe(true);
          expect(
            audience.evaluate(
              ['or', '0'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-4'])
            )
          ).toBe(true);
          expect(
            audience.evaluate(
              ['or', '0'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-3', 'odp-segment-4'])
            )
          ).toBe(true);
          expect(
            audience.evaluate(
              ['or', '0'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-3', 'odp-segment-4'])
            )
          ).toBe(false);
          expect(
            audience.evaluate(
              ['or', '0'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-2', 'odp-segment-3', 'odp-segment-4'])
            )
          ).toBe(false);
        });
      });

      describe('Multiple ODP conditions in multiple Audience', () => {
        const audience1And2 = {
          id: '0',
          name: 'audience1And2',
          conditions: [
            'and',
            {
              value: 'odp-segment-1',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
            {
              value: 'odp-segment-2',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
          ],
        };

        const audience3And4 = {
          id: '1',
          name: 'audience3And4',
          conditions: [
            'and',
            {
              value: 'odp-segment-3',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
            {
              value: 'odp-segment-4',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
          ],
        };

        const audience5And6 = {
          id: '2',
          name: 'audience5And6',
          conditions: [
            'or',
            {
              value: 'odp-segment-5',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
            {
              value: 'odp-segment-6',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
          ],
        };
        const audiencesById = {
          0: audience1And2,
          1: audience3And4,
          2: audience5And6,
        };
        const audience = new AudienceEvaluator({});

        it('should evaluate correctly based on the given segments', () => {
          expect(
            audience.evaluate(
              ['or', '0', '1', '2'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2'])
            )
          ).toBe(true);
          expect(
            audience.evaluate(
              ['and', '0', '1', '2'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2'])
            )
          ).toBe(false);
          expect(
            audience.evaluate(
              ['and', '0', '1', '2'],
              audiencesById,
              getMockUserContext({}, [
                'odp-segment-1',
                'odp-segment-2',
                'odp-segment-3',
                'odp-segment-4',
                'odp-segment-6',
              ])
            )
          ).toBe(true);
          expect(
            audience.evaluate(
              ['and', '0', '1', ['not', '2']],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-3', 'odp-segment-4'])
            )
          ).toBe(true);
        });
      });
    });

    describe('with multiple types of evaluators', () => {
      const audience1And2 = {
        id: '0',
        name: 'audience1And2',
        conditions: [
          'and',
          {
            value: 'odp-segment-1',
            type: 'third_party_dimension',
            name: 'odp.audiences',
            match: 'qualified',
          },
          {
            value: 'odp-segment-2',
            type: 'third_party_dimension',
            name: 'odp.audiences',
            match: 'qualified',
          },
        ],
      };
      const audience3Or4 = {
        id: '',
        name: 'audience3And4',
        conditions: [
          'or',
          {
            value: 'odp-segment-3',
            type: 'third_party_dimension',
            name: 'odp.audiences',
            match: 'qualified',
          },
          {
            value: 'odp-segment-4',
            type: 'third_party_dimension',
            name: 'odp.audiences',
            match: 'qualified',
          },
        ],
      };

      const audiencesById = {
        0: audience1And2,
        1: audience3Or4,
        2: chromeUserAudience,
      };

      const audience = new AudienceEvaluator({});

      it('should evaluate correctly based on the given segments', () => {
        expect(
          audience.evaluate(
            ['and', '0', '1', '2'],
            audiencesById,
            getMockUserContext({ browser_type: 'not_chrome' }, ['odp-segment-1', 'odp-segment-2', 'odp-segment-4'])
          )
        ).toBe(false);
        expect(
          audience.evaluate(
            ['and', '0', '1', '2'],
            audiencesById,
            getMockUserContext({ browser_type: 'chrome' }, ['odp-segment-1', 'odp-segment-2', 'odp-segment-4'])
          )
        ).toBe(true);
      });
    });
  });
});
