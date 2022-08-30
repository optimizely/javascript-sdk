import PersistentKeyValueCache from './persistentKeyValueCache';
export default class ReactNativeAsyncStorageCache implements PersistentKeyValueCache {
    get(key: string): Promise<string>;
    set(key: string, val: string): Promise<void>;
    contains(key: string): Promise<boolean>;
    remove(key: string): Promise<void>;
}
