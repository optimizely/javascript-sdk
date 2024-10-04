import { Service } from "../../service";
import { AsyncFn } from "../type";

export interface Executor extends Service {
  execute(task: AsyncFn): Promise<void>;
}
