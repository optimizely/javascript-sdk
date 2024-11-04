import { VuidManager } from ".";
import ReactNativeAsyncStorageCache from "../key_value_cache/reactNativeAsyncStorageCache";

export const vuidManager = new VuidManager(new ReactNativeAsyncStorageCache());
