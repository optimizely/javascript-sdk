import murmurhash from 'murmurhash';
import { datafile } from './datafile.js';

console.log('uid hunt');

const HASH_SEED = 1;
const MAX_HASH_VALUE = Math.pow(2, 32);
const MAX_TRAFFIC_VALUE = 10000;

/**
 * Helper function to generate bucket value in half-closed interval [0, MAX_TRAFFIC_VALUE)
 * @param  {string}               bucketingKey          String value for bucketing
 * @return {number}               The generated bucket value
 * @throws                        If bucketing value is not a valid string
 */
export const generateBucketValue = function(bucketingKey: string): number {
  try {
    // NOTE: the mmh library already does cast the hash value as an unsigned 32bit int
    // https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L115
    const hashValue = murmurhash.v3(bucketingKey, HASH_SEED);
    const ratio = hashValue / MAX_HASH_VALUE;
    return Math.floor(ratio * MAX_TRAFFIC_VALUE);
  } catch (ex) {
    throw new Error('Invalid bucketing key provided for bucketing');
  }
};

const sdkKey = 'WnRFQEiC9BN6aWjBP78pf';

const fetchDatafile = async (sdkKey: string) => {
  const url = `https://cdn.optimizely.com/datafiles/${sdkKey}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch datafile: ${response.statusText}`);
  }
  return await response.json();
};


// const datafile = await fetchDatafile(sdkKey);
const holdouts = datafile.holdouts;

const data = holdouts.map(holdout => {
  return {
    key: holdout.key,
    id: holdout.id,
    trafficAllocation: holdout.trafficAllocation[0].endOfRange,
  };
});

console.log('==== holdout list =====')
data.forEach((ho) => {
  console.log(ho.key, ho.id);
});


// const findUid = (hid: string, min: number, max: number) => {
//   let cur = 1;
//   while(true) {
//     const uid = `user-${cur}`;
//     const bucketingKey = `${uid}${hid}`;
//     const bucket = generateBucketValue(bucketingKey);
//     if (bucket > min && bucket < max) {
//       return { uid, bucket };
//     }
//     cur++;
//   }
// }

// console.log(data.map((d, i) => {
//   const uid = findUid(d.id, i ? data[i - 1].trafficAllocation : 0, d.trafficAllocation);
//   return {
//     ...d,
//     ...uid,
//   }
// }));

// data.push({
//   ...findUid()
// })


console.log('==== user holdouts =====');

for(let i = 0; i < 20; i++) {
  const uid = `user-${i + 1}`;
  const hos = []
  for (let ho of holdouts) {
    const bucketingKey = `${uid}${ho.id}`;
    const bucket = generateBucketValue(bucketingKey);
    if (bucket < ho.trafficAllocation[0].endOfRange) {
      hos.push(ho.key);
    }
  }
  console.log(uid, hos);
}