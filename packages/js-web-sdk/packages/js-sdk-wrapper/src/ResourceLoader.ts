export interface ResourceLoader<K> {
  load: (observer: ResourceObserver<K>) => void;
}
export interface LoadedResourceMetadata {
  source: 'fresh' | 'cache';
}
export interface FailedLoadedResourceMetadata extends LoadedResourceMetadata {
  reason: string;
}
export interface ResourceObserver<K> {
  next: (data: {resource: K, metadata: LoadedResourceMetadata}) => void;
  error: (metadata: FailedLoadedResourceMetadata) => void;
  complete: () => void;
}