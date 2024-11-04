import { VuidManager } from ".";
import BrowserAsyncStorageCache from "../key_value_cache/browserAsyncStorageCache";

export const vuidManager = new VuidManager(new BrowserAsyncStorageCache());
