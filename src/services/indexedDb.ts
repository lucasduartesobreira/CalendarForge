import { Err, Ok, Result } from "@/utils/result";
import { None, Option, Some } from "@/utils/option";

export interface StorageAPI<
  K extends keyof V & string,
  V extends Record<string, any>,
> {
  add(value: V): Promise<Result<V, symbol>>;
  findById(key: V[K]): Promise<Option<V>>;
  find(searched: Partial<V>): Promise<Option<V>>;
  remove(key: V[K]): Promise<Result<V, symbol>>;
  removeAll(searched: [Partial<V>]): Promise<Result<V, symbol>>;
  findAndUpdate(searched: Partial<V>, updated: Partial<V>): Promise<V[]>;
  getAll(): Promise<V[]>;
  cursor(): Promise<Iterator<V>>;
}
