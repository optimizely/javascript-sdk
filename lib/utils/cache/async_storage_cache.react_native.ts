import { Maybe } from "../type";
import { AsyncCache } from "./cache";
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AsyncStorageCache<V> implements AsyncCache<V> {
  public readonly operation = 'async';

  async get(key: string): Promise<V | undefined> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  }

  async remove(key: string): Promise<unknown> {
    return AsyncStorage.removeItem(key);
  }

  async set(key: string, val: V): Promise<unknown> {
    return AsyncStorage.setItem(key, JSON.stringify(val));
  }

  async clear(): Promise<unknown> {
    return AsyncStorage.clear();
  }

  async getKeys(): Promise<string[]> {
    return [... await AsyncStorage.getAllKeys()];
  }

  async getBatched(keys: string[]): Promise<Maybe<V>[]> {
    const items = await AsyncStorage.multiGet(keys);
    return items.map(([key, value]) => value ? JSON.parse(value) : undefined);
  }
}
