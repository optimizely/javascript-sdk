import { errorResolver } from "../message/message_resolver";
import { ErrorHandler } from "./error_handler";
import { DefaultErrorNotifier } from "./error_notifier";

const errorNotifierSymbol = Symbol();

export type OpaqueErrorNotifier = {
  [errorNotifierSymbol]: unknown;
};

export const createErrorNotifier = (errorHandler: ErrorHandler): OpaqueErrorNotifier => {
  return {
    [errorNotifierSymbol]: new DefaultErrorNotifier(errorHandler, errorResolver),
  }
}

export const extractErrorNotifier = (errorNotifier: OpaqueErrorNotifier): DefaultErrorNotifier => {
  return errorNotifier[errorNotifierSymbol] as DefaultErrorNotifier;
}
