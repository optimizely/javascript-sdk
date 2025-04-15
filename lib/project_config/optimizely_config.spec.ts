/**
 * Copyright 2025, Optimizely
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
import { describe, it, expect, beforeEach, vi, assert } from 'vitest';
import { createOptimizelyConfig, OptimizelyConfig } from './optimizely_config';
import { createProjectConfig, ProjectConfig } from './project_config';
import {
  getTestProjectConfigWithFeatures,
  getTypedAudiencesConfig,
  getSimilarRuleKeyConfig,
  getSimilarExperimentKeyConfig,
  getDuplicateExperimentKeyConfig,
} from '../tests/test_data';
import { Experiment } from '../shared_types';
import { LoggerFacade } from '../logging/logger';
import { getMockLogger } from '../tests/mock/mock_logger';

const datafile: ProjectConfig = getTestProjectConfigWithFeatures();
const typedAudienceDatafile = getTypedAudiencesConfig();
const similarRuleKeyDatafile = getSimilarRuleKeyConfig();
const similarExperimentKeyDatafile = getSimilarExperimentKeyConfig();
const cloneDeep = (obj: any) => JSON.parse(JSON.stringify(obj));
const getAllExperimentsFromDatafile = (datafile: ProjectConfig) => {
  const allExperiments: Experiment[] = [];
  datafile.groups.forEach(group => {
    group.experiments.forEach(experiment => {
      allExperiments.push(experiment);
    });
  });
  datafile.experiments.forEach(experiment => {
    allExperiments.push(experiment);
  });
  return allExperiments;
};

describe('Optimizely Config', () => {
  let optimizelyConfigObject: OptimizelyConfig;
  let projectConfigObject: ProjectConfig;
  let projectTypedAudienceConfigObject: ProjectConfig;
  let optimizelySimilarRuleKeyConfigObject: OptimizelyConfig;
  let projectSimilarRuleKeyConfigObject: ProjectConfig;
  let optimizelySimilarExperimentkeyConfigObject: OptimizelyConfig;
  let projectSimilarExperimentKeyConfigObject: ProjectConfig;

  const logger = getMockLogger();

  beforeEach(() => {
    projectConfigObject = createProjectConfig(cloneDeep(datafile as any));
    optimizelyConfigObject = createOptimizelyConfig(projectConfigObject, JSON.stringify(datafile));
    projectTypedAudienceConfigObject = createProjectConfig(cloneDeep(typedAudienceDatafile));
    projectSimilarRuleKeyConfigObject = createProjectConfig(cloneDeep(similarRuleKeyDatafile));
    optimizelySimilarRuleKeyConfigObject = createOptimizelyConfig(
      projectSimilarRuleKeyConfigObject,
      JSON.stringify(similarRuleKeyDatafile)
    );
    projectSimilarExperimentKeyConfigObject = createProjectConfig(cloneDeep(similarExperimentKeyDatafile));
    optimizelySimilarExperimentkeyConfigObject = createOptimizelyConfig(
      projectSimilarExperimentKeyConfigObject,
      JSON.stringify(similarExperimentKeyDatafile)
    );
  });

  it('should return all experiments except rollouts', () => {
    const experimentsMap = optimizelyConfigObject.experimentsMap;
    const experimentsCount = Object.keys(experimentsMap).length;

    expect(experimentsCount).toBe(12);

    const allExperiments: Experiment[] = getAllExperimentsFromDatafile(datafile);

    allExperiments.forEach(experiment => {
      expect(experimentsMap[experiment.key]).toMatchObject({
        id: experiment.id,
        key: experiment.key,
      });

      const variationsMap = experimentsMap[experiment.key].variationsMap;

      experiment.variations.forEach(variation => {
        expect(variationsMap[variation.key]).toMatchObject({
          id: variation.id,
          key: variation.key,
        });
      });
    });
  });

  it('should keep the last experiment in case of duplicate key and log a warning', () => {
    const datafile = getDuplicateExperimentKeyConfig();
    const configObj = createProjectConfig(datafile, JSON.stringify(datafile));
    const optimizelyConfig = createOptimizelyConfig(configObj, JSON.stringify(datafile), logger);
    const experimentsMap = optimizelyConfig.experimentsMap;
    const duplicateKey = 'experiment_rule';
    const lastExperiment = datafile.experiments[datafile.experiments.length - 1];

    expect(experimentsMap['experiment_rule'].id).toBe(lastExperiment.id);
    expect(logger.warn).toHaveBeenCalledWith(`Duplicate experiment keys found in datafile: ${duplicateKey}`);
  });

  it('should return all the feature flags', function() {
    const featureFlagsCount = Object.keys(optimizelyConfigObject.featuresMap).length;
    assert.equal(featureFlagsCount, 9);

    const featuresMap = optimizelyConfigObject.featuresMap;
    const expectedDeliveryRules = [
      [
        {
          id: '594031',
          key: '594031',
          audiences: '',
          variationsMap: {
            '594032': {
              id: '594032',
              key: '594032',
              featureEnabled: true,
              variablesMap: {
                new_content: {
                  id: '4919852825313280',
                  key: 'new_content',
                  type: 'boolean',
                  value: 'true',
                },
                lasers: {
                  id: '5482802778734592',
                  key: 'lasers',
                  type: 'integer',
                  value: '395',
                },
                price: {
                  id: '6045752732155904',
                  key: 'price',
                  type: 'double',
                  value: '4.99',
                },
                message: {
                  id: '6327227708866560',
                  key: 'message',
                  type: 'string',
                  value: 'Hello audience',
                },
                message_info: {
                  id: '8765345281230956',
                  key: 'message_info',
                  type: 'json',
                  value: '{ "count": 2, "message": "Hello audience" }',
                },
              },
            },
          },
        },
        {
          id: '594037',
          key: '594037',
          audiences: '',
          variationsMap: {
            '594038': {
              id: '594038',
              key: '594038',
              featureEnabled: false,
              variablesMap: {
                new_content: {
                  id: '4919852825313280',
                  key: 'new_content',
                  type: 'boolean',
                  value: 'false',
                },
                lasers: {
                  id: '5482802778734592',
                  key: 'lasers',
                  type: 'integer',
                  value: '400',
                },
                price: {
                  id: '6045752732155904',
                  key: 'price',
                  type: 'double',
                  value: '14.99',
                },
                message: {
                  id: '6327227708866560',
                  key: 'message',
                  type: 'string',
                  value: 'Hello',
                },
                message_info: {
                  id: '8765345281230956',
                  key: 'message_info',
                  type: 'json',
                  value: '{ "count": 1, "message": "Hello" }',
                },
              },
            },
          },
        },
      ],
      [
        {
          id: '594060',
          key: '594060',
          audiences: '',
          variationsMap: {
            '594061': {
              id: '594061',
              key: '594061',
              featureEnabled: true,
              variablesMap: {
                miles_to_the_wall: {
                  id: '5060590313668608',
                  key: 'miles_to_the_wall',
                  type: 'double',
                  value: '27.34',
                },
                motto: {
                  id: '5342065290379264',
                  key: 'motto',
                  type: 'string',
                  value: 'Winter is NOT coming',
                },
                soldiers_available: {
                  id: '6186490220511232',
                  key: 'soldiers_available',
                  type: 'integer',
                  value: '10003',
                },
                is_winter_coming: {
                  id: '6467965197221888',
                  key: 'is_winter_coming',
                  type: 'boolean',
                  value: 'false',
                },
              },
            },
          },
        },
        {
          id: '594066',
          key: '594066',
          audiences: '',
          variationsMap: {
            '594067': {
              id: '594067',
              key: '594067',
              featureEnabled: true,
              variablesMap: {
                miles_to_the_wall: {
                  id: '5060590313668608',
                  key: 'miles_to_the_wall',
                  type: 'double',
                  value: '30.34',
                },
                motto: {
                  id: '5342065290379264',
                  key: 'motto',
                  type: 'string',
                  value: 'Winter is coming definitely',
                },
                soldiers_available: {
                  id: '6186490220511232',
                  key: 'soldiers_available',
                  type: 'integer',
                  value: '500',
                },
                is_winter_coming: {
                  id: '6467965197221888',
                  key: 'is_winter_coming',
                  type: 'boolean',
                  value: 'true',
                },
              },
            },
          },
        },
      ],
      [],
      [],
      [
        {
          id: '599056',
          key: '599056',
          audiences: '',
          variationsMap: {
            '599057': {
              id: '599057',
              key: '599057',
              featureEnabled: true,
              variablesMap: {
                lasers: {
                  id: '4937719889264640',
                  key: 'lasers',
                  type: 'integer',
                  value: '200',
                },
                message: {
                  id: '6345094772817920',
                  key: 'message',
                  type: 'string',
                  value: "i'm a rollout",
                },
              },
            },
          },
        },
      ],
      [],
      [],
      [
        {
          id: '594060',
          key: '594060',
          audiences: '',
          variationsMap: {
            '594061': {
              id: '594061',
              key: '594061',
              featureEnabled: true,
              variablesMap: {
                miles_to_the_wall: {
                  id: '5060590313668608',
                  key: 'miles_to_the_wall',
                  type: 'double',
                  value: '27.34',
                },
                motto: {
                  id: '5342065290379264',
                  key: 'motto',
                  type: 'string',
                  value: 'Winter is NOT coming',
                },
                soldiers_available: {
                  id: '6186490220511232',
                  key: 'soldiers_available',
                  type: 'integer',
                  value: '10003',
                },
                is_winter_coming: {
                  id: '6467965197221888',
                  key: 'is_winter_coming',
                  type: 'boolean',
                  value: 'false',
                },
              },
            },
          },
        },
        {
          id: '594066',
          key: '594066',
          audiences: '',
          variationsMap: {
            '594067': {
              id: '594067',
              key: '594067',
              featureEnabled: true,
              variablesMap: {
                miles_to_the_wall: {
                  id: '5060590313668608',
                  key: 'miles_to_the_wall',
                  type: 'double',
                  value: '30.34',
                },
                motto: {
                  id: '5342065290379264',
                  key: 'motto',
                  type: 'string',
                  value: 'Winter is coming definitely',
                },
                soldiers_available: {
                  id: '6186490220511232',
                  key: 'soldiers_available',
                  type: 'integer',
                  value: '500',
                },
                is_winter_coming: {
                  id: '6467965197221888',
                  key: 'is_winter_coming',
                  type: 'boolean',
                  value: 'true',
                },
              },
            },
          },
        },
      ],
      [
        {
          id: '594060',
          key: '594060',
          audiences: '',
          variationsMap: {
            '594061': {
              id: '594061',
              key: '594061',
              featureEnabled: true,
              variablesMap: {
                miles_to_the_wall: {
                  id: '5060590313668608',
                  key: 'miles_to_the_wall',
                  type: 'double',
                  value: '27.34',
                },
                motto: {
                  id: '5342065290379264',
                  key: 'motto',
                  type: 'string',
                  value: 'Winter is NOT coming',
                },
                soldiers_available: {
                  id: '6186490220511232',
                  key: 'soldiers_available',
                  type: 'integer',
                  value: '10003',
                },
                is_winter_coming: {
                  id: '6467965197221888',
                  key: 'is_winter_coming',
                  type: 'boolean',
                  value: 'false',
                },
              },
            },
          },
        },
        {
          id: '594066',
          key: '594066',
          audiences: '',
          variationsMap: {
            '594067': {
              id: '594067',
              key: '594067',
              featureEnabled: true,
              variablesMap: {
                miles_to_the_wall: {
                  id: '5060590313668608',
                  key: 'miles_to_the_wall',
                  type: 'double',
                  value: '30.34',
                },
                motto: {
                  id: '5342065290379264',
                  key: 'motto',
                  type: 'string',
                  value: 'Winter is coming definitely',
                },
                soldiers_available: {
                  id: '6186490220511232',
                  key: 'soldiers_available',
                  type: 'integer',
                  value: '500',
                },
                is_winter_coming: {
                  id: '6467965197221888',
                  key: 'is_winter_coming',
                  type: 'boolean',
                  value: 'true',
                },
              },
            },
          },
        },
      ],
    ];
    const expectedExperimentRules = [
      [],
      [],
      [
        {
          id: '594098',
          key: 'testing_my_feature',
          audiences: '',
          variationsMap: {
            variation: {
              id: '594096',
              key: 'variation',
              featureEnabled: true,
              variablesMap: {
                num_buttons: {
                  id: '4792309476491264',
                  key: 'num_buttons',
                  type: 'integer',
                  value: '2',
                },
                is_button_animated: {
                  id: '5073784453201920',
                  key: 'is_button_animated',
                  type: 'boolean',
                  value: 'true',
                },
                button_txt: {
                  id: '5636734406623232',
                  key: 'button_txt',
                  type: 'string',
                  value: 'Buy me NOW',
                },
                button_width: {
                  id: '6199684360044544',
                  key: 'button_width',
                  type: 'double',
                  value: '20.25',
                },
                button_info: {
                  id: '1547854156498475',
                  key: 'button_info',
                  type: 'json',
                  value: '{ "num_buttons": 1, "text": "first variation"}',
                },
              },
            },
            control: {
              id: '594097',
              key: 'control',
              featureEnabled: true,
              variablesMap: {
                num_buttons: {
                  id: '4792309476491264',
                  key: 'num_buttons',
                  type: 'integer',
                  value: '10',
                },
                is_button_animated: {
                  id: '5073784453201920',
                  key: 'is_button_animated',
                  type: 'boolean',
                  value: 'false',
                },
                button_txt: {
                  id: '5636734406623232',
                  key: 'button_txt',
                  type: 'string',
                  value: 'Buy me',
                },
                button_width: {
                  id: '6199684360044544',
                  key: 'button_width',
                  type: 'double',
                  value: '50.55',
                },
                button_info: {
                  id: '1547854156498475',
                  key: 'button_info',
                  type: 'json',
                  value: '{ "num_buttons": 2, "text": "second variation"}',
                },
              },
            },
            variation2: {
              id: '594099',
              key: 'variation2',
              featureEnabled: false,
              variablesMap: {
                num_buttons: {
                  id: '4792309476491264',
                  key: 'num_buttons',
                  type: 'integer',
                  value: '10',
                },
                is_button_animated: {
                  id: '5073784453201920',
                  key: 'is_button_animated',
                  type: 'boolean',
                  value: 'false',
                },
                button_txt: {
                  id: '5636734406623232',
                  key: 'button_txt',
                  type: 'string',
                  value: 'Buy me',
                },
                button_width: {
                  id: '6199684360044544',
                  key: 'button_width',
                  type: 'double',
                  value: '50.55',
                },
                button_info: {
                  id: '1547854156498475',
                  key: 'button_info',
                  type: 'json',
                  value: '{ "num_buttons": 0, "text": "default value"}',
                },
              },
            },
          },
        },
      ],
      [
        {
          id: '595010',
          key: 'exp_with_group',
          audiences: '',
          variationsMap: {
            var: {
              featureEnabled: undefined,
              id: '595008',
              key: 'var',
              variablesMap: {},
            },
            con: {
              featureEnabled: undefined,
              id: '595009',
              key: 'con',
              variablesMap: {},
            },
          },
        },
      ],
      [
        {
          id: '599028',
          key: 'test_shared_feature',
          audiences: '',
          variationsMap: {
            treatment: {
              id: '599026',
              key: 'treatment',
              featureEnabled: true,
              variablesMap: {
                lasers: {
                  id: '4937719889264640',
                  key: 'lasers',
                  type: 'integer',
                  value: '100',
                },
                message: {
                  id: '6345094772817920',
                  key: 'message',
                  type: 'string',
                  value: 'shared',
                },
              },
            },
            control: {
              id: '599027',
              key: 'control',
              featureEnabled: false,
              variablesMap: {
                lasers: {
                  id: '4937719889264640',
                  key: 'lasers',
                  type: 'integer',
                  value: '100',
                },
                message: {
                  id: '6345094772817920',
                  key: 'message',
                  type: 'string',
                  value: 'shared',
                },
              },
            },
          },
        },
      ],
      [],
      [
        {
          id: '12115595439',
          key: 'no_traffic_experiment',
          audiences: '',
          variationsMap: {
            variation_5000: {
              featureEnabled: undefined,
              id: '12098126629',
              key: 'variation_5000',
              variablesMap: {},
            },
            variation_10000: {
              featureEnabled: undefined,
              id: '12098126630',
              key: 'variation_10000',
              variablesMap: {},
            },
          },
        },
      ],
      [
        {
          id: '42222',
          key: 'group_2_exp_1',
          audiences: '"Test attribute users 3"',
          variationsMap: {
            var_1: {
              id: '38901',
              key: 'var_1',
              featureEnabled: false,
              variablesMap: {},
            },
          },
        },
        {
          id: '42223',
          key: 'group_2_exp_2',
          audiences: '"Test attribute users 3"',
          variationsMap: {
            var_1: {
              id: '38905',
              key: 'var_1',
              featureEnabled: false,
              variablesMap: {},
            },
          },
        },
        {
          id: '42224',
          key: 'group_2_exp_3',
          audiences: '"Test attribute users 3"',
          variationsMap: {
            var_1: {
              id: '38906',
              key: 'var_1',
              featureEnabled: false,
              variablesMap: {},
            },
          },
        },
      ],
      [
        {
          id: '111134',
          key: 'test_experiment3',
          audiences: '"Test attribute users 3"',
          variationsMap: {
            control: {
              id: '222239',
              key: 'control',
              featureEnabled: false,
              variablesMap: {},
            },
          },
        },
        {
          id: '111135',
          key: 'test_experiment4',
          audiences: '"Test attribute users 3"',
          variationsMap: {
            control: {
              id: '222240',
              key: 'control',
              featureEnabled: false,
              variablesMap: {},
            },
          },
        },
        {
          id: '111136',
          key: 'test_experiment5',
          audiences: '"Test attribute users 3"',
          variationsMap: {
            control: {
              id: '222241',
              key: 'control',
              featureEnabled: false,
              variablesMap: {},
            },
          },
        },
      ],
    ];

    datafile.featureFlags.forEach((featureFlag, index) => {
      expect(featuresMap[featureFlag.key]).toMatchObject({
        id: featureFlag.id,
        key: featureFlag.key,
      });

      featureFlag.experimentIds.forEach(experimentId => {
        const experimentKey = projectConfigObject.experimentIdMap[experimentId].key;

        expect(!!featuresMap[featureFlag.key].experimentsMap[experimentKey]).toBe(true);
      });

      const variablesMap = featuresMap[featureFlag.key].variablesMap;
      const deliveryRules = featuresMap[featureFlag.key].deliveryRules;
      const experimentRules = featuresMap[featureFlag.key].experimentRules;

      expect(deliveryRules).toEqual(expectedDeliveryRules[index]);
      expect(experimentRules).toEqual(expectedExperimentRules[index]);

      featureFlag.variables.forEach(variable => {
        // json is represented as sub type of string to support backwards compatibility in datafile.
        // project config treats it as a first-class type.
        const expectedVariableType = variable.type === 'string' && variable.subType === 'json' ? 'json' : variable.type;

        expect(variablesMap[variable.key]).toMatchObject({
          id: variable.id,
          key: variable.key,
          type: expectedVariableType,
          value: variable.defaultValue,
        });
      });
    });
  });

  it('should correctly merge all feature variables', () => {
    const featureFlags = datafile.featureFlags;
    const datafileExperimentsMap: Record<string, Experiment> = getAllExperimentsFromDatafile(datafile).reduce(
      (experiments, experiment) => {
        experiments[experiment.key] = experiment;
        return experiments;
      },
      {} as Record<string, Experiment>
    );

    featureFlags.forEach(featureFlag => {
      const experimentIds = featureFlag.experimentIds;
      experimentIds.forEach(experimentId => {
        const experimentKey = projectConfigObject.experimentIdMap[experimentId].key;
        const experiment = optimizelyConfigObject.experimentsMap[experimentKey];
        const variations = datafileExperimentsMap[experimentKey].variations;
        const variationsMap = experiment.variationsMap;
        variations.forEach(variation => {
          featureFlag.variables.forEach(variable => {
            const variableToAssert = variationsMap[variation.key].variablesMap[variable.key];
            // json is represented as sub type of string to support backwards compatibility in datafile.
            // project config treats it as a first-class type.
            const expectedVariableType =
              variable.type === 'string' && variable.subType === 'json' ? 'json' : variable.type;

            expect({
              id: variable.id,
              key: variable.key,
              type: expectedVariableType,
            }).toMatchObject({
              id: variableToAssert.id,
              key: variableToAssert.key,
              type: variableToAssert.type,
            });

            if (!variation.featureEnabled) {
              expect(variable.defaultValue).toBe(variableToAssert.value);
            }
          });
        });
      });
    });
  });

  it('should return correct config revision', () => {
    expect(optimizelyConfigObject.revision).toBe(datafile.revision);
  });

  it('should return correct config sdkKey ', () => {
    expect(optimizelyConfigObject.sdkKey).toBe(datafile.sdkKey);
  });

  it('should return correct config environmentKey ', () => {
    expect(optimizelyConfigObject.environmentKey).toBe(datafile.environmentKey);
  });

  it('should return serialized audiences', () => {
    const audiencesById = projectTypedAudienceConfigObject.audiencesById;
    const audienceConditions = [
      ['or', '3468206642', '3988293898'],
      ['or', '3468206642', '3988293898', '3468206646'],
      ['not', '3468206642'],
      ['or', '3468206642'],
      ['and', '3468206642'],
      ['3468206642'],
      ['3468206642', '3988293898'],
      ['and', ['or', '3468206642', '3988293898'], '3468206646'],
      [
        'and',
        ['or', '3468206642', ['and', '3988293898', '3468206646']],
        ['and', '3988293899', ['or', '3468206647', '3468206643']],
      ],
      ['and', 'and'],
      ['not', ['and', '3468206642', '3988293898']],
      [],
      ['or', '3468206642', '999999999'],
    ];

    const expectedAudienceOutputs = [
      '"exactString" OR "substringString"',
      '"exactString" OR "substringString" OR "exactNumber"',
      'NOT "exactString"',
      '"exactString"',
      '"exactString"',
      '"exactString"',
      '"exactString" OR "substringString"',
      '("exactString" OR "substringString") AND "exactNumber"',
      '("exactString" OR ("substringString" AND "exactNumber")) AND ("exists" AND ("gtNumber" OR "exactBoolean"))',
      '',
      'NOT ("exactString" AND "substringString")',
      '',
      '"exactString" OR "999999999"',
    ];

    for (let testNo = 0; testNo < audienceConditions.length; testNo++) {
      const serializedAudiences = OptimizelyConfig.getSerializedAudiences(
        audienceConditions[testNo] as string[],
        audiencesById
      );

      expect(serializedAudiences).toBe(expectedAudienceOutputs[testNo]);
    }
  });

  it('should return correct rollouts', () => {
    const rolloutFlag1 = optimizelySimilarRuleKeyConfigObject.featuresMap['flag_1'].deliveryRules[0];
    const rolloutFlag2 = optimizelySimilarRuleKeyConfigObject.featuresMap['flag_2'].deliveryRules[0];
    const rolloutFlag3 = optimizelySimilarRuleKeyConfigObject.featuresMap['flag_3'].deliveryRules[0];

    expect(rolloutFlag1.id).toBe('9300000004977');
    expect(rolloutFlag1.key).toBe('targeted_delivery');
    expect(rolloutFlag2.id).toBe('9300000004979');
    expect(rolloutFlag2.key).toBe('targeted_delivery');
    expect(rolloutFlag3.id).toBe('9300000004981');
    expect(rolloutFlag3.key).toBe('targeted_delivery');
  });

  it('should return default SDK and environment key', () => {
    expect(optimizelySimilarRuleKeyConfigObject.sdkKey).toBe('');
    expect(optimizelySimilarRuleKeyConfigObject.environmentKey).toBe('');
  });

  it('should return correct experiments with similar keys', function() {
    expect(Object.keys(optimizelySimilarExperimentkeyConfigObject.experimentsMap).length).toBe(1);

    const experimentMapFlag1 = optimizelySimilarExperimentkeyConfigObject.featuresMap['flag1'].experimentsMap;
    const experimentMapFlag2 = optimizelySimilarExperimentkeyConfigObject.featuresMap['flag2'].experimentsMap;

    expect(experimentMapFlag1['targeted_delivery'].id).toBe('9300000007569');
    expect(experimentMapFlag2['targeted_delivery'].id).toBe('9300000007573');
  });
});
