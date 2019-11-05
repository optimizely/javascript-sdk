/**
 * Copyright 2019, Optimizely
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

// Get Experiment Ids which are part of rollouts
function getRolloutExperimentIds(rollouts) {
  return rollouts.reduce(function(experimentIds, rollout) {
    rollout.experiments.forEach(function(e) {
      experimentIds[e.id] = true;
    });
    return experimentIds;
  }, {});
}

// Gets Map of all experiments except rollouts
function getExperimentsMap(configObj) {
  var rolloutExperimentIds = getRolloutExperimentIds(configObj.rollouts);
  var featureVariablesMap = configObj.featureFlags.reduce(function(resultMap, feature){
    resultMap[feature.id] = feature.variables;
    return resultMap;
  }, {});
  return configObj.experiments.reduce(function(experiments, experiment) {
    // skip experiments that are part of a rollout
    if (!rolloutExperimentIds[experiment.id]) {
      experiments[experiment.id] = {
        id: experiment.id,
        key: experiment.key,
        variationsMap: experiment.variations.reduce(function(variations, variation) {
          var variablesMap = {};
          if (variation.featureEnabled) {
            variablesMap = variation.variables.reduce(function(variables, variable) {
              variables[variable.id] = {
                id: variable.id,
                value: variable.value,
              };
              return variables;
            }, {});
          }
          variations[variation.id] = {
            id: variation.id,
            key: variation.key,
            variablesMap,
          };
          return variations;
        }, {}),
      };
      var featureId = configObj.experimentFeatureMap[experiment.id];
      if (featureId) {
        mergeFeatureVariables(experiments[experiment.id], featureVariablesMap[featureId]);
      }
    }
    return experiments;
  }, {});
}

// Merges feature varibles in variations of passed in experiment
// Modifies experiment object.
function mergeFeatureVariables(experiment, featureVariables) {
  var variationKeys = Object.keys(experiment.variationsMap);
  variationKeys.forEach(function(variationKey) {
    var variation = experiment.variationsMap[variationKey];
    featureVariables.forEach(function(featureVariable) {
      var variationVariable = variation.variablesMap[featureVariable.id];
      if (!variationVariable) {
        // varible does not exist in variation when feature is disabled
        // Adding a new variable with default value from feature flag.
        variation.variablesMap[featureVariable.id] = {
          id: featureVariable.id,
          key: featureVariable.key,
          type: featureVariable.type,
          value: featureVariable.defaultValue,
        };
      } else {
        // Merge key and type from featureVariable when variation already has the variable.
        variationVariable.key = featureVariable.key;
        variationVariable.type = featureVariable.type;
      }
    })
  });
};

// Gets map of all experiments
function getFeaturesMap(configObj, allExperiments) {
  return configObj.featureFlags.reduce(function(features, feature) {
    features[feature.id] = {
      id: feature.id,
      key: feature.key,
      experimentsMap: feature.experimentIds.reduce(function(experiments, experimentId) {
        experiments[experimentId] = allExperiments[experimentId];
        return experiments;
      }, {}),
      variablesMap: feature.variables.reduce(function(variables, variable) {
        variables[variable.id] = {
          id: variable.id,
          key: variable.key,
          type: variable.type,
          value: variable.defaultValue,
        }
        return variables;
      }, {}),
    };
    return features;
  }, {});
}

module.exports = {
  getOptimizelyConfig: function(configObj) {
    // Fetch all feature variables from feature flags to merge them with variation variables
    var experimentsMap = getExperimentsMap(configObj);
    return {
      experimentsMap,
      featuresMap: getFeaturesMap(configObj, experimentsMap),
      revision: configObj.revision,
    }
  },
};
