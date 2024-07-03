import { ErrorMessage, LogMessage, ErrorMessageKey, LogMessageKey, MessageKey } from "./message";

export interface MessageResolver {
  resolve(messageKey: MessageKey, messageArguments: string[]): string;
}

export const errorMessageResolver: MessageResolver = {
  resolve: (messageKey: MessageKey, messageArguments: string[]): string => {
    if (messageKey in ErrorMessage) {
      return ErrorMessage[messageKey as ErrorMessageKey];
    }
    return '';
  }
};

// export const allMessageResolver: MessageResolver = {
//   resolveLogMessage: (messageKey: LogMessageKey, messageArguments: string[]): string => {
//     return LogMessage[messageKey];
//   },

//   resolveErrorMessage: (messageKey: ErrorMessageKey, messageArguments: string[]): string => {
//     return ErrorMessage[messageKey];
//   },
// };
