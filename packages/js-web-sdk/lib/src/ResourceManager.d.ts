export interface ResourceLoader<K> {
    load: () => K | Promise<K>;
}
export declare class Resource<K> {
    private loader;
    private _value?;
    private _hasLoaded;
    readonly promise: Promise<K>;
    readonly value: K | undefined;
    readonly hasLoaded: boolean;
    constructor(loader: ResourceLoader<K>);
    private updateStateFromLoadResult;
    private load;
}
