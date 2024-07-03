export const ErrorMessage = {
  INVALID_DATAFILE: '%s: Datafile is invalid - property %s: %s',
}

export type ErrorMessageKey = keyof typeof ErrorMessage;

export const LogMessage = {
  ACTIVATE_USER: '%s: Activating user %s in experiment %s.'
}

export type LogMessageKey = keyof typeof LogMessage;

export type MessageKey = LogMessageKey | ErrorMessageKey;

type IsNever<T> = [T] extends [never] ? true : false;

const noIntersection : IsNever<ErrorMessageKey & LogMessageKey> = true;
