import { AsyncFn } from "../type";

export interface TaskRunner {
  run(task: AsyncFn): Promise<void>;
  close(): Promise<void>;
}
