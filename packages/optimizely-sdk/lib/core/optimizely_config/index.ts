/**
 * Copyright 2020, Optimizely
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
import { isFeatureExperiment, ProjectConfig } from '../project_config';
import {
  OptimizelyExperimentsMap,
  OptimizelyFeaturesMap,
  OptimizelyVariablesMap,
  FeatureVariable,
  VariationVariable,
  Variation,
  Rollout,
  OptimizelyAttribute,
  OptimizelyAudience,
  OptimizelyEvents
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
  public experimentsMap: OptimizelyExperimentsMap;
  public featuresMap: OptimizelyFeaturesMap;
  public revision: string;
  public sdkKey?: string;
  public attributes: OptimizelyAttribute[];
  public audiences: OptimizelyAudience[];
  public events: OptimizelyEvents[];
  public environmentKey?: string;
  private datafile: string;

  constructor(configObj: ProjectConfig, datafile: string) {
    this.revision = configObj.revision;
    this.attributes = configObj.attributes;
    this.audiences = [];
    this.events = configObj.events;
    this.datafile = datafile;
    const audiences = configObj.typedAudiences || [];

    configObj.audiences.forEach((oldAudience) => {
      if (
        audiences.filter((newAudience) => {
          newAudience == oldAudience;
        }).length == 0
      ) {
        if (oldAudience.id != '$opt_dummy_audience') {
          audiences.push(oldAudience);
        }
      }
    });

    this.audiences = audiences;
    const audienceMap: { [key: string]: string } = {};

    for (const audience of this.audiences) {
      audienceMap[audience.id] = audience.name;
    }
    const updatedExperiments = OptimizelyConfig.getExperimentsMap(configObj);

    Object.keys(updatedExperiments).map(function (key) {
      const audiencesSerialized = serializeAudiences(configObj, key, audienceMap);
      if (audiencesSerialized) {
        updatedExperiments[key].audiences = audiencesSerialized;
      }
    });
    const updatedRollouts = OptimizelyConfig.updateRollouts(configObj, audienceMap);

    this.experimentsMap = updatedExperiments;
    this.featuresMap = OptimizelyConfig.getFeaturesMap(configObj, updatedExperiments, updatedRollouts);
    console.log("FEATURES MAP:", this.featuresMap)
    if (configObj.sdkKey && configObj.environmentKey) {
      this.sdkKey = configObj.sdkKey;
      this.environmentKey = configObj.environmentKey;
    }
  }

  /**
   * Get the datafile
   * @returns {string} JSON string representation of the datafile that was used to create the current config object
   */
  getDatafile(): string {
    return this.datafile;
  }

  /**
   * Get Experiment Ids which are part of rollout
   * @param       {Rollout[]}                  rollouts
   * @returns     {[key: string]: boolean}     Map of experiment Ids to boolean
   */
  static getRolloutExperimentIds(rollouts: Rollout[]): { [key: string]: boolean } {
    return (rollouts || []).reduce((experimentIds: { [key: string]: boolean }, rollout) => {
      rollout.experiments.forEach((e) => {
        experimentIds[e.id] = true;
      });

      return experimentIds;
    }, {});
  }

  /**
   * Update rollouts by adding audiences keys in experiments
   * @param       {ProjectConfig}              configObj
   * @returns     {audienceMap}   Map of audiences
   */
  static updateRollouts(configObj: ProjectConfig, audienceMap: { [key: string]: string }): Rollout[] {
    return configObj.rollouts.map((rollout) => {
      rollout.experiments = rollout.experiments.map((experiment) => {
        const audiences = serializeAudiences(configObj, experiment.key, audienceMap);
        if (audiences) {
          experiment.audiences = audiences;
        }
        return experiment;
      });
      return rollout;
    });
  }

  /**
   * Get Map of all experiments except rollouts
   * @param       {ProjectConfig}              configObj
   * @returns     {OptimizelyExperimentsMap}   Map of experiments excluding rollouts
   */
  static getExperimentsMap(configObj: ProjectConfig): OptimizelyExperimentsMap {
    const rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);
    const featureVariablesMap = (configObj.featureFlags || []).reduce((resultMap: FeatureVariablesMap, feature) => {
      resultMap[feature.id] = feature.variables;
      return resultMap;
    }, {});

    return (configObj.experiments || []).reduce((experiments: OptimizelyExperimentsMap, experiment) => {
      // skip experiments that are part of a rollout
      if (!rolloutExperimentIds[experiment.id]) {
        experiments[experiment.key] = {
          id: experiment.id,
          key: experiment.key,
          variationsMap: (experiment.variations || []).reduce((variations: { [key: string]: Variation }, variation) => {
            variations[variation.key] = {
              id: variation.id,
              key: variation.key,
              variablesMap: this.getMergedVariablesMap(configObj, variation, experiment.id, featureVariablesMap),
            };
            if (isFeatureExperiment(configObj, experiment.id)) {
              variations[variation.key].featureEnabled = variation.featureEnabled;
            }

            return variations;
          }, {}),
          audiences: experiment.audiences,
        };
      }

      return experiments;
    }, {});
  }

  /**
   * Merge feature key and type from feature variables to variation variables
   * @param       {ProjectConfig}              configObj
   * @param       {Variation}                  variation
   * @param       {string}                     experimentId
   * @param       {FeatureVariablesMap}        featureVariablesMap
   * @returns     {OptimizelyVariablesMap}     Map of variables
   */
  static getMergedVariablesMap(
    configObj: ProjectConfig,
    variation: Variation,
    experimentId: string,
    featureVariablesMap: FeatureVariablesMap
  ): OptimizelyVariablesMap {
    const featureId = configObj.experimentFeatureMap[experimentId];

    let variablesObject = {};
    if (featureId) {
      const experimentFeatureVariables = featureVariablesMap[featureId.toString()];
      // Temporary variation variables map to get values to merge.
      const tempVariablesIdMap = (variation.variables || []).reduce(
        (variablesMap: { [key: string]: VariationVariable }, variable) => {
          variablesMap[variable.id] = {
            id: variable.id,
            value: variable.value,
          };

          return variablesMap;
        },
        {}
      );
      variablesObject = (experimentFeatureVariables || []).reduce(
        (variablesMap: OptimizelyVariablesMap, featureVariable) => {
          const variationVariable = tempVariablesIdMap[featureVariable.id];
          const variableValue =
            variation.featureEnabled && variationVariable ? variationVariable.value : featureVariable.defaultValue;
          variablesMap[featureVariable.key] = {
            id: featureVariable.id,
            key: featureVariable.key,
            type: featureVariable.type,
            value: variableValue,
          };

          return variablesMap;
        },
        {}
      );
    }

    return variablesObject;
  }

  /**
   * Get map of all experiments
   * @param       {ProjectConfig}              configObj
   * @param       {OptimizelyExperimentsMap}   allExperiments
   * @returns     {OptimizelyFeaturesMap}      Map of all experiments
   */
  static getFeaturesMap(
    configObj: ProjectConfig,
    allExperiments: OptimizelyExperimentsMap,
    rollouts: Rollout[]
  ): OptimizelyFeaturesMap {
    return (configObj.featureFlags || []).reduce((features: OptimizelyFeaturesMap, feature) => {
      const filteredRollout = rollouts.filter((rollout) => {
        console.log("Rollout:", rollout.id, "Feature:", feature.id)
        return rollout.id == feature.id;
      })[0];
      console.log("FILTERED ROLLOUTS ", filteredRollout)
      features[feature.key] = {
        id: feature.id,
        key: feature.key,
        experimentsMap: (feature.experimentIds || []).reduce((experiments: OptimizelyExperimentsMap, experimentId) => {
          const experimentKey = configObj.experimentIdMap[experimentId].key;
          experiments[experimentKey] = allExperiments[experimentKey];
          return experiments;
        }, {}),
        variablesMap: (feature.variables || []).reduce((variables: OptimizelyVariablesMap, variable) => {
          variables[variable.key] = {
            id: variable.id,
            key: variable.key,
            type: variable.type,
            value: variable.defaultValue,
          };

          return variables;
        }, {}),
        deliveryRules: Object.values(allExperiments),
        experimentRules: filteredRollout
          ? filteredRollout.experiments.map((experiment) => {
              return {
                id: experiment.id,
                key: experiment.key,
                audiences: experiment.audiences,
                variationsMap: experiment.variationKeyMap,
              };
            })
          : [],
      };

      return features;
    }, {});
  }
}

