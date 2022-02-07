/**
 * Copyright 2020-2021, Optimizely
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
import { ProjectConfig } from '../project_config';
import { DEFAULT_OPERATOR_TYPES } from '../condition_tree_evaluator';
import {
  Audience,
  Experiment,
  FeatureVariable,
  OptimizelyAttribute,
  OptimizelyAudience,
  OptimizelyEvent,
  OptimizelyExperiment,
  OptimizelyExperimentsMap,
  OptimizelyFeaturesMap,
  OptimizelyVariable,
  OptimizelyVariablesMap,
  OptimizelyVariation,
  Rollout,
  Variation,
  VariationVariable,
} from '../../shared_types';

interface FeatureVariablesMap {
  [key: string]: FeatureVariable[];
}

/**
 * The OptimizelyConfig class
 * @param {ProjectConfig} configObj
 * @param {string}        datafile
 */
export class OptimizelyConfig {
  public environmentKey: string;
  public sdkKey: string;
  public revision: string;

  /**
   * This experimentsMap is for experiments of legacy projects only.
   * For flag projects, experiment keys are not guaranteed to be unique
   * across multiple flags, so this map may not include all experiments
   * when keys conflict.
   */
  public experimentsMap: OptimizelyExperimentsMap;

  public featuresMap: OptimizelyFeaturesMap;
  public attributes: OptimizelyAttribute[];
  public audiences: OptimizelyAudience[];
  public events: OptimizelyEvent[];
  private datafile: string;

  constructor(configObj: ProjectConfig, datafile: string) {
    this.sdkKey = configObj.sdkKey ?? '';
    this.environmentKey = configObj.environmentKey ?? '';
    this.attributes = configObj.attributes;
    this.audiences = OptimizelyConfig.getAudiences(configObj);
    this.events = configObj.events;
    this.revision = configObj.revision;

    const featureIdVariablesMap = (configObj.featureFlags || []).reduce((resultMap: FeatureVariablesMap, feature) => {
      resultMap[feature.id] = feature.variables;
      return resultMap;
    }, {});

    const experimentsMapById = OptimizelyConfig.getExperimentsMapById(configObj, featureIdVariablesMap);
    this.experimentsMap = OptimizelyConfig.getExperimentsKeyMap(experimentsMapById);
    this.featuresMap = OptimizelyConfig.getFeaturesMap(configObj, featureIdVariablesMap, experimentsMapById);
    this.datafile = datafile;
  }

  /**
   * Get the datafile
   * @returns {string} JSON string representation of the datafile that was used to create the current config object
   */
  getDatafile(): string {
    return this.datafile;
  }

  /**
   * Get Unique audiences list with typedAudiences as priority
   * @param       {ProjectConfig}              configObj
   * @returns     {OptimizelyAudience[]}       Array of unique audiences
   */
  static getAudiences(configObj: ProjectConfig): OptimizelyAudience[] {
    const audiences: OptimizelyAudience[] = [];
    const typedAudienceIds: string[] = [];

    (configObj.typedAudiences || []).forEach((typedAudience) => {
      audiences.push({
        id: typedAudience.id,
        conditions: JSON.stringify(typedAudience.conditions),
        name: typedAudience.name,
      });
      typedAudienceIds.push(typedAudience.id);
    });

    (configObj.audiences || []).forEach((audience) => {
      if (typedAudienceIds.indexOf(audience.id) === -1 && audience.id != '$opt_dummy_audience') {
        audiences.push({
          id: audience.id,
          conditions: JSON.stringify(audience.conditions),
          name: audience.name,
        });
      }
    });

    return audiences;
  }

