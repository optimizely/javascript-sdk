export interface ResourceLoader<K> {
  load: (connection: ResourceLoaderConnection<K>) => void;
}
export interface LoadedResourceMetadata {
  source: 'fresh' | 'cache';
}
export interface FailedLoadedResourceMetadata extends LoadedResourceMetadata {
  reason: string;
}
export interface ResourceLoaderConnection<K> {
  load: (resource: K, metadata: LoadedResourceMetadata) => void;
  fail: (metadata: FailedLoadedResourceMetadata) => void;
  ready: () => void;
}