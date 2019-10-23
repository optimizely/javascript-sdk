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
var assert = require('chai').assert;

var fns = require('../../utils/fns');
var datafile = require('../../tests/test_data').getTestProjectConfigWithFeatures();
var projectConfig = require('../project_config');
var optimizelyConfig = require('./index');

var getAllExperimentsFromDatafile = function(datafile) {
  var allExperiments = [];
  datafile.groups.forEach(function(group) {
    group.experiments.forEach(function(experiment) {
      allExperiments.push(experiment);
    });
  });
  datafile.experiments.forEach(function(experiment) {
    allExperiments.push(experiment);
  });
  return allExperiments;
};

describe('lib/core/optimizely_config', function() {
  describe('Optimizely Config', function() {
    var optimizelyConfigObject;
    beforeEach(function() {
      var configObject = projectConfig.createProjectConfig(datafile);
      optimizelyConfigObject = optimizelyConfig.getOptimizelyConfig(configObject);
    });

    it('should return all experiments except rollouts', function() {
      var experimentsMap = optimizelyConfigObject.experimentsMap;
      var experimentsCount = fns.values(optimizelyConfigObject.experimentsMap).length;
      assert.equal(experimentsCount, 6);
      
      var allExperiments = getAllExperimentsFromDatafile(datafile);
      allExperiments.forEach(function(experiment) {
        assert.include(experimentsMap[experiment.id], {
          id: experiment.id,
          key: experiment.key,
        });
        var variationsMap = experimentsMap[experiment.id].variationsMap;
        experiment.variations.forEach(function(variation) {
          assert.include(variationsMap[variation.id], {
            id: variation.id,
            key: variation.key,
          })
        });
      });
    });
    
    it('should return all the feature flags', function() {
      var featureFlagsCount = fns.values(optimizelyConfigObject.featuresMap).length;
      assert.equal(featureFlagsCount, 7);
      
      var featuresMap = optimizelyConfigObject.featuresMap;
      datafile.featureFlags.forEach(function(featureFlag) {
        assert.include(featuresMap[featureFlag.id], {
          id: featureFlag.id,
          key: featureFlag.key,
        });
        featureFlag.experimentIds.forEach(function(experimentId) {
          assert.isTrue(!!featuresMap[featureFlag.id].experimentsMap[experimentId]);
        });
        var variablesMap = featuresMap[featureFlag.id].variablesMap;
        featureFlag.variables.forEach(function(variable) {
          assert.include(variablesMap[variable.id], {
            id: variable.id,
            key: variable.key,
            type: variable.type,
            value: variable.defaultValue,
          })
        });
      });
    });
    
    it('should correctly merge all feature variables', function() {
      var featureFlags = fns.values(datafile.featureFlags);
      var datafileExperimentsMap = getAllExperimentsFromDatafile(datafile)
        .reduce(function(experiments, experiment) {
          experiments[experiment.id] = experiment;
          return experiments;
        }, {});
      featureFlags.forEach(function(featureFlag) {
        var experimentIds = featureFlag.experimentIds;
        experimentIds.forEach(function(experimentId) {
          var experiment = optimizelyConfigObject.experimentsMap[experimentId];
          var variations = datafileExperimentsMap[experimentId].variations;
          var variationsMap = experiment.variationsMap;
          variations.forEach(function(variation) {
            featureFlag.variables.forEach(function(variable) {
              var variableToAssert = variationsMap[variation.id].variablesMap[variable.id];
              assert.include(variable, {
                id: variableToAssert.id,
                key: variableToAssert.key,
                type: variableToAssert.type,
              });
              if (!variation.featureEnabled) {
                assert.equal(variable.defaultValue, variableToAssert.value);  
              }
            });  
          })
        });
      });
    });

    it('should return correct config revision', function() {
      assert.equal(optimizelyConfigObject.revision, datafile.revision);
    });
  });
});
