import { Platform } from './../platform_support';
import { messages as infoMessages } from 'log_message';
import { messages as errorMessages } from 'error_message';

export const __platforms: Platform[] = ['__universal__'];

export interface MessageResolver {
  resolve(baseMessage: string): string;
}

export const infoResolver: MessageResolver = {
  resolve(baseMessage: string): string {
    const messageNum = parseInt(baseMessage);
    return infoMessages[messageNum] || baseMessage;
  }
};

export const errorResolver: MessageResolver = {
  resolve(baseMessage: string): string {
    const messageNum = parseInt(baseMessage);
    return errorMessages[messageNum] || baseMessage;
  }
};
