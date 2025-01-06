import { messages as infoMessages } from '../log_messages';
import { messages as errorMessages } from '../error_messages';

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
