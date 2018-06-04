var ExceptionSpot = {

    none: "none",

    // lib/index.node.js
    createInstance: "createInstance",

    // lib/core/audience_evaluator
    audience_evaluator_evaluate: "audience_evaluator_evaluate",

    // lib/core/bucketer
    bucketer_bucket_spot1: "bucketer_bucket_spot1",
    bucketer_bucket_spot2: "bucketer_bucket_spot2",
    bucketer_bucket_spot3: "bucketer_bucket_spot3",
    bucketer_bucket_spot4: "bucketer_bucket_spot4",
    bucketer_bucket_spot5: "bucketer_bucket_spot5",

    bucketer_bucketUserIntoExperiment : "bucketer_bucketUserIntoExperiment",

    bucketer_findBucket: "bucket_findBucket",
    bucketer_generateBucketValue: "bucketer_generateBucketValue",

    // lib/core/condition_evaluator
    condition_evaluator_evaluate_spot1: "condition_evaluator_evaluate_spot1",
    condition_evaluator_evaluate_spot2: "condition_evaluator_evaluate_spot2",
    condition_evaluator_evaluate_spot3: "condition_evaluator_evaluate_spot3",

    condition_evaluator_andEvaluator: "condition_evaluator_andEvaluator",
    condition_evaluator_notEvaluator: "condition_evaluator_notEvaluator",
    condition_evaluator_orEvaluator: "condition_evaluator_orEvaluator",
    condition_evaluator_evaluator: "condition_evaluator_evaluator",

    // lib/core/decision_service
    decision_service_DecisionService: "decision_service_DecisionService",

    decision_service_getVariation_spot1: "decision_service_getVariation_spot1",
    decision_service_getVariation_spot2: "decision_service_getVariation_spot2",
    decision_service_getVariation_spot3: "decision_service_getVariation_spot3",
    decision_service_getVariation_spot4: "decision_service_getVariation_spot4",
    decision_service_getVariation_spot5: "decision_service_getVariation_spot5",

    decision_service_checkIfExperimentIsActive: "decision_service_checkIfExperimentIsActive",
    decision_service_getWhitelistedVariation: "decision_service_getWhitelistedVariation",
    decision_service_checkIfUserIsInAudience: "decision_service_checkIfUserIsInAudience",
    decision_service_buildBucketerParams: "decision_service_buildBucketerParams",
    decision_service_getStoredVariation: "decision_service_getStoredVariation",
    decision_service_getUserProfile: "decision_service_getUserProfile",
    decision_service_saveUserProfile: "decision_service_saveUserProfile",

    decision_service_getVariationForFeature_spot1: "decision_service_getVariationForFeature_spot1",
    decision_service_getVariationForFeature_spot2: "decision_service_getVariationForFeature_spot2",

    decision_service_getVariationForFeatureExperiment_spot1: "decision_service_getVariationForFeatureExperiment_spot1",
    decision_service_getVariationForFeatureExperiment_spot2: "decision_service_getVariationForFeatureExperiment_spot2",
    decision_service_getVariationForFeatureExperiment_spot3: "decision_service_getVariationForFeatureExperiment_spot3",

    decision_service_getExperimentInGroup: "decision_service_getExperimentInGroup",

    decision_service_getVariationForRollout_spot1: "decision_service_getVariationForRollout_spot1",
    decision_service_getVariationForRollout_spot2: "decision_service_getVariationForRollout_spot2",
    decision_service_getVariationForRollout_spot3: "decision_service_getVariationForRollout_spot3",
    decision_service_getVariationForRollout_spot4: "decision_service_getVariationForRollout_spot4",
    decision_service_getVariationForRollout_spot5: "decision_service_getVariationForRollout_spot5",
    decision_service_getVariationForRollout_spot6: "decision_service_getVariationForRollout_spot6",

    // lib/core/event_builder
    event_builder_getCommonEventParams_spot1: "event_builder_getCommonEventParams_spot1",
    event_builder_getCommonEventParams_spot2: "event_builder_getCommonEventParams_spot2",
    event_builder_getCommonEventParams_spot3: "event_builder_getCommonEventParams_spot3",

    event_builder_getImpressionEventParams: "event_builder_getImpressionEventParams",

    event_builder_getConversionEventParams_spot1: "event_builder_getConversionEventParams_spot1",
    event_builder_getConversionEventParams_spot2: "event_builder_getConversionEventParams_spot2",
    event_builder_getConversionEventParams_spot3: "event_builder_getConversionEventParams_spot3",
    event_builder_getImpressionEvent: "event_builder_getImpressionEvent",
    event_builder_getConversionEvent: "event_builder_getConversionEvent",

};

module.exports = ExceptionSpot;