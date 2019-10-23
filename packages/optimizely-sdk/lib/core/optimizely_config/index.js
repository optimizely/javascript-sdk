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
var fns = require('../../utils/fns');

// Get Experiment Ids which are part of rollouts
function getRolloutExperimentIds(rollouts) {
  return rollouts.reduce(function(experimentIds, rollout) {
    return experimentIds.concat(rollout.experiments.map(function(e) {
      return e.id;
    }));
  }, []);
}

// Gets Map of all experiments except rollouts
function getExperimentsMap(configObj) {
  var rolloutExperimentsIds = getRolloutExperimentIds(configObj.rollouts);
  return configObj.experiments.reduce(function(experiments, experiment) {
    // skip experiments that are part of a rollout
    if (!rolloutExperimentsIds.includes(experiment.id)) {
      experiments[experiment.id] = {
        id: experiment.id,
        key: experiment.key,
        variationsMap: experiment.variations.reduce(function(variations, variation) {
          variations[variation.id] = {
            id: variation.id,
            key: variation.key,
            variablesMap: variation.variables.reduce(function(variables, variable) {
              // return empty variable map when feature is disabled
              if (!variation.featureEnabled) {
                return {};
              }
              variables[variable.id] = {
                id: variable.id,
                value: variable.value,
              };
              return variables;                
            }, {}),
          };
          return variations;
        }, {}),
      };
    }
    return experiments;
  }, {});
}

// Merges feature varibles in variations of passed in experiment
// Modifies experiment object.
function mergeFeatureVariables(experiment, featureVariables) {
  var variations = fns.values(experiment.variationsMap);
  variations.forEach(function(variation) {
    featureVariables.forEach(function(featureVariable) {
      var variable = variation.variablesMap[featureVariable.id];
      if (!variable) {
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
        variable.key = featureVariable.key;
        variable.type = featureVariable.type;
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
        // Update experiment object with merged feature variables
        mergeFeatureVariables(allExperiments[experimentId], feature.variables);
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
