export declare function generateUUID(): string;
export declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export declare function getTimestamp(): number;
/**
 * Validates a value is a valid TypeScript enum
 *
 * @export
 * @param {object} enumToCheck
 * @param {*} value
 * @returns {boolean}
 */
export declare function isValidEnum(enumToCheck: {
    [key: string]: any;
}, value: any): boolean;
export declare function groupBy<K>(arr: K[], grouperFn: (item: K) => string): Array<K[]>;
export declare function objectValues<K>(obj: {
    [key: string]: K;
}): K[];
export declare function objectEntries<K>(obj: {
    [key: string]: K;
}): [string, K][];
export declare function find<K>(arr: K[], cond: (arg: K) => boolean): K | undefined;
export declare function keyBy<K>(arr: K[], keyByFn: (item: K) => string): {
    [key: string]: K;
};
export declare function sprintf(format: string, ...args: any[]): string;
export declare enum NOTIFICATION_TYPES {
    ACTIVATE = "ACTIVATE:experiment, user_id,attributes, variation, event",
    DECISION = "DECISION:type, userId, attributes, decisionInfo",
    LOG_EVENT = "LOG_EVENT:logEvent",
    OPTIMIZELY_CONFIG_UPDATE = "OPTIMIZELY_CONFIG_UPDATE",
    TRACK = "TRACK:event_key, user_id, attributes, event_tags, event"
}
export interface NotificationCenter {
    sendNotifications(notificationType: NOTIFICATION_TYPES, notificationData?: any): void;
}
