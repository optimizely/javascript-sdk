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

function isPreReleaseVersion(version: string): boolean {
    if (version.includes(VERSION_TYPE.IS_PRE_RELEASE)) {
      const userVersionReleaseIndex = version.indexOf(VERSION_TYPE.IS_PRE_RELEASE);
      const userVersionBuildIndex = version.indexOf(VERSION_TYPE.IS_BUILD);
      if ((userVersionReleaseIndex < userVersionBuildIndex) || (userVersionBuildIndex < 0)) {
          return true;
      } 
    }
    return false;
  }
  
  /**
   * Evaluate if provided version contains build "+"
   * @param  {unknown}  version
   * @return {boolean}  true if the version contains "+" and meets condition
   *                     
   */
  function isBuildVersion(version: string): boolean {
    if (version.includes(VERSION_TYPE.IS_BUILD)) {
      const userVersionReleaseIndex = version.indexOf(VERSION_TYPE.IS_PRE_RELEASE);
      const userVersionBuildIndex = version.indexOf(VERSION_TYPE.IS_BUILD);
      if ((userVersionBuildIndex < userVersionReleaseIndex) || (userVersionReleaseIndex < 0)) {
          return true;
      } 
    }
    return false;
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
  function splitVersion(version: unknown): string[] | null {
    let targetPrefix = version;
    let targetSuffix = '';
    
    if (typeof version != 'string') {
      return null;
    }
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
        if (!part.match(/^[0-9]+$/)) {
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
      else if (!userVersionParts[idx].match(/^[0-9]+$/)) {
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
  