  /**
   * Converts list of audience conditions to serialized audiences used in experiment
   * for examples:
   * 1. Input: ["or", "1", "2"]
   * Output: "\"us\" OR \"female\""
   * 2. Input: ["not", "1"]
   * Output: "NOT \"us\""
   * 3. Input: ["or", "1"]
   * Output: "\"us\""
   * 4. Input: ["and", ["or", "1", ["and", "2", "3"]], ["and", "11", ["or", "12", "13"]]]
   * Output: "(\"us\" OR (\"female\" AND \"adult\")) AND (\"fr\" AND (\"male\" OR \"kid\"))"
   * @param       {Array<string | string[]>}                 conditions
   * @param       {[id: string]: Audience}                   audiencesById
   * @returns     {string}                                   Serialized audiences condition string
   */
  static getSerializedAudiences(
    conditions: Array<string | string[]>,
    audiencesById: { [id: string]: Audience }
  ): string {
    let serializedAudience = '';

    if (conditions) {
      let cond = '';
      conditions.forEach((item) => {
        let subAudience = '';
        // Checks if item is list of conditions means it is sub audience
        if (item instanceof Array) {
          subAudience = OptimizelyConfig.getSerializedAudiences(item, audiencesById);
          subAudience = `(${subAudience})`;
        } else if (DEFAULT_OPERATOR_TYPES.indexOf(item) > -1) {
          cond = item.toUpperCase();
        } else {
          // Checks if item is audience id
          const audienceName = audiencesById[item] ? audiencesById[item].name : item;
          // if audience condition is "NOT" then add "NOT" at start. Otherwise check if there is already audience id in serializedAudience then append condition between serializedAudience and item
          if (serializedAudience || cond === 'NOT') {
            cond = cond === '' ? 'OR' : cond;
            if (serializedAudience === '') {
              serializedAudience = `${cond} "${audiencesById[item].name}"`;
            } else {
              serializedAudience = serializedAudience.concat(` ${cond} "${audienceName}"`);
            }
          } else {
            serializedAudience = `"${audienceName}"`;
          }
        }
        // Checks if sub audience is empty or not
        if (subAudience !== '') {
          if (serializedAudience !== '' || cond === 'NOT') {
            cond = cond === '' ? 'OR' : cond;
            if (serializedAudience === '') {
              serializedAudience = `${cond} ${subAudience}`;
            } else {
              serializedAudience = serializedAudience.concat(` ${cond} ${subAudience}`);
            }
          } else {
            serializedAudience = serializedAudience.concat(subAudience);
          }
        }
      });
    }
    return serializedAudience;
  }

  /**
   * Get serialized audience condition string for experiment
   * @param       {Experiment}                 experiment
   * @param       {ProjectConfig}              configObj
   * @returns     {string}                     Serialized audiences condition string
   */
  static getExperimentAudiences(experiment: Experiment, configObj: ProjectConfig): string {
    if (!experiment.audienceConditions) {
      return '';
    }
    return OptimizelyConfig.getSerializedAudiences(experiment.audienceConditions, configObj.audiencesById);
  }

  /**
   * Make map of featureVariable which are associated with given feature experiment
   * @param       {FeatureVariablesMap}                 featureIdVariableMap
   * @param       {[id: string]: FeatureVariable}       variableIdMap
   * @param       {string}                              featureId
   * @param       {VariationVariable[] | undefined}     featureVariableUsages
   * @param       {boolean | undefined}                 isFeatureEnabled
   * @returns     {OptimizelyVariablesMap}              FeatureVariables mapped by key
   */
  static mergeFeatureVariables(
    featureIdVariableMap: FeatureVariablesMap,
    variableIdMap: { [id: string]: FeatureVariable },
    featureId: string,
    featureVariableUsages: VariationVariable[] | undefined,
    isFeatureEnabled: boolean | undefined
  ): OptimizelyVariablesMap {
    const variablesMap = (featureIdVariableMap[featureId] || []).reduce(
      (optlyVariablesMap: OptimizelyVariablesMap, featureVariable) => {
        optlyVariablesMap[featureVariable.key] = {
          id: featureVariable.id,
          key: featureVariable.key,
          type: featureVariable.type,
          value: featureVariable.defaultValue,
        };
        return optlyVariablesMap;
      },
      {}
    );

    (featureVariableUsages || []).forEach((featureVariableUsage) => {
      const defaultVariable = variableIdMap[featureVariableUsage.id];
      const optimizelyVariable: OptimizelyVariable = {
        id: featureVariableUsage.id,
        key: defaultVariable.key,
        type: defaultVariable.type,
        value: isFeatureEnabled ? featureVariableUsage.value : defaultVariable.defaultValue,
      };
      variablesMap[defaultVariable.key] = optimizelyVariable;
    });
    return variablesMap;
  }

