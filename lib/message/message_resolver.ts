import { messages as infoMessages } from 'log_message';
import { messages as errorMessages } from 'error_message';
import { Platform } from '../platform_support';

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

export const __platforms: Platform[] = ['__universal__'];
