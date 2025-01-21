/**
 * Copyright 2020, 2022, Optimizely
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
import { UNKNOWN_MATCH_TYPE } from '../../error_messages';
import { LoggerFacade } from '../../logging/logger';
import { VERSION_TYPE } from '../enums';

/**
 * Evaluate if provided string is number only
 * @param  {unknown}  content
 * @return {boolean}  true if the string is number only
 *
 */
function isNumber(content: string): boolean {
  return /^\d+$/.test(content);
}

/**
 * Evaluate if provided version contains pre-release "-"
 * @param  {unknown}  version
 * @return {boolean}  true if the version contains "-" and meets condition
 *
 */
function isPreReleaseVersion(version: string): boolean {
  const preReleaseIndex = version.indexOf(VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER);
  const buildIndex = version.indexOf(VERSION_TYPE.BUILD_VERSION_DELIMITER);

  if (preReleaseIndex < 0) {
    return false;
  }

  if (buildIndex < 0) {
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
  const preReleaseIndex = version.indexOf(VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER);
  const buildIndex = version.indexOf(VERSION_TYPE.BUILD_VERSION_DELIMITER);

  if (buildIndex < 0) {
    return false;
  }

  if (preReleaseIndex < 0) {
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
  return /\s/.test(version);
}

/**
 * split version in parts
 * @param  {unknown}  version
 * @return {boolean}  The array of version split into smaller parts i.e major, minor, patch etc
 *                    null if given version is in invalid format
 */
function splitVersion(version: string, logger?: LoggerFacade): string[] | null {
  let targetPrefix = version;
  let targetSuffix = '';

  // check that version shouldn't have white space
  if (hasWhiteSpaces(version)) {
    logger?.warn(UNKNOWN_MATCH_TYPE, version);
    return null;
  }
  //check for pre release e.g. 1.0.0-alpha where 'alpha' is a pre release
  //otherwise check for build e.g. 1.0.0+001 where 001 is a build metadata
  if (isPreReleaseVersion(version)) {
    targetPrefix = version.substring(0, version.indexOf(VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER));
    targetSuffix = version.substring(version.indexOf(VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER) + 1);
  } else if (isBuildVersion(version)) {
    targetPrefix = version.substring(0, version.indexOf(VERSION_TYPE.BUILD_VERSION_DELIMITER));
    targetSuffix = version.substring(version.indexOf(VERSION_TYPE.BUILD_VERSION_DELIMITER) + 1);
  }

  // check dot counts in target_prefix
  if (typeof targetPrefix !== 'string' || typeof targetSuffix !== 'string') {
    return null;
  }

  const dotCount = targetPrefix.split('.').length - 1;
  if (dotCount > 2) {
    logger?.warn(UNKNOWN_MATCH_TYPE, version);
    return null;
  }

  const targetVersionParts = targetPrefix.split('.');
  if (targetVersionParts.length != dotCount + 1) {
    logger?.warn(UNKNOWN_MATCH_TYPE, version);
    return null;
  }
  for (const part of targetVersionParts) {
    if (!isNumber(part)) {
      logger?.warn(UNKNOWN_MATCH_TYPE, version);
      return null;
    }
  }

  if (targetSuffix) {
    targetVersionParts.push(targetSuffix);
  }

  return targetVersionParts;
}

/**
 * Compare user version with condition version
 * @param  {string}  conditionsVersion
 * @param  {string}  userProvidedVersion
 * @return {number | null}  0 if user version is equal to condition version
 *                          1 if user version is greater than condition version
 *                         -1 if user version is less than condition version
 *                          null if invalid user or condition version is provided
 */
export function compareVersion(conditionsVersion: string, userProvidedVersion: string, logger?: LoggerFacade): number | null {
  const userVersionParts = splitVersion(userProvidedVersion, logger);
  const conditionsVersionParts = splitVersion(conditionsVersion, logger);

  if (!userVersionParts || !conditionsVersionParts) {
    return null;
  }

  const userVersionPartsLen = userVersionParts.length;

  for (let idx = 0; idx < conditionsVersionParts.length; idx++) {
    if (userVersionPartsLen <= idx) {
      return isPreReleaseVersion(conditionsVersion) || isBuildVersion(conditionsVersion) ? 1 : -1;
    } else if (!isNumber(userVersionParts[idx])) {
      if (userVersionParts[idx] < conditionsVersionParts[idx]) {
        return isPreReleaseVersion(conditionsVersion) && !isPreReleaseVersion(userProvidedVersion) ? 1 : -1;
      } else if (userVersionParts[idx] > conditionsVersionParts[idx]) {
        return !isPreReleaseVersion(conditionsVersion) && isPreReleaseVersion(userProvidedVersion) ? -1 : 1;
      }
    } else {
      const userVersionPart = parseInt(userVersionParts[idx]);
      const conditionsVersionPart = parseInt(conditionsVersionParts[idx]);
      if (userVersionPart > conditionsVersionPart) {
        return 1;
      } else if (userVersionPart < conditionsVersionPart) {
        return -1;
      }
    }
  }

  // check if user version contains release and target version does not
  if (isPreReleaseVersion(userProvidedVersion) && !isPreReleaseVersion(conditionsVersion)) {
    return -1;
  }

  return 0;
}
