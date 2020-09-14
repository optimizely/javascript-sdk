/**
 * Copyright 2016, 2018-2020, Optimizely
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
import { getLogger } from '@optimizely/js-sdk-logging';
import { VERSION_TYPE, LOG_MESSAGES } from '../enums';

const MODULE_NAME = 'SEMANTIC VERSION';
const logger = getLogger();
/**
 * Evaluate if provided version contains pre-release "-"
 * @param  {unknown}  version
 * @return {boolean}  true if the version contains "-" and meets condition
 *                     
 */

function isNumber(content: string): boolean {
    return content.match(/^[0-9]+$/) != null ? true : false;
  }

function isPreReleaseVersion(version: string): boolean {
    const preReleaseIndex = version.indexOf(VERSION_TYPE.IS_PRE_RELEASE);
    const buildIndex = version.indexOf(VERSION_TYPE.IS_BUILD);

    if (preReleaseIndex < 0) {
        return false;
    }

    if (buildIndex < 0 ) {
        return true;
    }

    return preReleaseIndex < buildIndex;
  }
  
  /**
   * Evaluate if provided version contains build "+"
   * @param  {unknown}  version
   * @return {boolean}  true if the version contains "+" and meets condition
   *                     
   */
  function isBuildVersion(version: string): boolean {
    const preReleaseIndex = version.indexOf(VERSION_TYPE.IS_PRE_RELEASE);
    const buildIndex = version.indexOf(VERSION_TYPE.IS_BUILD);

    if (buildIndex < 0) {
        return false;
    }

    if (preReleaseIndex < 0 ) {
        return true;
    }

    return buildIndex < preReleaseIndex;
  }
  
  /**
   * check if there is any white spaces " " in version
   * @param  {unknown}  version
   * @return {boolean}  true if the version contains " "
   *                     
   */
  function hasWhiteSpaces(version: string): boolean {
    return version.includes(' ');
  }
  
  /**
   * split version in parts
   * @param  {unknown}  version
   * @return {boolean}  The array of version split into smaller parts i.e major, minor, patch etc
   *                    null if given version is in invalid format 
   */
  function splitVersion(version: string): string[] | null {
    let targetPrefix = version;
    let targetSuffix = '';
    
    // check that version shouldn't have white space
    if (hasWhiteSpaces(version)) {
      logger.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME, version);
      return null;
    }
    //check for pre release e.g. 1.0.0-alpha where 'alpha' is a pre release
    //otherwise check for build e.g. 1.0.0+001 where 001 is a build metadata
    if (isPreReleaseVersion(version)) {
      targetPrefix = version.substring(0, version.indexOf(VERSION_TYPE.IS_PRE_RELEASE));
      targetSuffix = version.substring(version.indexOf(VERSION_TYPE.IS_PRE_RELEASE) + 1);
    }
    else if (isBuildVersion(version)) {
        targetPrefix = version.substring(0, version.indexOf(VERSION_TYPE.IS_BUILD));
        targetSuffix = version.substring(version.indexOf(VERSION_TYPE.IS_BUILD) + 1);
    }
  
    // check dot counts in target_prefix
    if (typeof targetPrefix === 'string' && typeof targetSuffix === 'string') {
      const dotCount = targetPrefix.split(".").length - 1;
      if (dotCount > 2){
        logger.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME, version);
        return null;
      }
  
      const targetVersionParts = targetPrefix.split(".")
      if (targetVersionParts.length != dotCount + 1) {
        logger.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME, version);
        return null;
      }
      for (const part of targetVersionParts){
        if (!isNumber(part)) {
          logger.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME, version);
          return null;
        }
      }
      
      if (targetSuffix) {
          targetVersionParts.push(targetSuffix)
      }
  
    return targetVersionParts
    }
    else
      return null;
  }
  
  export function compareVersion(conditionsVersion: string, userProvidedVersion: string): number | null {
    const isPreReleaseInconditionsVersion = isPreReleaseVersion(conditionsVersion)
    const isPreReleaseInuserProvidedVersion = isPreReleaseVersion(userProvidedVersion)
    const isBuildInconditionsVersion = isBuildVersion(conditionsVersion)
    const isBuildInuserProvidedVersion = isBuildVersion(userProvidedVersion)
  
    const userVersionParts = splitVersion(userProvidedVersion);
    const conditionsVersionParts = splitVersion(conditionsVersion);
  
    if (!userVersionParts || !conditionsVersionParts)
      return null;
  
    const userVersionPartsLen = userVersionParts.length;
  
    for (let idx = 0; idx < conditionsVersionParts.length; idx++) {
      if (userVersionPartsLen <= idx)
          return isPreReleaseInconditionsVersion || isBuildInconditionsVersion ? 1 : -1
      else if (!isNumber(userVersionParts[idx])) {
        if (userVersionParts[idx] < conditionsVersionParts[idx]) {
          return isPreReleaseInconditionsVersion && !isPreReleaseInuserProvidedVersion ? 1 : -1;
        }
        else if (userVersionParts[idx] > conditionsVersionParts[idx]) {
          return !isPreReleaseInconditionsVersion && isPreReleaseInuserProvidedVersion ? -1 : 1;
        }
      }
      else {
        const userVersionPart = parseInt(userVersionParts[idx])
        const conditionsVersionPart = parseInt(conditionsVersionParts[idx])
        if (userVersionPart > conditionsVersionPart)
            return 1;
        else if (userVersionPart < conditionsVersionPart)
            return -1;
      }
    }
  
    // check if user version contains build or pre-release and target version doesn't
    if ((isPreReleaseInuserProvidedVersion && !isPreReleaseInconditionsVersion) || (isBuildInuserProvidedVersion && !isBuildInconditionsVersion))
      return -1;
      
    return 0;
  }