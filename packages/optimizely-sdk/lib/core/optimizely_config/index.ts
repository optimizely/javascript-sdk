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
  Audience,
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
  private static audienceConditionalOperators: string[] = ['and', 'or', 'not'];

  constructor(configObj: ProjectConfig, datafile: string) {
    this.sdkKey = configObj.sdkKey ? configObj.sdkKey : '';
    this.environmentKey = configObj.environmentKey ? configObj.environmentKey : '';
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
    this.featuresMap = OptimizelyConfig.getFeaturesMap(configObj,featureIdVariablesMap, experimentsMapById);
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
    var finalAudiences: OptimizelyAudience[] = [];
    var typedAudienceIds: {[id: string]: boolean} = {};

    (configObj.typedAudiences || []).forEach((typedAudience) => {
      finalAudiences.push({id: typedAudience.id, conditions: JSON.stringify(typedAudience.conditions), name: typedAudience.name});
      typedAudienceIds[typedAudience.id] = true;
    });

    (configObj.audiences || []).forEach((oldAudience) => {
      if (!typedAudienceIds[oldAudience.id] && oldAudience.id != '$opt_dummy_audience') {
        finalAudiences.push({id: oldAudience.id, conditions: JSON.stringify(oldAudience.conditions), name: oldAudience.name});
      }
    });

    return finalAudiences;
  }

  static getExperimentAudiences(experiment: Experiment, configObj: ProjectConfig): string {
    if (!experiment.audienceConditions || experiment.audienceConditions.length === 0) {
      return '';
    }
    return OptimizelyConfig.GetSerializedAudiences(experiment.audienceConditions,configObj.audiencesById);  
  }

  static GetSerializedAudiences(conditions: Array<string | string[]>, audiencesById: {[id:string]:Audience}): string {
    var serializedAudience = ""
    if (conditions) {
      var cond = ""
      conditions.forEach(item => {
        var subAudience = ""
        // Checks if item is list of conditions means if it is sub audience
        if (item instanceof Array) {
          subAudience = OptimizelyConfig.GetSerializedAudiences(item,audiencesById)
          subAudience = `(${subAudience})`
        } else if (OptimizelyConfig.audienceConditionalOperators.includes(item)) {
          cond = item.toString().toUpperCase()
        } else {
          // Checks if item is audience id
          const itemStr = item.toString()
          var audienceName = audiencesById[itemStr] ? audiencesById[itemStr].name : itemStr
          // if audience condition is "NOT" then add "NOT" at start. Otherwise check if there is already audience id in sAudience then append condition between saudience and item
          if (serializedAudience || cond == "NOT") {
            cond = cond ? cond : "OR"
            if (serializedAudience) {
              serializedAudience = serializedAudience.concat(` ${cond} "${audienceName}"`)
            } else {
              serializedAudience = `"${audiencesById[itemStr].name}"`
            }
          } else {
            serializedAudience = `"${audienceName}"`
          }
        }
        // Checks if sub audience is empty or not
        if(subAudience) {
          if (serializedAudience || cond == "NOT") {
            cond = cond ? cond : "OR"
            if (serializedAudience) {
              serializedAudience = `  ${cond} ${subAudience}`
            } else {
              serializedAudience = `${cond} ${subAudience}`
            }
          } else {
            serializedAudience = serializedAudience.concat(subAudience)
          }
        }
      });
    }
    return serializedAudience;
  }

  // /**
  //  * Get Experiment Ids which are part of rollout
  //  * @param       {Rollout[]}                  rollouts
  //  * @returns     {[key: string]: boolean}     Map of experiment Ids to boolean
  //  */
  // static getRolloutExperimentIds(rollouts: Rollout[]): { [key: string]: boolean } {
  //   return (rollouts || []).reduce((experimentIds: { [key: string]: boolean }, rollout) => {
  //     rollout.experiments.forEach((e) => {
  //       experimentIds[e.id] = true;
  //     });

  //     return experimentIds;
  //   }, {});
  // }

  static getExperimentsKeyMap(experimentsMapById: OptimizelyExperimentsMap): OptimizelyExperimentsMap {
    var experimentKeysMap: OptimizelyExperimentsMap = {};

    for (let id in experimentsMapById) {
      let experiment = experimentsMapById[id];
      experimentKeysMap[experiment.key] = experiment;
    }
    return experimentKeysMap;
  }

  static getExperimentsMapById(
    configObj: ProjectConfig,
    featureIdVariableMap: FeatureVariablesMap
  ): {[id:string]: OptimizelyExperiment} {
    const variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);

    const experiments = configObj.experiments;
    configObj.groups.forEach((group) => {
      experiments.concat(group.experiments);
    });
    let experimentsMap = experiments.reduce(( experimentsMap: { [id: string]: OptimizelyExperiment }, experiment) => {
      var featureIds = configObj.experimentFeatureMap[experiment.id] || [];
      var featureId = featureIds.length > 0 ? featureIds[0] :  '';

      const variationsMap = OptimizelyConfig.GetVariationsMap(
        experiment.variations,
        featureIdVariableMap,
        variableIdMap,
        featureId.toString()
      );

      experimentsMap[experiment.id] = {
        id: experiment.id,
        key: experiment.key,
        audiences: OptimizelyConfig.getExperimentAudiences(experiment,configObj),
        variationsMap: variationsMap,
      };
      return experimentsMap;
    }, {});
    return experimentsMap;
  }

  static GetVariationsMap(
    variations: Variation[],
    featureIdVariableMap: FeatureVariablesMap,
    variableIdMap: { [id: string]: FeatureVariable },
    featureId: string
  ): { [key: string]: Variation } {
    var variationsMap: { [key: string]: OptimizelyVariation } = {};
    variationsMap = variations.reduce(
      (variationsMap: {[key:string]: OptimizelyVariation}, variation) => {
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
        return variationsMap;
    }, {});

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
    configObj: ProjectConfig,
    featureVariableIdMap: FeatureVariablesMap,
    featureId: string,
    experiments: Experiment[] | undefined,
  ): OptimizelyExperiment[] {
    var deliveryRules: OptimizelyExperiment[] = [];
    if (!experiments) {
      return deliveryRules;
    }

    const variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);

    experiments.forEach((experiment) => {
      deliveryRules.push({
        id: experiment.id,
        key: experiment.key,
        audiences: OptimizelyConfig.getExperimentAudiences(experiment,configObj),
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
    configObj: ProjectConfig,
    featureVariableIdMap: FeatureVariablesMap,
    experimentsMapById: OptimizelyExperimentsMap,
  ): OptimizelyFeaturesMap {
    var featuresMap: OptimizelyFeaturesMap = {};
    configObj.featureFlags.forEach((featureFlag) => {
      var featureExperimentMap: OptimizelyExperimentsMap = {};
      var experimentRules: OptimizelyExperiment[] = [];
      for (let key in experimentsMapById) {
        if (featureFlag.experimentIds.includes(key)) {
          var experiment = experimentsMapById[key];
          if (experiment) {
            featureExperimentMap[experiment.key] = experiment;
          }
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
          configObj,
          featureVariableIdMap,
          featureFlag.id,
          rollout.experiments,
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
