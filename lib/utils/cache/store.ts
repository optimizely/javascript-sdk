// import { SyncCache, AsyncCache, Cache, CacheOp, CacheWithOp, OpValue, OperationOf } from "./cache";

// export const isAsync = (operation: 'sync' | 'async'): operation is 'async' => {
//   return operation === 'async';
// }

// const transform = <Op extends CacheOp, VS, VT>(op: Op, value: OpValue<Op, VS>, transformer: (source: VS) => VT): OpValue<Op, VT> => {
//   if (op === 'async') {
//     const val: Promise<VS> = value as any;
//     const ret: Promise<VT> = val.then((v) => transformer(v));
//     return ret as OpValue<Op, VT>;
//   }

//   return transformer(value as VS) as OpValue<Op, VT>;
// }

// export const transformCache = <VS, VT>(
//   cache: Cache<VS>,
//   prefix: string,
//   transformTo: (value: VS) => VT,
//   transformFrom: (value: VT) => VS
// ): CacheWithOp<OperationOf<typeof cache>, VT> => {
//   const addPrefix = (key: string): string => {
//     return `${prefix}${key}`;
//   };

//   const removePrefix = (key: string): string => {
//     return key.substring(prefix.length);
//   };

//   const transformedCache: CacheWithOp<OperationOf<typeof cache>, VT> = {
//     operation: cache.operation,
//     set: (key: string, value: VT) => cache.set(addPrefix(key), transformFrom(value)),
//     get: (key: string) => {
//       const prefixedKey = addPrefix(key);
//       if (cache.operation === 'async') {
//         const value = cache.get(prefixedKey);
//         return value.then((v) => v ? transformTo(v) : undefined);
//       }
//       const value = cache.get(prefixedKey);
//       return value ? transformTo(value) : undefined;
//     },
//     remove: (key: string) => cache.remove(addPrefix(key)),
//     clear: () => cache.clear(),
//     getKeys: () => {
//       if (cache.operation === 'async') {

//       }
//       cache.getKeys(),
//     }
//     getAll: () => {
//       const map = new Map<string, VT>();
//       cache.getAll().forEach((value, key) => {
//         map.set(key, transformTo(value));
//       });
//       return map;
//     }
//   };

//   return transformedCache;
// }

// export class SyncPrefixStore<V = any> implements SyncCache<V> {
//   private cache: SyncCache<V>;
//   private prefix: string;
//   public readonly operation = 'sync';

//   constructor(cache: SyncCache<V>, prefix: string) {
//     this.cache = cache;
//     this.prefix = prefix;
//   }

//   private addPrefix(key: string): string {
//     return `${this.prefix}:${key}`;
//   }

//   private removePrefix(key: string): string {
//     return key.substring(this.prefix.length + 1);
//   }

//   set(key: string, value: V): void {
//     return this.cache.set(this.addPrefix(key), value);
//   }

//   get(key: string): V | undefined{
//     return this.cache.get(this.addPrefix(key));
//   }

//   remove(key: string): void {
//     return this.cache.remove(this.addPrefix(key));
//   }

//   clear(): void {
//     this.getInternalKeys().forEach((key) => this.cache.remove(key));
//   }
  
//   private getInternalKeys(): string[] {
//     return this.cache.getKeys().filter((key) => key.startsWith(this.prefix));
//   }

//   getKeys(): string[] {
//     return this.getInternalKeys().map((key) => this.removePrefix(key));
//   }

//   getAll(): Map<string, V> {
//     const map = new Map<string, V>();
//     this.getInternalKeys().forEach((key) => {
//       const value = this.cache.get(key);
//       if (value) {
//         map.set(this.removePrefix(key), value);        
//       }
//     });
//     return map;
//   }
// }

// // export class SyncPrefixStore<V = any> implements SyncCache<V> {
// //   private cache: SyncCache<V>;
// //   private prefix: string;
// //   public readonly operation = 'sync';

// //   constructor(cache: SyncCache<V>, prefix: string) {
// //     this.cache = cache;
// //     this.prefix = prefix;
// //   }

// //   private addPrefix(key: string): string {
// //     return `${this.prefix}:${key}`;
// //   }

// //   private removePrefix(key: string): string {
// //     return key.substring(this.prefix.length + 1);
// //   }

// //   set(key: string, value: V): void {
// //     return this.cache.set(this.addPrefix(key), value);
// //   }

// //   get(key: string): V | undefined{
// //     return this.cache.get(this.addPrefix(key));
// //   }

// //   remove(key: string): void {
// //     return this.cache.remove(this.addPrefix(key));
// //   }

// //   clear(): void {
// //     this.getInternalKeys().forEach((key) => this.cache.remove(key));
// //   }
  
// //   private getInternalKeys(): string[] {
// //     return this.cache.getKeys().filter((key) => key.startsWith(this.prefix));
// //   }

// //   getKeys(): string[] {
// //     return this.getInternalKeys().map((key) => this.removePrefix(key));
// //   }

// //   getAll(): Map<string, V> {
// //     const map = new Map<string, V>();
// //     this.getInternalKeys().forEach((key) => {
// //       const value = this.cache.get(key);
// //       if (value) {
// //         map.set(this.removePrefix(key), value);        
// //       }
// //     });
// //     return map;
// //   }
// // }


// export class AyncPrefixStore<V = any> implements AsyncCache<V> {
//   private cache: AsyncCache<V>;
//   private prefix: string;
//   public readonly operation = 'async';

//   constructor(cache: AsyncCache<V>, prefix: string) {
//     this.cache = cache;
//     this.prefix = prefix;
//   }

//   private addPrefix(key: string): string {
//     return `${this.prefix}:${key}`;
//   }

//   private removePrefix(key: string): string {
//     return key.substring(this.prefix.length + 1);
//   }

//   set(key: string, value: V): Promise<void> {
//     return this.cache.set(this.addPrefix(key), value);
//   }

//   get(key: string): Promise<V | undefined> {
//     return this.cache.get(this.addPrefix(key));
//   }

//   remove(key: string): Promise<void> {
//     return this.cache.remove(this.addPrefix(key));
//   }

//   async clear(): Promise<void> {
//     const keys = await this.getInternalKeys();
//     await Promise.all(keys.map((key) => this.cache.remove(key)));
//   }
  
//   private async getInternalKeys(): Promise<string[]> {
//     return this.cache.getKeys().then((keys) => keys.filter((key) => key.startsWith(this.prefix)));
//   }

//   async getKeys(): Promise<string[]> {
//     return this.getInternalKeys().then((keys) => keys.map((key) => this.removePrefix(key)));
//   }

//   async getAll(): Promise<Map<string, V>> {
//     const keys = await this.getInternalKeys();
//     const values = await Promise.all(keys.map((key) => this.cache.get(key)));
//     const map = new Map<string, V>();
//     keys.forEach((key, index) => {
//       const value = values[index];
//       if (value) {
//         map.set(this.removePrefix(key), value)
//       }
//     });
//     return map;
//   }
// }
