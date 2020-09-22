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

declare module '@optimizely/optimizely-sdk/lib/core/projet_config_manager' {
  import { ProjectConfig } from '@optimizely/optimizely-sdk/lib/core/project_config';

  /**
  * ProjectConfigManager provides project config objects via its methods
  * getConfig and onUpdate. It uses a DatafileManager to fetch datafiles. It is
  * responsible for parsing and validating datafiles, and converting datafile
  * JSON objects into project config objects.
  * @param {ProjectConfig}         config
  * @param {Object|string}        config.datafile
  * @param {Object}               config.datafileOptions
  * @param {Object}               config.jsonSchemaValidator
  * @param {string}               config.sdkKey
  */
  export function ProjectConfigManager(config: ProjectConfig): ProjectConfigManager;

  interface ProjectConfigManager {

    /**
     * Returns the current project config object, or null if no project config object
     * is available
     * @return {ProjectConfig|null}
     */
    getConfig(): ProjectConfig | null;

    /**
     * Add a listener for project config updates. The listener will be called
     * whenever this instance has a new project config object available.
     * Returns a dispose function that removes the subscription
     * @param {Function} listener
     * @return {Function}
     */
    onUpdate(): (listener: (config: ProjectConfig) => void) => () => void;

    /**
     * Returns a Promise that fulfills when this ProjectConfigManager is ready to
     * use (meaning it has a valid project config object), or has failed to become
     * ready.
     *
     * Failure can be caused by the following:
     * - At least one of sdkKey or datafile is not provided in the constructor argument
     * - The provided datafile was invalid
     * - The datafile provided by the datafile manager was invalid
     * - The datafile manager failed to fetch a datafile
     *
     * The returned Promise is fulfilled with a result object containing these
     * properties:
     *    - success (boolean): True if this instance is ready to use with a valid
     *                         project config object, or false if it failed to
     *                         become ready
     *    - reason (string=):  If success is false, this is a string property with
     *                         an explanatory message.
     * @return {Promise}
     */
    onReady(): Promise<{ success: boolean; reason?: string }>;

    /**
     * Returns the optimizely config object
     * @return {ProjectConfig}
     */
    getOptimizelyConfig(): ProjectConfig;

    /**
     * Stop the internal datafile manager and remove all update listeners
     * @return {Promise|void}
     */
    stop(): Promise<void> | void;
  }
}
