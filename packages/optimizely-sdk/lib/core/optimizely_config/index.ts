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
import { isFeatureExperiment } from '../project_config';
import {
  ExperimentsMap,
  FeaturesMap,
  VariablesMap,
  FeatureFlag,
  Experiment,
  FeatureVariable,
  VariationVariable,
  Variation,
} from '../../shared_types';

interface OptimizelyConfigOptions {
  projectId: string;
  revision: string;
  rollouts: Rollout[];
  featureFlags: FeatureFlag[];
  experiments: Experiment[];
  experimentIdMap: { [id: string]: Experiment };
  experimentFeatureMap: { [key: string]: string[] };
  experimentKeyMap: { [key: string]: Experiment };
  featureKeyMap: { [key: string]: FeatureFlag };
}

interface ExperimentIds {
  [key: string]: boolean;
}

interface Rollout {
  id: string;
  experiments: Experiment[];
}

interface FeatureVariablesMap {
  [key: string]: FeatureVariable[];
}

interface VariationVariableMap {
  [key: string]: VariationVariable;
}

interface VariationMap {
  [key: string]: Variation;
}


/**
 * The OptimizelyConfig class
 * @param {OptimizelyConfigOptions} configObj
 * @param {string} datafile
 */
export default class OptimizelyConfig {
  private experimentsMap: ExperimentsMap;
  private featuresMap: FeaturesMap;
  private revision: string;
  private datafile: string;

  constructor(configObj: OptimizelyConfigOptions, datafile: string) {
    this.experimentsMap = this.getExperimentsMap(configObj);
    this.featuresMap = this.getFeaturesMap(configObj, this.experimentsMap);
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
   * @returns     {ExperimentIds}               Experiment Ids which are part of rollout
   */
  private getRolloutExperimentIds(rollouts: Rollout[]): ExperimentIds {
    return (rollouts || []).reduce((experimentIds: ExperimentIds, rollout) => {
      rollout.experiments.forEach((e) => {
        (experimentIds)[e.id] = true;
      });

      return experimentIds;
    }, {});
  }

  /**
   * Gets Map of all experiments except rollouts
   * @param       {OptimizelyConfigOptions}    configObj
   * @returns     {ExperimentsMap}             Map of experiments excluding rollouts
   */
  private getExperimentsMap(configObj: OptimizelyConfigOptions): ExperimentsMap {
    const rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);
    const featureVariablesMap = (configObj.featureFlags || []).reduce(
      (resultMap: FeatureVariablesMap, feature) => {
        resultMap[feature.id] = feature.variables;
        return resultMap;
      },
      {},
    );

    return (configObj.experiments || []).reduce(
      (experiments: ExperimentsMap, experiment) => {
        // skip experiments that are part of a rollout
        if (!rolloutExperimentIds[experiment.id]) {
          experiments[experiment.key] = {
            id: experiment.id,
            key: experiment.key,
            variationsMap: (experiment.variations || []).reduce(
              (variations: VariationMap, variation) => {
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
   * Merges feature key and type from feature variables to variation variables
   * @param       {OptimizelyConfigOptions}    configObj
   * @param       {Variation}                  variation
   * @param       {string}                     experimentId
   * @param       {FeatureVariablesMap}        featureVariablesMap
   * @returns     {VariablesMap}               Map of variables
   */
  private getMergedVariablesMap(
    configObj: OptimizelyConfigOptions,
    variation: Variation,
    experimentId: string,
    featureVariablesMap: FeatureVariablesMap,
  ): VariablesMap {
    const featureId = configObj.experimentFeatureMap[experimentId];

    let variablesObject = {};
    if (featureId) {
      // TODO: temporary solution. featureId is an array of feature Ids and is not a string.
      const experimentFeatureVariables = featureVariablesMap[featureId[0]];
      // Temporary variation variables map to get values to merge.
      const tempVariablesIdMap = (variation.variables || []).reduce(
        (variablesMap: VariationVariableMap, variable) => {
          variablesMap[variable.id] = {
            id: variable.id,
            value: variable.value,
          };

          return variablesMap;
        },
        {},
      );
      variablesObject = (experimentFeatureVariables || []).reduce(
        (variablesMap: VariablesMap, featureVariable) => {
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
        }, {}
      );
    }

    return variablesObject;
  }

  /**
   * Gets map of all experiments
   * @param       {OptimizelyConfigOptions}    configObj
   * @param       {ExperimentsMap}             allExperiments
   * @returns     {FeaturesMap}                Map of all experiments
   */
  private getFeaturesMap(
    configObj: OptimizelyConfigOptions,
    allExperiments: ExperimentsMap
  ): FeaturesMap {
    return (configObj.featureFlags || []).reduce((features: FeaturesMap, feature) => {
      features[feature.key] = {
        id: feature.id,
        key: feature.key,
        experimentsMap: (feature.experimentIds || []).reduce(
          (experiments: ExperimentsMap, experimentId) => {
            const experimentKey = configObj.experimentIdMap[experimentId].key;
            experiments[experimentKey] = allExperiments[experimentKey];
            return experiments;
          },
          {}
        ),
        variablesMap: (feature.variables || []).reduce(
          (variables: VariablesMap, variable) => {
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
