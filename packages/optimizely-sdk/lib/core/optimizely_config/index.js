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
 
function isRollout(configObj, experimentId) {
  var hasExperiment = false;
  configObj.rollouts.forEach(rollout => {
    rollout.experiments.forEach(experiment => {
      if (experiment.id === experimentId) {
        hasExperiment = true;
      }
    })
  })
  return hasExperiment;
}

function getExperimentsMap(configObj, experimentIds) {
  var experimentsMap = {};
  configObj.experiments.filter(e => experimentIds.includes(e.id)).forEach(experiment => {
    var variationsMap = {};
    experiment.variations.forEach(variation => {
      var variablesMap = {};
      variation.variables.forEach(variable => {
        variablesMap[variable.id] = {
          id: variable.id,
          key: variable.key,
          type: variable.type,
          value: variable.value,
        };
      });
      variationsMap[variation.id] = {
        id: variation.id,
        key: variation.key,
        variablesMap,
      };
    });
    experimentsMap[experiment.id] = {
      id: experiment.id,
      key: experiment.key,
      variationsMap,
    };
  });
  return experimentsMap;
}

// All experiments except rollouts
function getAllExperimentsMap(configObj) {
  var allExperimentIds = configObj.experiments.filter(e => !isRollout(configObj, e.id)).map(e => e.id);
  return getExperimentsMap(configObj, allExperimentIds);
}

function getFeaturesMap(configObj) {
  var featuresMap = {};
  configObj.featureFlags.forEach(feature => {
    var variablesMap = {};
    feature.variables.forEach(variable => {
      variablesMap[variable.id] = {
        id: variable.id,
        key: variable.key,
        type: variable.type,
        value: variable.value,
      };
    });
    featuresMap[feature.id] = {
      id: feature.id,
      key: feature.key,
      experimentsMap: getExperimentsMap(configObj, feature.experimentIds),
      variablesMap,
    }
  })
  return featuresMap;
}

module.exports = {
  getOptimizelyConfig: function(configObj) {
    return {
      experimentsMap: getAllExperimentsMap(configObj),
      featuresMap: getFeaturesMap(configObj),
    }
  },
};
