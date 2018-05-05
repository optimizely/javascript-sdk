## Modules

<dl>
<dt><a href="#index.module_node">node</a></dt>
<dd><p>Entry point for nodejs environment</p>
</dd>
<dt><a href="#index.module_browser">browser</a></dt>
<dd><p>Entry point for browser environment</p>
</dd>
<dt><a href="#module_optimizely/index">optimizely/index</a></dt>
<dd><p>Optimizely instance</p>
</dd>
<dt><a href="#module_optimizely/project_config_schema">optimizely/project_config_schema</a></dt>
<dd><p>JSON Schema for datafile</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ErrorHandler">ErrorHandler</a> : <code>Object</code></dt>
<dd><p>Error Handler module</p>
</dd>
<dt><a href="#EventDispatcher">EventDispatcher</a> : <code>Object</code></dt>
<dd><p>Event Dispatcher module</p>
</dd>
<dt><a href="#EventDispatcherFn">EventDispatcherFn</a> : <code>function</code></dt>
<dd></dd>
<dt><a href="#JSONSchemaValidator">JSONSchemaValidator</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SchemaValidatorFn">SchemaValidatorFn</a> ⇒ <code>Boolean</code></dt>
<dd><p>Validate obj against jsonSchema</p>
</dd>
<dt><a href="#Logger">Logger</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#LogFn">LogFn</a> : <code>function</code></dt>
<dd></dd>
<dt><a href="#UserProfileService">UserProfileService</a> : <code>Object</code></dt>
<dd><p>User Profile module that can store and retrieve proiles by User ID. See <a href="https://developers.optimizely.com/x/solutions/sdks/reference/index.html?language=javascript#profiles">https://developers.optimizely.com/x/solutions/sdks/reference/index.html?language=javascript#profiles</a></p>
</dd>
<dt><a href="#UserProfile">UserProfile</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#BucketMap">BucketMap</a> : <code>Object</code></dt>
<dd><p>Bucket for a single experiment</p>
</dd>
<dt><a href="#UserProfileLookupFn">UserProfileLookupFn</a> ⇒ <code><a href="#UserProfile">UserProfile</a></code></dt>
<dd></dd>
<dt><a href="#UserProfileSaveFn">UserProfileSaveFn</a> : <code>function</code></dt>
<dd></dd>
</dl>

<a name="index.module_node"></a>

## node
Entry point for nodejs environment

<a name="index.module_node.createInstance"></a>

### node.createInstance(config) ⇒ [<code>Optimizely</code>](#module_optimizely/index..Optimizely)
Creates an instance of the Optimizely class

