declare module '@optimizely/js-sdk-datafile-manager' {
	interface DatafileManagerConfig {
		sdkKey: string;
	}
	interface DatafileUpdate {
		datafile: string;
	}
	type Disposer = () => void;

	export class HttpPollingDatafileManager {
		constructor(config: DatafileManagerConfig);
		start(): void;
		onReady(): Promise<void>;
		on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void): Disposer;
		get(): string;
		stop(): Promise<void>;
	}
}
