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
  private datafile: string;

  constructor(configObj: ProjectConfig, datafile: string) {
    this.experimentsMap = OptimizelyConfig.getExperimentsMap(configObj);
    this.featuresMap = OptimizelyConfig.getFeaturesMap(configObj, this.experimentsMap);
    this.revision = configObj.revision;
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
   * Get Experiment Ids which are part of rollout
   * @param       {Rollout[]}                  rollouts
   * @returns     {[key: string]: boolean}     Map of experiment Ids to boolean
   */
  static getRolloutExperimentIds(rollouts: Rollout[]): { [key: string]: boolean } {
    return (rollouts || []).reduce((experimentIds: { [key: string]: boolean }, rollout) => {
      rollout.experiments.forEach((e) => {
        (experimentIds)[e.id] = true;
      });

      return experimentIds;
    }, {});
  }

  /**
   * Get Map of all experiments except rollouts
   * @param       {ProjectConfig}              configObj
   * @returns     {OptimizelyExperimentsMap}   Map of experiments excluding rollouts
   */
  static getExperimentsMap(configObj: ProjectConfig): OptimizelyExperimentsMap {
    const rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);
    const featureVariablesMap = (configObj.featureFlags || []).reduce(
      (resultMap: FeatureVariablesMap, feature) => {
        resultMap[feature.id] = feature.variables;
        return resultMap;
      },
      {},
    );

    return (configObj.experiments || []).reduce(
      (experiments: OptimizelyExperimentsMap, experiment) => {
        // skip experiments that are part of a rollout
        if (!rolloutExperimentIds[experiment.id]) {
          experiments[experiment.key] = {
            id: experiment.id,
            key: experiment.key,
            variationsMap: (experiment.variations || []).reduce(
              (variations: { [key: string]: Variation }, variation) => {
                variations[variation.key] = {
                  id: variation.id,
                  key: variation.key,
                  variablesMap: this.getMergedVariablesMap(configObj, variation, experiment.id, featureVariablesMap),
                };
                if (isFeatureExperiment(configObj, experiment.id)) {
                  variations[variation.key].featureEnabled = variation.featureEnabled;
                }

                return variations;
              },
              {},
            ),
          };
        }

        return experiments;
      },
      {},
    )
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
    featureVariablesMap: FeatureVariablesMap,
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
        {},
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
        {},
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
    allExperiments: OptimizelyExperimentsMap
  ): OptimizelyFeaturesMap {
    return (configObj.featureFlags || []).reduce((features: OptimizelyFeaturesMap, feature) => {
      features[feature.key] = {
        id: feature.id,
        key: feature.key,
        experimentsMap: (feature.experimentIds || []).reduce(
          (experiments: OptimizelyExperimentsMap, experimentId) => {
            const experimentKey = configObj.experimentIdMap[experimentId].key;
            experiments[experimentKey] = allExperiments[experimentKey];
            return experiments;
          },
          {},
        ),
        variablesMap: (feature.variables || []).reduce(
          (variables: OptimizelyVariablesMap, variable) => {
            variables[variable.key] = {
              id: variable.id,
              key: variable.key,
              type: variable.type,
              value: variable.defaultValue,
            };

            return variables;
          },
          {},
        ),
      };

      return features;
    }, {});
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
