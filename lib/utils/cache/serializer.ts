
/**
 * The initial implementation of store interfaces for browser and react_native did not support TTL. 
 * They just JSON.stringified the value and saved it on set, and returned the 
 * parsed value on get.
 * 
 * To support TTL without breaking existing data, we introduce a version value to the serialized data. If the version is missing, we assume its
 * the old format without TTL. the version is set to 1 for the new format with TTL. the new format of the serialized data is:
 * `${version}:${JSON.stringify({ value, createdAt })}`
 * 
 *  extractValue and serializeValue handle the serialization and deserialization logic.
 */

export type ValueWithTimestamp<V> = {
  value: V;
  createdAt: number;
};

const CURRENT_DATA_VERSION = 1;

export const serializeValue = <V>(value: V): string => {
  const data: ValueWithTimestamp<V> = {
    value,
    createdAt: Date.now(),
  };
  return `${CURRENT_DATA_VERSION}:${JSON.stringify(data)}`;
}

export const extractValue = <V>(storedValue: string): ValueWithTimestamp<V> => {
  // old format without version
  if (storedValue[0] === '{') {
    return {
      value: JSON.parse(storedValue) as V,
      createdAt: 0,
    };
  }

  const separatorIndex = storedValue.indexOf(':');

  // the value of version is not used currently as it's always 1
  const payload = storedValue.substring(separatorIndex + 1);

  return JSON.parse(payload) as ValueWithTimestamp<V>;
}
