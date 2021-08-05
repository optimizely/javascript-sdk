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
  Experiment,
  OptimizelyAttribute,
  OptimizelyAudience,
  OptimizelyEvent,
  OptimizelyExperiment,
  OptimizelyVariable,
  OptimizelyVariation,
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
  public sdkKey: string;
  public environmentKey: string;
  public attributes: OptimizelyAttribute[];
  public audiences: OptimizelyAudience[];
  public events: OptimizelyEvent[];
  private datafile: string;

  constructor(configObj: ProjectConfig, datafile: string) {
    const featureIdVariablesMap = (configObj.featureFlags || []).reduce((resultMap: FeatureVariablesMap, feature) => {
      resultMap[feature.id] = feature.variables;
      return resultMap;
    }, {});
    const experimentsMapById = OptimizelyConfig.getExperimentsMapById(configObj, featureIdVariablesMap);
    this.experimentsMap = OptimizelyConfig.getExperimentsKeyMap(experimentsMapById);
    this.featuresMap = OptimizelyConfig.getFeaturesMap(featureIdVariablesMap, configObj, experimentsMapById);
    this.revision = configObj.revision;
    this.attributes = configObj.attributes;

    this.audiences = OptimizelyConfig.getAudiences(configObj);
    this.events = configObj.events;
    this.datafile = datafile;
    this.sdkKey = configObj.sdkKey ? configObj.sdkKey : '';
    this.environmentKey = configObj.environmentKey ? configObj.environmentKey : '';
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
    var finalAudiences: OptimizelyAudience[] = [];
    var typedAudiencesMap = new Map();

    (configObj.typedAudiences || []).forEach((typedAudience) => {
      finalAudiences.push(typedAudience);
      typedAudiencesMap.set(typedAudience.id, typedAudience);
    });

    (configObj.audiences || []).forEach((oldAudience) => {
      if (!typedAudiencesMap.has(oldAudience.id) && oldAudience.id != '$opt_dummy_audience') {
        finalAudiences.push(oldAudience);
      }
    });

    return finalAudiences;
  }

  static getExperimentAudiences(experiment: Experiment, configObj: ProjectConfig): string {
    if (!experiment.audienceConditions || experiment.audienceConditions.length === 0) {
      return '';
    }
    return '';
  }

  static GetSerializedAudiences(experiment: Experiment, configObj: ProjectConfig): string {
    if (!experiment.audienceConditions || experiment.audienceConditions.length === 0) {
      return '';
    }
    return '';
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

  static getExperimentsKeyMap(experimentsMapById: OptimizelyExperimentsMap): OptimizelyExperimentsMap {
    var experimentKeyMaps: OptimizelyExperimentsMap = {};

    for (let key in experimentsMapById) {
      let experiment = experimentsMapById[key];
      experimentKeyMaps[experiment.key] = experiment;
    }
    return experimentKeyMaps;
  }

  static getExperimentsMapById(
    configObj: ProjectConfig,
    featureIdVariableMap: FeatureVariablesMap
  ): OptimizelyExperimentsMap {
    var experimentsMap: OptimizelyExperimentsMap = {};
    const variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);
    const rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);

    const experiments = configObj.experiments;
    configObj.groups.forEach((group) => {
      experiments.concat(group.experiments);
    });

    experiments.forEach((experiment) => {
      if (!rolloutExperimentIds[experiment.id]) {
        var featureIds = configObj.experimentFeatureMap[experiment.id];
        var featureId = '';
        if (featureIds && featureIds.length > 0) {
          featureId = featureIds[0];
        }
        const variationsMap = OptimizelyConfig.GetVariationsMap(
          experiment.variations,
          featureIdVariableMap,
          variableIdMap,
          featureId.toString()
        );

        // TODO: fix audiences here
        experimentsMap[experiment.id] = {
          id: experiment.id,
          key: experiment.key,
          variationsMap: variationsMap,
          audiences: '',
        };
      }
    });
    return experimentsMap;
  }

  static GetVariationsMap(
    variations: Variation[],
    featureIdVariableMap: FeatureVariablesMap,
    variableIdMap: { [id: string]: FeatureVariable },
    featureId: string
  ): { [key: string]: Variation } {
    var variationsMap: { [key: string]: OptimizelyVariation } = {};
    variations.forEach((variation) => {
      const variablesMap = OptimizelyConfig.mergeFeatureVariables(
        featureIdVariableMap,
        variableIdMap,
        featureId,
        variation.variables,
        variation.featureEnabled
      );
      variationsMap[variation.key] = {
        id: variation.id,
        key: variation.key,
        featureEnabled: variation.featureEnabled,
        variablesMap: variablesMap,
      };
    });
    return variationsMap;
  }

  static mergeFeatureVariables(
    featureIdVariableMap: FeatureVariablesMap,
    variableIdMap: { [id: string]: FeatureVariable },
    featureId: string,
    featureVariableUsages: VariationVariable[] | undefined,
    isFeatureEnabled: boolean | undefined
  ): OptimizelyVariablesMap {
    var variablesMap: OptimizelyVariablesMap = {};
    if (!featureId) {
      return variablesMap;
    }

    variablesMap = (featureIdVariableMap[featureId] || []).reduce(
      (variablesMap: OptimizelyVariablesMap, featureVariable) => {
        variablesMap[featureVariable.key] = {
          id: featureVariable.id,
          key: featureVariable.key,
          type: featureVariable.type,
          value: featureVariable.defaultValue,
        };
        return variablesMap;
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

  static getVariableIdMap(configObj: ProjectConfig): { [id: string]: FeatureVariable } {
    var variablesIdMap: { [id: string]: FeatureVariable } = {};
    variablesIdMap = (configObj.featureFlags || []).reduce((resultMap: { [id: string]: FeatureVariable }, feature) => {
      feature.variables.forEach((variable) => {
        resultMap[variable.id] = variable;
      });
      return resultMap;
    }, {});

    return variablesIdMap;
  }

  static getDeliveryRules(
    featureVariableIdMap: FeatureVariablesMap,
    featureId: string,
    experiments: Experiment[] | undefined,
    configObj: ProjectConfig
  ): OptimizelyExperiment[] {
    var deliveryRules: OptimizelyExperiment[] = [];
    if (!experiments) {
      return deliveryRules;
    }

    const variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);

    // TODO: fix audiences here
    experiments.forEach((experiment) => {
      deliveryRules.push({
        id: experiment.id,
        key: experiment.key,
        audiences: '',
        variationsMap: OptimizelyConfig.GetVariationsMap(
          experiment.variations,
          featureVariableIdMap,
          variableIdMap,
          featureId
        ),
      });
    });
    return deliveryRules;
  }

  static getFeaturesMap(
    featureVariableIdMap: FeatureVariablesMap,
    configObj: ProjectConfig,
    experimentsMapById: OptimizelyExperimentsMap
  ): OptimizelyFeaturesMap {
    var featuresMap: OptimizelyFeaturesMap = {};
    configObj.featureFlags.forEach((featureFlag) => {
      var featureExperimentMap: OptimizelyExperimentsMap = {};
      var experimentRules: OptimizelyExperiment[] = [];
      for (let key in experimentsMapById) {
        if (featureFlag.experimentIds.includes(key)) {
          featureExperimentMap[key] = experimentsMapById[key];
          experimentRules.push(experimentsMapById[key]);
        }
      }
      const featureVariableMap = (featureFlag.variables || []).reduce((variables: OptimizelyVariablesMap, variable) => {
        variables[variable.key] = {
          id: variable.id,
          key: variable.key,
          type: variable.type,
          value: variable.defaultValue,
        };
        return variables;
      }, {});
      var deliveryRules: OptimizelyExperiment[] = []
      const rollout = configObj.rolloutIdMap[featureFlag.rolloutId];
      if (rollout) {
        deliveryRules = OptimizelyConfig.getDeliveryRules(
          featureVariableIdMap,
          featureFlag.id,
          rollout.experiments,
          configObj
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

  /**
   * Get Map of all experiments except rollouts
   * @param       {ProjectConfig}              configObj
   * @returns     {OptimizelyExperimentsMap}   Map of experiments excluding rollouts
   */
  // static getExperimentsMap(configObj: ProjectConfig): OptimizelyExperimentsMap {
  //   const rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);
  //   const featureVariablesMap = (configObj.featureFlags || []).reduce(
  //     (resultMap: FeatureVariablesMap, feature) => {
  //       resultMap[feature.id] = feature.variables;
  //       return resultMap;
  //     },
  //     {},
  //   );

  //   return (configObj.experiments || []).reduce(
  //     (experiments: OptimizelyExperimentsMap, experiment) => {
  //       // skip experiments that are part of a rollout
  //       if (!rolloutExperimentIds[experiment.id]) {
  //         experiments[experiment.key] = {
  //           id: experiment.id,
  //           key: experiment.key,
  //           variationsMap: (experiment.variations || []).reduce(
  //             (variations: { [key: string]: Variation }, variation) => {
  //               variations[variation.key] = {
  //                 id: variation.id,
  //                 key: variation.key,
  //                 variablesMap: this.getMergedVariablesMap(configObj, variation, experiment.id, featureVariablesMap),
  //               };
  //               if (isFeatureExperiment(configObj, experiment.id)) {
  //                 variations[variation.key].featureEnabled = variation.featureEnabled;
  //               }

  //               return variations;
  //             },
  //             {},
  //           ),
  //         };
  //       }

  //       return experiments;
  //     },
  //     {},
  //   )
  // }

  // /**
  //  * Merge feature key and type from feature variables to variation variables
  //  * @param       {ProjectConfig}              configObj
  //  * @param       {Variation}                  variation
  //  * @param       {string}                     experimentId
  //  * @param       {FeatureVariablesMap}        featureVariablesMap
  //  * @returns     {OptimizelyVariablesMap}     Map of variables
  //  */
  // static getMergedVariablesMap(
  //   configObj: ProjectConfig,
  //   variation: Variation,
  //   experimentId: string,
  //   featureVariablesMap: FeatureVariablesMap,
  // ): OptimizelyVariablesMap {
  //   const featureId = configObj.experimentFeatureMap[experimentId];

  //   let variablesObject = {};
  //   if (featureId) {
  //     const experimentFeatureVariables = featureVariablesMap[featureId.toString()];
  //     // Temporary variation variables map to get values to merge.
  //     const tempVariablesIdMap = (variation.variables || []).reduce(
  //       (variablesMap: { [key: string]: VariationVariable }, variable) => {
  //         variablesMap[variable.id] = {
  //           id: variable.id,
  //           value: variable.value,
  //         };

  //         return variablesMap;
  //       },
  //       {},
  //     );
  //     variablesObject = (experimentFeatureVariables || []).reduce(
  //       (variablesMap: OptimizelyVariablesMap, featureVariable) => {
  //         const variationVariable = tempVariablesIdMap[featureVariable.id];
  //         const variableValue =
  //           variation.featureEnabled && variationVariable ? variationVariable.value : featureVariable.defaultValue;
  //         variablesMap[featureVariable.key] = {
  //           id: featureVariable.id,
  //           key: featureVariable.key,
  //           type: featureVariable.type,
  //           value: variableValue,
  //         };

  //         return variablesMap;
  //       },
  //       {},
  //     );
  //   }

  //   return variablesObject;
  // }

  /**
   * Get map of all experiments
   * @param       {ProjectConfig}              configObj
   * @param       {OptimizelyExperimentsMap}   allExperiments
   * @returns     {OptimizelyFeaturesMap}      Map of all experiments
   */
  // static getFeaturesMap(
  //   configObj: ProjectConfig,
  //   allExperiments: OptimizelyExperimentsMap
  // ): OptimizelyFeaturesMap {
  //   return (configObj.featureFlags || []).reduce((features: OptimizelyFeaturesMap, feature) => {
  //     features[feature.key] = {
  //       id: feature.id,
  //       key: feature.key,
  //       experimentsMap: (feature.experimentIds || []).reduce(
  //         (experiments: OptimizelyExperimentsMap, experimentId) => {
  //           const experimentKey = configObj.experimentIdMap[experimentId].key;
  //           experiments[experimentKey] = allExperiments[experimentKey];
  //           return experiments;
  //         },
  //         {},
  //       ),
  //       variablesMap: (feature.variables || []).reduce(
  //         (variables: OptimizelyVariablesMap, variable) => {
  //           variables[variable.key] = {
  //             id: variable.id,
  //             key: variable.key,
  //             type: variable.type,
  //             value: variable.defaultValue,
  //           };

  //           return variables;
  //         },
  //         {},
  //       ),
  //     };

  //     return features;
  //   }, {});
  // }
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
