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

// Returns feature variables from all the featureFlags
function getFeatureVariables(featureFlags) {
  var featureVariables = {};
  featureFlags.forEach(function(feature) {
    feature.variables.forEach(function(variable) {
      featureVariables[variable.id] = {
        id: variable.id,
        key: variable.key,
        type: variable.type,
      };
    });
  });
  return featureVariables;
}

// Checks if an experiment is part of a rollout
function isRollout(configObj, experimentId) {
  return configObj.rollouts.some(function(rollout) {
    return rollout.experiments.some(function(experiment) {
      return experiment.id === experimentId;
    });
  });
}

// Gets Map of all experiments except rollouts
function getExperimentsMap(configObj, mergeVariables) {
  return configObj.experiments.filter(function(experiment) {
    return !isRollout(configObj, experiment.id);
  }).reduce(function(experiments, experiment) {
    experiments[experiment.id] = {
      id: experiment.id,
      key: experiment.key,
      variationsMap: experiment.variations.reduce(function(variations, variation) {
        variations[variation.id] = {
          id: variation.id,
          key: variation.key,
          variablesMap: variation.variables.reduce(function(variables, variable) {
            variables[variable.id] = fns.assign({}, {
              id: variable.id,
              value: variable.value,
            }, mergeVariables[variable.id]);
            return variables;                
          }, {}),
        };
        return variations;
      }, {}),
    };
    return experiments;
  }, {});
}

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
          value: variable.value,
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
    var featureVariables = getFeatureVariables(configObj.featureFlags);
    var experimentsMap = getExperimentsMap(configObj, featureVariables);
    return {
      experimentsMap,
      featuresMap: getFeaturesMap(configObj, experimentsMap),
    }
  },
};
