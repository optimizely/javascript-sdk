import { OptimizelyDatafile } from './Datafile';
import { ResourceLoader } from './ResourceManager';
export declare class ProvidedDatafileLoader implements ResourceLoader<OptimizelyDatafile> {
    private datafile;
    constructor(config: {
        datafile: OptimizelyDatafile;
    });
    load(): OptimizelyDatafile;
}
declare type FetchUrlCacheMetadata = {
    timestampCached: number;
};
declare type FetchUrlCacheEntry = {
    datafile: OptimizelyDatafile;
    metadata: FetchUrlCacheMetadata;
};
export declare class FetchUrlDatafileLoader implements ResourceLoader<OptimizelyDatafile> {
    private sdkKey;
    private localStorageKey;
    private static MAX_CACHE_AGE_MS;
    constructor(config: {
        sdkKey: string;
        localStorageKey?: string;
    });
    load(): OptimizelyDatafile | Promise<OptimizelyDatafile>;
    saveToCache(datafileToSave: OptimizelyDatafile): void;
    shouldUseCache(cacheResult: FetchUrlCacheEntry): boolean;
    private static GET_METHOD;
    private static READY_STATE_COMPLETE;
    fetchDatafile(): Promise<OptimizelyDatafile>;
    getFromCache(): FetchUrlCacheEntry | null;
}
export {};
