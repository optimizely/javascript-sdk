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

export default class AsyncStorage {
  private static items: Record<string, string> = {};

  static getItem(
    key: string,
    callback?: (error?: Error, result?: string | null) => void
  ): Promise<string | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const value = AsyncStorage.items[key] || null;
        callback?.(undefined, value);
        resolve(value);
      }, 1);
    });
  }

  static setItem(
    key: string,
    value: string,
    callback?: (error?: Error) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        AsyncStorage.items[key] = value;
        callback?.(undefined);
        resolve();
      }, 1);
    });
  }

  static removeItem(
    key: string,
    callback?: (error?: Error, result?: string | null) => void
  ): Promise<string | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const value = AsyncStorage.items[key] || null;
        if (key in AsyncStorage.items) {
          delete AsyncStorage.items[key];
        }
        callback?.(undefined, value);
        resolve(value);
      }, 1);
    });
  }

  static dumpItems(): Record<string, string> {
    return { ...AsyncStorage.items }; // Return a copy for immutability
  }

  static clearStore(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        AsyncStorage.items = {};
        resolve();
      }, 1);
    });
  }
}
