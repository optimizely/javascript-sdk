/**
 * Error Handler module
 * @typedef {Object} ErrorHandler
 * @property {Function} handleError Function which receives an Error
 */

/**
 * Event Dispatcher module
 * @typedef {Object} EventDispatcher
 * @property {EventDispatcherFn} dispatchEvent
 */

/**
 * @callback EventDispatcherFn
 * @param {Event} event Event to dispatch
 * @param {Function} callback Function to call when...
 */

/**
 * @typedef {Object} JSONSchemaValidator
 * @property {SchemaValidatorFn} validate Function to call to validate schema
 */

/**
 * Validate obj against jsonSchema
 * @callback SchemaValidatorFn
 * @param {Object} jsonSchema
 * @param {Object} obj
 * @return {Boolean} true if the object is valid
 * @throws {Error} if invalid
 */

/**
 * @typedef {Object} Logger
 * @property {LogFn} log Log function
 */

/**
 * @callback LogFn
 * @param {Object} log
 * @param {String} log.logLevel Level of message
 * @param {String} log.logMessage Text of message
 */

/**
 * User Profile module that can store and retrieve proiles by User ID. See https://developers.optimizely.com/x/solutions/sdks/reference/index.html?language=javascript#profiles
 * @typedef {Object} UserProfileService
 * @property {UserProfileLookupFn} lookup
 * @property {UserProfileSaveFn} save
 */

/**
 * @typedef {Object} UserProfile
 * @property {String} userId
 * @property {Object.<BucketMap>} experiment_bucket_map Map of experimentId to bucket map
 */

/**
 * Bucket for a single experiment
 * @typedef {Object} BucketMap
 * @property {String} variation_id
 */

/**
 * @callback UserProfileLookupFn
 * @param {String} userId
 * @return {UserProfile}
 */

/**
 * @callback UserProfileSaveFn
 * @param {String} userId
 * @param {UserProfile} userProfile
 */

/**
 * Map of attribute name to attribute value. Null or empty values will be discarded.
 * @typedef {Object.<(String|null)>} Attributes
 */