  /**
   * Gets Map of all experiment variations and variables including rollouts
   * @param       {Variation[]}                           variations
   * @param       {FeatureVariablesMap}                   featureIdVariableMap
   * @param       {[id: string]: FeatureVariable}         variableIdMap
   * @param       {string}                                featureId
   * @returns     {[key: string]: Variation}              Variations mapped by key
   */
  static getVariationsMap(
    variations: Variation[],
    featureIdVariableMap: FeatureVariablesMap,
    variableIdMap: { [id: string]: FeatureVariable },
    featureId: string
  ): { [key: string]: Variation } {
    let variationsMap: { [key: string]: OptimizelyVariation } = {};
    variationsMap = variations.reduce((optlyVariationsMap: { [key: string]: OptimizelyVariation }, variation) => {
      const variablesMap = OptimizelyConfig.mergeFeatureVariables(
        featureIdVariableMap,
        variableIdMap,
        featureId,
        variation.variables,
        variation.featureEnabled
      );
      optlyVariationsMap[variation.key] = {
        id: variation.id,
        key: variation.key,
        featureEnabled: variation.featureEnabled,
        variablesMap: variablesMap,
      };
      return optlyVariationsMap;
    }, {});

    return variationsMap;
  }

  /**
   * Gets Map of FeatureVariable with respect to featureVariableId
   * @param       {ProjectConfig}                        configObj
   * @returns     {[id: string]: FeatureVariable}        FeatureVariables mapped by id
   */
  static getVariableIdMap(configObj: ProjectConfig): { [id: string]: FeatureVariable } {
    let variablesIdMap: { [id: string]: FeatureVariable } = {};
    variablesIdMap = (configObj.featureFlags || []).reduce((resultMap: { [id: string]: FeatureVariable }, feature) => {
      feature.variables.forEach((variable) => {
        resultMap[variable.id] = variable;
      });
      return resultMap;
    }, {});

    return variablesIdMap;
  }

