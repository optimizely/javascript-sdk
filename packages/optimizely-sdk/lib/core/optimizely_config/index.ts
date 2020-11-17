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

/**
 * The OptimizelyConfig class
 * @param {Object} configObj
 * @param {string} datafile
 */
export default class OptimizelyConfig {
  private experimentsMap: any;
  private featuresMap: any;
  private revision: any;
  private datafile: any;

  constructor(configObj: any, datafile: any) {
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

  // Get Experiment Ids which are part of rollouts
  private getRolloutExperimentIds(rollouts: any): any {
    return (rollouts || []).reduce((experimentIds: any, rollout: any) => {
      rollout.experiments.forEach((e: any) => {
        experimentIds[e.id] = true;
      });

      return experimentIds;
    }, {});
  }

  // Gets Map of all experiments except rollouts
  private getExperimentsMap(configObj: any): any {
    const rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);
    const featureVariablesMap = (configObj.featureFlags || []).reduce((resultMap: any, feature: any) => {
      resultMap[feature.id] = feature.variables;
      return resultMap;
    }, {});

    return (configObj.experiments || []).reduce(
      (experiments: any, experiment: any) => {
        // skip experiments that are part of a rollout
        if (!rolloutExperimentIds[experiment.id]) {
          experiments[experiment.key] = {
            id: experiment.id,
            key: experiment.key,
            variationsMap: (experiment.variations || []).reduce(
              (variations: any, variation: any) => {
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
              {}
            ),
          };
        }

        return experiments;
      }, {}
    )
  }
  // Merges feature key and type from feature variables to variation variables.
  private getMergedVariablesMap(
    configObj: any,
    variation: any,
    experimentId: any,
    featureVariablesMap: any
  ): any {
    const featureId = configObj.experimentFeatureMap[experimentId];

    let variablesObject = {};
    if (featureId) {
      const experimentFeatureVariables = featureVariablesMap[featureId];
      // Temporary variation variables map to get values to merge.
      const tempVariablesIdMap = (variation.variables || []).reduce(
        (variablesMap: any, variable: any) => {
          variablesMap[variable.id] = {
            id: variable.id,
            value: variable.value,
          };

          return variablesMap;
        }, {}
      );
      variablesObject = (experimentFeatureVariables || []).reduce(
        (variablesMap: any, featureVariable: any) => {
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

  // Gets map of all experiments
  private getFeaturesMap(configObj: any, allExperiments: any): any {
    return (configObj.featureFlags || []).reduce((features: any, feature: any) => {
      features[feature.key] = {
        id: feature.id,
        key: feature.key,
        experimentsMap: (feature.experimentIds || []).reduce(
          (experiments: any, experimentId: any) => {
            const experimentKey = configObj.experimentIdMap[experimentId].key;
            experiments[experimentKey] = allExperiments[experimentKey];
            return experiments;
          },
          {}
        ),
        variablesMap: (feature.variables || []).reduce((variables: any, variable: any) => {
          variables[variable.key] = {
            id: variable.id,
            key: variable.key,
            type: variable.type,
            value: variable.defaultValue,
          };

          return variables;
        }, {}),
      };

      return features;
    }, {});
  }
}
