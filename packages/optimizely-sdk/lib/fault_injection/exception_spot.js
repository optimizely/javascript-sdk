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

    // lib/core/notification_center
    notification_center_NotificationCenter: "notification_center_NotificationCenter",

    notification_center_addNotificationListener_spot1: "notification_center_addNotificationListener_spot1",
    notification_center_addNotificationListener_spot2: "notification_center_addNotificationListener_spot2",
    notification_center_addNotificationListener_spot3: "notification_center_addNotificationListener_spot3",

    notification_center_removeNotificationListener_spot1: "notification_center_removeNotificationListener_spot1",
    notification_center_removeNotificationListener_spot2: "notification_center_removeNotificationListener_spot2",

    notification_center_clearAllNotificationListeners: "notification_center_clearAllNotificationListeners",
    notification_center_clearNotificationListeners: "notification_center_clearNotificationListeners",
    notification_center_sendNotifications: "notification_center_sendNotifications",
    notification_center_createNotificationCenter: "notification_center_createNotificationCenter",

    // lib/core/project_config
    project_config_createProjectConfig_spot1: "project_config_createProjectConfig_spot1",
    project_config_createProjectConfig_spot2: "project_config_createProjectConfig_spot2",
    project_config_createProjectConfig_spot3: "project_config_createProjectConfig_spot3",
    project_config_createProjectConfig_spot4: "project_config_createProjectConfig_spot4",

    project_config_getExperimentId: "project_config_getExperimentId",
    project_config_getLayerId: "project_config_getLayerId",
    project_config_getAttributeId: "project_config_getAttributeId",
    project_config_getEventId: "project_config_getEventId",
    project_config_getExperimentStatus: "project_config_getExperimentStatus",
    project_config_isActive: "project_config_isActive",
    project_config_isRunning: "project_config_isRunning",
    project_config_getAudiencesForExperiment: "project_config_getAudiencesForExperiment",
    project_config_getVariationKeyFromId: "project_config_getVariationKeyFromId",
    project_config_getVariationIdFromExperimentAndVariationKey: "project_config_getVariationIdFromExperimentAndVariationKey",
    project_config_getExperimentFromKey: "project_config_getExperimentFromKey",
    project_config_getExperimentIdsForEvent: "project_config_getExperimentIdsForEvent",
    project_config_getTrafficAllocation: "project_config_getTrafficAllocation",
    project_config_removeForcedVariation: "project_config_removeForcedVariation",
    project_config_setInForcedVariationMap: "project_config_setInForcedVariationMap",

    project_config_getForcedVariation_spot1: "project_config_getForcedVariation_spot1",
    project_config_getForcedVariation_spot2: "project_config_getForcedVariation_spot2",
    project_config_getForcedVariation_spot3: "project_config_getForcedVariation_spot3",

    project_config_setForcedVariation_spot1: "project_config_setForcedVariation_spot1",
    project_config_setForcedVariation_spot2: "project_config_setForcedVariation_spot2",
    project_config_setForcedVariation_spot3: "project_config_setForcedVariation_spot3",

    project_config_getExperimentFromId: "project_config_getExperimentFromId",
    project_config_getFeatureFromKey: "project_config_getFeatureFromKey",
    project_config_getVariableForFeature: "project_config_getVariableForFeature",
    project_config_getVariableValueForVariation: "project_config_getVariableValueForVariation",
    project_config_getTypeCastValue: "project_config_getTypeCastValue",

    // lib/optimizely
    optimizely_Optimizely_spot1: "optimizely_Optimizely_spot1",
    optimizely_Optimizely_spot2: "optimizely_Optimizely_spot2",
    optimizely_Optimizely_spot3: "optimizely_Optimizely_spot3",
    optimizely_Optimizely_spot4: "optimizely_Optimizely_spot4",
    optimizely_Optimizely_spot5: "optimizely_Optimizely_spot5",

    optimizely_activate_spot1: "optimizely_activate_spot1",
    optimizely_activate_spot2: "optimizely_activate_spot2",
    optimizely_activate_spot3: "optimizely_activate_spot3",

    optimizely_sendImpressionEvent_spot1: "optimizely_sendImpressionEvent_spot1",
    optimizely_sendImpressionEvent_spot2: "optimizely_sendImpressionEvent_spot2",
    optimizely_sendImpressionEvent_spot3: "optimizely_sendImpressionEvent_spot3",

    optimizely_track_spot1: "optimizely_track_spot1",
    optimizely_track_spot2: "optimizely_track_spot2",
    optimizely_track_spot3: "optimizely_track_spot3",
    optimizely_track_spot4: "optimizely_track_spot4",
    optimizely_track_spot5: "optimizely_track_spot5",

    optimizely_getVariation_spot1: "optimizely_getVariation_spot1",
    optimizely_getVariation_spot2: "optimizely_getVariation_spot2",

    optimizely_setForcedVariation: "optimizely_setForcedVariation",
    optimizely_getForcedVariation: "optimizely_getForcedVariation",

    optimizely_validateInputs: "optimizely_validateInputs",

    optimizely_getValidExperimentsForEvent_spot1: "optimizely_getValidExperimentsForEvent_spot1",
    optimizely_getValidExperimentsForEvent_spot2: "optimizely_getValidExperimentsForEvent_spot2",

    optimizely_notActivatingExperiment: "optimizely_notActivatingExperiment",
    optimizely_dispatchEvent: "optimizely_dispatchEvent",
    optimizely_filterEmptyValues: "optimizely_filterEmptyValues",

    optimizely_isFeatureEnabled_spot1: "optimizely_isFeatureEnabled_spot1",
    optimizely_isFeatureEnabled_spot2: "optimizely_isFeatureEnabled_spot2",

    optimizely_getEnabledFeatures: "optimizely_getEnabledFeatures",

    optimizely_getFeatureVariableForType_spot1: "optimizely_getFeatureVariableForType_spot1",
    optimizely_getFeatureVariableForType_spot2: "optimizely_getFeatureVariableForType_spot2",
    optimizely_getFeatureVariableForType_spot3: "optimizely_getFeatureVariableForType_spot3",

    optimizely_getFeatureVariableBoolean: "optimizely_getFeatureVariableBoolean",
    optimizely_getFeatureVariableDouble: "optimizely_getFeatureVariableDouble",
    optimizely_getFeatureVariableInteger: "optimizely_getFeatureVariableInteger",
    optimizely_getFeatureVariableString: "optimizely_getFeatureVariableString",

    // lib/utils/attributes_validator
    attributes_validator_validate: "attributes_validator_validate",

    // lib/utils/config_validator
    config_validator_validate: "config_validator_validate",

    // lib/utils/event_tag_utils
    event_tag_utils_getRevenueValue: "event_tag_utils_getRevenueValue",
    event_tag_utils_getEventValue: "event_tag_utils_getEventValue",

    // lib/utils/event_tags_validator
    event_tags_validator_validate: "event_tags_validator_validate",

    // lib/utils/json_schema_validator
    json_schema_validator_validate_spot1: "json_schema_validator_validate_spot1",
    json_schema_validator_validate_spot2: "json_schema_validator_validate_spot2",

    // lib/utils/user_profile_service_validator
    user_profile_service_validator: "user_profile_service_validator"
};

module.exports = ExceptionSpot;