  /**
   * Gets list of rollout experiments
   * @param       {ProjectConfig}               configObj
   * @param       {FeatureVariablesMap}         featureVariableIdMap
   * @param       {string}                      featureId
   * @param       {Experiment[]}                experiments
   * @returns     {OptimizelyExperiment[]}      List of Optimizely rollout experiments
   */
  static getDeliveryRules(
    configObj: ProjectConfig,
    featureVariableIdMap: FeatureVariablesMap,
    featureId: string,
    experiments: Experiment[]
  ): OptimizelyExperiment[] {
    const variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);
    return experiments.map((experiment) => {
      return {
        id: experiment.id,
        key: experiment.key,
        audiences: OptimizelyConfig.getExperimentAudiences(experiment, configObj),
        variationsMap: OptimizelyConfig.getVariationsMap(
          experiment.variations,
          featureVariableIdMap,
          variableIdMap,
          featureId
        ),
      };
    });
  }

  /**
   * Get Experiment Ids which are part of rollout
   * @param       {Rollout[]}     rollouts
   * @returns     {string[]}      Array of experiment Ids
   */
  static getRolloutExperimentIds(rollouts: Rollout[]): string[] {
    const experimentIds: string[] = [];
    (rollouts || []).forEach((rollout) => {
      rollout.experiments.forEach((e) => {
        experimentIds.push(e.id);
      });
    });
    return experimentIds;
  }

  /**
   * Get experiments mapped by their id's which are not part of a rollout
   * @param       {ProjectConfig}                           configObj
   * @param       {FeatureVariablesMap}                     featureIdVariableMap
   * @returns     {[id: string]: OptimizelyExperiment}      Experiments mapped by id
   */
  static getExperimentsMapById(
    configObj: ProjectConfig,
    featureIdVariableMap: FeatureVariablesMap
  ): { [id: string]: OptimizelyExperiment } {
    const variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);
    const rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);

    const experiments = configObj.experiments;

    return (experiments || []).reduce((experimentsMap: { [id: string]: OptimizelyExperiment }, experiment) => {
      if (rolloutExperimentIds.indexOf(experiment.id) === -1) {
        const featureIds = configObj.experimentFeatureMap[experiment.id];
        let featureId = '';
        if (featureIds && featureIds.length > 0) {
          featureId = featureIds[0];
        }
        const variationsMap = OptimizelyConfig.getVariationsMap(
          experiment.variations,
          featureIdVariableMap,
          variableIdMap,
          featureId.toString()
        );
        experimentsMap[experiment.id] = {
          id: experiment.id,
          key: experiment.key,
          audiences: OptimizelyConfig.getExperimentAudiences(experiment, configObj),
          variationsMap: variationsMap,
        };
      }
      return experimentsMap;
    }, {});
  }

  /**
   * Get experiments mapped by their keys
   * @param       {OptimizelyExperimentsMap}     experimentsMapById
   * @returns     {OptimizelyExperimentsMap}     Experiments mapped by key
   */
  static getExperimentsKeyMap(experimentsMapById: OptimizelyExperimentsMap): OptimizelyExperimentsMap {
    const experimentKeysMap: OptimizelyExperimentsMap = {};

    for (const id in experimentsMapById) {
      const experiment = experimentsMapById[id];
      experimentKeysMap[experiment.key] = experiment;
    }
    return experimentKeysMap;
  }

  /**
   * Gets Map of all FeatureFlags and associated experiment map inside it
   * @param       {ProjectConfig}              configObj
   * @param       {FeatureVariablesMap}        featureVariableIdMap
   * @param       {OptimizelyExperimentsMap}   experimentsMapById
   * @returns     {OptimizelyFeaturesMap}      OptimizelyFeature mapped by key
   */
  static getFeaturesMap(
    configObj: ProjectConfig,
    featureVariableIdMap: FeatureVariablesMap,
    experimentsMapById: OptimizelyExperimentsMap
  ): OptimizelyFeaturesMap {
    const featuresMap: OptimizelyFeaturesMap = {};
    configObj.featureFlags.forEach((featureFlag) => {
      const featureExperimentMap: OptimizelyExperimentsMap = {};
      const experimentRules: OptimizelyExperiment[] = [];
      featureFlag.experimentIds.forEach(experimentId => {
        const experiment = experimentsMapById[experimentId];
        if (experiment) {
          featureExperimentMap[experiment.key] = experiment;
        }
        experimentRules.push(experimentsMapById[experimentId]);
      });
      const featureVariableMap = (featureFlag.variables || []).reduce((variables: OptimizelyVariablesMap, variable) => {
        variables[variable.key] = {
          id: variable.id,
          key: variable.key,
          type: variable.type,
          value: variable.defaultValue,
        };
        return variables;
      }, {});
      let deliveryRules: OptimizelyExperiment[] = [];
      const rollout = configObj.rolloutIdMap[featureFlag.rolloutId];
      if (rollout) {
        deliveryRules = OptimizelyConfig.getDeliveryRules(
          configObj,
          featureVariableIdMap,
          featureFlag.id,
          rollout.experiments
        );
      }
      featuresMap[featureFlag.key] = {
        id: featureFlag.id,
        key: featureFlag.key,
        experimentRules: experimentRules,
        deliveryRules: deliveryRules,
        experimentsMap: featureExperimentMap,
        variablesMap: featureVariableMap,
      };
    });
    return featuresMap;
  }
}

/**
 * Create an instance of OptimizelyConfig
 * @param   {ProjectConfig}             configObj
 * @param   {string}                    datafile
 * @returns {OptimizelyConfig}          An instance of OptimizelyConfig
 */
export function createOptimizelyConfig(configObj: ProjectConfig, datafile: string): OptimizelyConfig {
  return new OptimizelyConfig(configObj, datafile);
}