**Kind**: static method of [<code>node</code>](#index.module_node)  
**Returns**: [<code>Optimizely</code>](#module_optimizely/index..Optimizely) - the Optimizely object  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>Object</code> |  |
| config.datafile | <code>String</code> | Datafile string. Should conform to schema |
| config.errorHandler | [<code>ErrorHandler</code>](#ErrorHandler) \| <code>undefined</code> | Error Handler |
| config.eventDispatcher | [<code>EventDispatcher</code>](#EventDispatcher) \| <code>undefined</code> | Custom Event Dispatcher, if any |
| config.jsonSchemaValidator | [<code>JSONSchemaValidator</code>](#JSONSchemaValidator) \| <code>undefined</code> |  |
| config.logger | [<code>Logger</code>](#Logger) \| <code>undefined</code> | Custom logger (if not specified, will use default logger) |
| config.userProfileService | [<code>UserProfileService</code>](#UserProfileService) \| <code>undefined</code> | User Profile service to configure, if any |

<a name="index.module_browser"></a>

## browser
Entry point for browser environment


* [browser](#index.module_browser)
    * [.module.exports](#exp_index.module_browser--module.exports) ⏏
        * [.createInstance(config)](#index.module_browser--module.exports.createInstance) ⇒ [<code>Optimizely</code>](#module_optimizely/index..Optimizely)

<a name="exp_index.module_browser--module.exports"></a>

### .module.exports ⏏
Entry point into the Optimizely Node testing SDK

**Kind**: static property of [<code>browser</code>](#index.module_browser)  
<a name="index.module_browser--module.exports.createInstance"></a>

#### module.exports.createInstance(config) ⇒ [<code>Optimizely</code>](#module_optimizely/index..Optimizely)
Creates an instance of the Optimizely class

**Kind**: static method of [<code>module.exports</code>](#exp_index.module_browser--module.exports)  
**Returns**: [<code>Optimizely</code>](#module_optimizely/index..Optimizely) - the Optimizely object  

| Param | Type |
| --- | --- |
| config | <code>Object</code> | 
| config.datafile | <code>String</code> | 
| config.errorHandler | [<code>ErrorHandler</code>](#ErrorHandler) \| <code>undefined</code> | 
| config.eventDispatcher | [<code>EventDispatcher</code>](#EventDispatcher) \| <code>undefined</code> | 
| config.logger | [<code>Logger</code>](#Logger) \| <code>undefined</code> | 
| config.logLevel | <code>LogLevel</code> | 
| config.userProfileService | [<code>UserProfileService</code>](#UserProfileService) \| <code>undefined</code> | 

<a name="module_optimizely/index"></a>

## optimizely/index
Optimizely instance


* [optimizely/index](#module_optimizely/index)
    * [~Optimizely(config)](#module_optimizely/index..Optimizely)
        * [.activate(experimentKey, userId, attributes)](#module_optimizely/index..Optimizely+activate) ⇒ <code>string</code> \| <code>null</code>
        * [.track(eventKey, userId, attributes, eventTags)](#module_optimizely/index..Optimizely+track)
        * [.getVariation(experimentKey, userId, attributes)](#module_optimizely/index..Optimizely+getVariation) ⇒ <code>string</code> \| <code>null</code>
        * [.setForcedVariation(experimentKey, userId, variationKey)](#module_optimizely/index..Optimizely+setForcedVariation) ⇒
        * [.getForcedVariation(experimentKey, userId)](#module_optimizely/index..Optimizely+getForcedVariation) ⇒ <code>string</code> \| <code>null</code>
        * [.isFeatureEnabled(featureKey, userId, attributes)](#module_optimizely/index..Optimizely+isFeatureEnabled) ⇒ <code>boolean</code>
        * [.getEnabledFeatures(userId, attributes)](#module_optimizely/index..Optimizely+getEnabledFeatures) ⇒ <code>Array</code>
        * [.getFeatureVariableBoolean(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableBoolean) ⇒ <code>boolean</code> \| <code>null</code>
        * [.getFeatureVariableDouble(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableDouble) ⇒ <code>number</code> \| <code>null</code>
        * [.getFeatureVariableInteger(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableInteger) ⇒ <code>number</code> \| <code>null</code>
        * [.getFeatureVariableString(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableString) ⇒ <code>string</code> \| <code>null</code>

<a name="module_optimizely/index..Optimizely"></a>

### optimizely/index~Optimizely(config)
The Optimizely class

**Kind**: inner method of [<code>optimizely/index</code>](#module_optimizely/index)  

| Param | Type |
| --- | --- |
| config | <code>Object</code> | 
| config.clientEngine | <code>string</code> | 
| config.clientVersion | <code>string</code> | 
| config.datafile | <code>String</code> | 
| config.errorHandler | [<code>ErrorHandler</code>](#ErrorHandler) | 
| config.eventDispatcher | [<code>EventDispatcher</code>](#EventDispatcher) | 
| config.logger | [<code>Logger</code>](#Logger) | 
| config.skipJSONValidation | [<code>JSONSchemaValidator</code>](#JSONSchemaValidator) | 
| config.userProfileService | [<code>UserProfileService</code>](#UserProfileService) \| <code>undefined</code> | 


* [~Optimizely(config)](#module_optimizely/index..Optimizely)
    * [.activate(experimentKey, userId, attributes)](#module_optimizely/index..Optimizely+activate) ⇒ <code>string</code> \| <code>null</code>
    * [.track(eventKey, userId, attributes, eventTags)](#module_optimizely/index..Optimizely+track)
    * [.getVariation(experimentKey, userId, attributes)](#module_optimizely/index..Optimizely+getVariation) ⇒ <code>string</code> \| <code>null</code>
    * [.setForcedVariation(experimentKey, userId, variationKey)](#module_optimizely/index..Optimizely+setForcedVariation) ⇒
    * [.getForcedVariation(experimentKey, userId)](#module_optimizely/index..Optimizely+getForcedVariation) ⇒ <code>string</code> \| <code>null</code>
    * [.isFeatureEnabled(featureKey, userId, attributes)](#module_optimizely/index..Optimizely+isFeatureEnabled) ⇒ <code>boolean</code>
    * [.getEnabledFeatures(userId, attributes)](#module_optimizely/index..Optimizely+getEnabledFeatures) ⇒ <code>Array</code>
    * [.getFeatureVariableBoolean(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableBoolean) ⇒ <code>boolean</code> \| <code>null</code>
    * [.getFeatureVariableDouble(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableDouble) ⇒ <code>number</code> \| <code>null</code>
    * [.getFeatureVariableInteger(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableInteger) ⇒ <code>number</code> \| <code>null</code>
    * [.getFeatureVariableString(featureKey, variableKey, userId, attributes)](#module_optimizely/index..Optimizely+getFeatureVariableString) ⇒ <code>string</code> \| <code>null</code>

<a name="module_optimizely/index..Optimizely+activate"></a>

#### optimizely.activate(experimentKey, userId, attributes) ⇒ <code>string</code> \| <code>null</code>
Buckets visitor and sends impression event to Optimizely.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>string</code> \| <code>null</code> - variation key  

| Param | Type |
| --- | --- |
| experimentKey | <code>string</code> | 
| userId | <code>string</code> | 
| attributes | <code>Object</code> | 

<a name="module_optimizely/index..Optimizely+track"></a>

#### optimizely.track(eventKey, userId, attributes, eventTags)
Sends conversion event to Optimizely.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  

| Param | Type | Description |
| --- | --- | --- |
| eventKey | <code>string</code> |  |
| userId | <code>string</code> |  |
| attributes | <code>string</code> |  |
| eventTags | <code>Object</code> | Values associated with the event. |

<a name="module_optimizely/index..Optimizely+getVariation"></a>

#### optimizely.getVariation(experimentKey, userId, attributes) ⇒ <code>string</code> \| <code>null</code>
Gets variation where visitor will be bucketed.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>string</code> \| <code>null</code> - variation key  

| Param | Type |
| --- | --- |
| experimentKey | <code>string</code> | 
| userId | <code>string</code> | 
| attributes | <code>Object</code> | 

<a name="module_optimizely/index..Optimizely+setForcedVariation"></a>

#### optimizely.setForcedVariation(experimentKey, userId, variationKey) ⇒
Force a user into a variation for a given experiment.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: boolean A boolean value that indicates if the set completed successfully.  

| Param | Type | Description |
| --- | --- | --- |
| experimentKey | <code>string</code> |  |
| userId | <code>string</code> |  |
| variationKey | <code>string</code> \| <code>null</code> | user will be forced into. If null, then clear the existing experiment-to-variation mapping. |

<a name="module_optimizely/index..Optimizely+getForcedVariation"></a>

#### optimizely.getForcedVariation(experimentKey, userId) ⇒ <code>string</code> \| <code>null</code>
Gets the forced variation for a given user and experiment.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>string</code> \| <code>null</code> - The forced variation key.  

| Param | Type |
| --- | --- |
| experimentKey | <code>string</code> | 
| userId | <code>string</code> | 

<a name="module_optimizely/index..Optimizely+isFeatureEnabled"></a>

#### optimizely.isFeatureEnabled(featureKey, userId, attributes) ⇒ <code>boolean</code>
Returns true if the feature is enabled for the given user.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>boolean</code> - True if the feature is enabled for the user, false otherwise  

| Param | Type | Description |
| --- | --- | --- |
| featureKey | <code>string</code> | Key of feature which will be checked |
| userId | <code>string</code> | ID of user which will be checked |
| attributes | <code>Object</code> | Optional user attributes |

<a name="module_optimizely/index..Optimizely+getEnabledFeatures"></a>

#### optimizely.getEnabledFeatures(userId, attributes) ⇒ <code>Array</code>
Returns an Array containing the keys of all features in the project that are
enabled for the given user.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>Array</code> - Array of feature keys (strings)  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 
| attributes | <code>Object</code> | 

<a name="module_optimizely/index..Optimizely+getFeatureVariableBoolean"></a>

#### optimizely.getFeatureVariableBoolean(featureKey, variableKey, userId, attributes) ⇒ <code>boolean</code> \| <code>null</code>
Returns value for the given boolean variable attached to the given feature
flag.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>boolean</code> \| <code>null</code> - Boolean value of the variable, or null if the
                             feature key is invalid, the variable key is
                             invalid, or there is a mismatch with the type
                             of the variable  

| Param | Type | Description |
| --- | --- | --- |
| featureKey | <code>string</code> | Key of the feature whose variable's value is                              being accessed |
| variableKey | <code>string</code> | Key of the variable whose value is being                              accessed |
| userId | <code>string</code> | ID for the user |
| attributes | <code>Object</code> | Optional user attributes |

<a name="module_optimizely/index..Optimizely+getFeatureVariableDouble"></a>

#### optimizely.getFeatureVariableDouble(featureKey, variableKey, userId, attributes) ⇒ <code>number</code> \| <code>null</code>
Returns value for the given double variable attached to the given feature
flag.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>number</code> \| <code>null</code> - Number value of the variable, or null if the
                             feature key is invalid, the variable key is
                             invalid, or there is a mismatch with the type
                             of the variable  

| Param | Type | Description |
| --- | --- | --- |
| featureKey | <code>string</code> | Key of the feature whose variable's value is                              being accessed |
| variableKey | <code>string</code> | Key of the variable whose value is being                              accessed |
| userId | <code>string</code> | ID for the user |
| attributes | <code>Object</code> | Optional user attributes |

<a name="module_optimizely/index..Optimizely+getFeatureVariableInteger"></a>

#### optimizely.getFeatureVariableInteger(featureKey, variableKey, userId, attributes) ⇒ <code>number</code> \| <code>null</code>
Returns value for the given integer variable attached to the given feature
flag.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>number</code> \| <code>null</code> - Number value of the variable, or null if the
                             feature key is invalid, the variable key is
                             invalid, or there is a mismatch with the type
                             of the variable  

| Param | Type | Description |
| --- | --- | --- |
| featureKey | <code>string</code> | Key of the feature whose variable's value is                              being accessed |
| variableKey | <code>string</code> | Key of the variable whose value is being                              accessed |
| userId | <code>string</code> | ID for the user |
| attributes | <code>Object</code> | Optional user attributes |

<a name="module_optimizely/index..Optimizely+getFeatureVariableString"></a>

#### optimizely.getFeatureVariableString(featureKey, variableKey, userId, attributes) ⇒ <code>string</code> \| <code>null</code>
Returns value for the given string variable attached to the given feature
flag.

**Kind**: instance method of [<code>Optimizely</code>](#module_optimizely/index..Optimizely)  
**Returns**: <code>string</code> \| <code>null</code> - String value of the variable, or null if the
                             feature key is invalid, the variable key is
                             invalid, or there is a mismatch with the type
                             of the variable  

| Param | Type | Description |
| --- | --- | --- |
| featureKey | <code>string</code> | Key of the feature whose variable's value is                              being accessed |
| variableKey | <code>string</code> | Key of the variable whose value is being                              accessed |
| userId | <code>string</code> | ID for the user |
| attributes | <code>Object</code> | Optional user attributes |

<a name="module_optimizely/project_config_schema"></a>

## optimizely/project_config_schema
JSON Schema for datafile

<a name="exp_module_optimizely/project_config_schema--module.exports"></a>

### module.exports ⏏
Project Config JSON Schema file used to validate the project json datafile

**Kind**: Exported member  
<a name="ErrorHandler"></a>

## ErrorHandler : <code>Object</code>
Error Handler module

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| handleError | <code>function</code> | Function which receives an Error |

<a name="EventDispatcher"></a>

## EventDispatcher : <code>Object</code>
Event Dispatcher module

**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| dispatchEvent | [<code>EventDispatcherFn</code>](#EventDispatcherFn) | 

<a name="EventDispatcherFn"></a>

## EventDispatcherFn : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>Event</code> | Event to dispatch |
| callback | <code>function</code> | Function to call when... |

<a name="JSONSchemaValidator"></a>

## JSONSchemaValidator : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| validate | [<code>SchemaValidatorFn</code>](#SchemaValidatorFn) | Function to call to validate schema |

<a name="SchemaValidatorFn"></a>

## SchemaValidatorFn ⇒ <code>Boolean</code>
Validate obj against jsonSchema

**Kind**: global typedef  
**Returns**: <code>Boolean</code> - true if the object is valid  
**Throws**:

- <code>Error</code> if invalid


| Param | Type |
| --- | --- |
| jsonSchema | <code>Object</code> | 
| obj | <code>Object</code> | 

<a name="Logger"></a>

## Logger : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| log | [<code>LogFn</code>](#LogFn) | Log function |

<a name="LogFn"></a>

## LogFn : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| log | <code>Object</code> |  |
| log.logLevel | <code>String</code> | Level of message |
| log.logMessage | <code>String</code> | Text of message |

<a name="UserProfileService"></a>

## UserProfileService : <code>Object</code>
User Profile module that can store and retrieve proiles by User ID. See https://developers.optimizely.com/x/solutions/sdks/reference/index.html?language=javascript#profiles

**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| lookup | [<code>UserProfileLookupFn</code>](#UserProfileLookupFn) | 
| save | [<code>UserProfileSaveFn</code>](#UserProfileSaveFn) | 

<a name="UserProfile"></a>

## UserProfile : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| userId | <code>String</code> |  |
| experiment_bucket_map | [<code>Object.&lt;BucketMap&gt;</code>](#BucketMap) | Map of experimentId to bucket map |

<a name="BucketMap"></a>

## BucketMap : <code>Object</code>
Bucket for a single experiment

**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| variation_id | <code>String</code> | 

<a name="UserProfileLookupFn"></a>

## UserProfileLookupFn ⇒ [<code>UserProfile</code>](#UserProfile)
**Kind**: global typedef  

| Param | Type |
| --- | --- |
| userId | <code>String</code> | 

<a name="UserProfileSaveFn"></a>

## UserProfileSaveFn : <code>function</code>
**Kind**: global typedef  

| Param | Type |
| --- | --- |
| userId | <code>String</code> | 
| userProfile | [<code>UserProfile</code>](#UserProfile) | 

