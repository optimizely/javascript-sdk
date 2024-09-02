import exp from "constants";

export type Fn  = () => void;
export type AsyncTransformer<A, B> = (arg: A) => Promise<B>;

export type Consumer<T> = (arg: T) => void;
export type AsyncComsumer<T> = (arg: T) => Promise<void>;

export type Producer<T> = () => T;
export type AsyncProducer<T> = () => Promise<T>;