/**
 * Serialize audienceConditions
 * @param       {Array<string | string[]>}    condition
 * @returns     {string}                      serialized audience condition
 */
function serialized(condition: Array<string | string[]>) {
  const operator = condition[0];
  let first = '';
  let second = '';
  if (condition[1]) {
    first = Array.isArray(condition[1]) ? `(${serialized(condition[1])})` : `AUDIENCE(${condition[1]})`;
  }
  if (condition[2]) {
    second = Array.isArray(condition[2]) ? `(${serialized(condition[2])})` : `AUDIENCE(${condition[2]})`;
  }
  if (condition[1] && condition[2]) {
    return `${first} ${operator.toString().toUpperCase()} ${second}`;
  } else {
    return `${operator.toString().toUpperCase()} ${first}`;
  }
}

/**
 * replace audience ids with name
 * @param       {string}                      condition
 * @param       {{[key: string]: string}}     audiences
 * @returns     {string}                      Updated serialized audienceCondition
 */
function replaceAudienceIdsWithNames(condition: string, audiences: {[key: string]: string}) {
  const beginWord = "AUDIENCE(";
  const endWord = ")";
  let keyIdx = 0;
  let audienceId = "";
  let collect = false;

  let replaced = "";
  for (const ch of condition) {
    if (collect) {
      if (ch == endWord) {
        replaced += `"${audiences[audienceId] || audienceId}"`;
        collect = false;
        audienceId = "";
      }
      else {
        audienceId += ch;
      }
      continue;
    }

    if (ch == beginWord[keyIdx]) {
      keyIdx += 1;
      if (keyIdx == beginWord.length) {
        keyIdx = 0;
        collect = true;
      }
      continue;
    }
    else {
      if (keyIdx > 0) {
        replaced += beginWord.substring(0, keyIdx);
      }
      keyIdx = 0;
    }

    replaced += ch;
  }

  return replaced;
}

/**
 * Return serialized audienceCondtion with replaced audienceIds with names
 * @param       {Array<string | string[]>}    condition
 * @returns     {string}                      serialized audience condition
 */
function serializeAudiences(configObj: ProjectConfig, experimentKey: string, audienceMap: { [key: string]: string }) {
  const experiment = configObj.experimentKeyMap[experimentKey];
  if (experiment.audienceConditions) {
    const condition = serialized(experiment.audienceConditions);
    return replaceAudienceIdsWithNames(condition, audienceMap);
  }
  return '';
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
