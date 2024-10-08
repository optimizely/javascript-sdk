import { Service } from "../../service";
import { BackoffController } from "../repeater/repeater";
import { AsyncFn } from "../type";

export type TaskAcceptedResponse = {
  accepted: true,
  result: Promise<unknown>,
};

export type TaskRejectedResponse = {
  accepted: false,
  error: Error,
};

export type SubmitResponse = TaskAcceptedResponse | TaskRejectedResponse;

export type RetryConfig = {
  backoff?: BackoffController,
  maxRetries?: number,
}

export interface Executor extends Service {
  submit(task: AsyncFn, retryConfig?: RetryConfig): SubmitResponse;
  forceExecuteAll(): Promise<unknown>;
}

