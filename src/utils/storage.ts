import { Bulk } from "./bulk";
import * as O from "./option";
import * as R from "./result";

function syncStorage<
  K,
  V extends Record<any, any>,
  This extends MapLocalStorage<K, V>,
  Args extends any[],
  Return,
>(
  target: (this: This, ...args: Args) => Return,
  _context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Return
  >,
) {
  function replacementMethod(this: This, ...args: Args): Return {
    const result = target.call(this, ...args);
    this.syncLocalStorage();

    return result;
  }

  return replacementMethod;
}

function forceRender<
  K,
  V extends Record<any, any>,
  This extends MapLocalStorage<K, V>,
  Args extends any[],
  Return,
>(
  target: (this: This, ...args: Args) => Return,
  _context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Return
  >,
) {
  function replacementMethod(this: This, ...args: Args): Return {
    const result = target.call(this, ...args);
    this.forceRender();

    return result;
  }

  return replacementMethod;
}

export class MapLocalStorage<K, V extends Record<any, any>> {
  private map: Map<K, V>;
  private path: string;
  forceRender: () => void;

  indexes?: {
    [From in keyof V]?: Index<From, Exclude<keyof V, From>, V>[];
  };

  private constructor(
    path: string,
    forceRender: () => void,
    initialValue: Map<K, V> | IterableIterator<[K, V]> = new Map(),
    indexes?: {
      [From in keyof V]?: Index<From, Exclude<keyof V, From>, V>[];
    },
  ) {
    this.path = path;
    this.forceRender = forceRender;
    this.indexes = indexes;

    const localStorageItemsString = localStorage.getItem(path);
    if (localStorageItemsString) {
      const parsed: Array<[K, V]> = JSON.parse(
        localStorageItemsString,
        defaultReviver,
      );
      const initialData = parsed.length === 0 ? initialValue : parsed;
      this.map = new Map(initialData);
    } else {
      this.map = new Map(initialValue);
      this.syncLocalStorage();
    }

    for (const value of this.map.values()) {
      this.addIndex(value);
    }
  }

  private addIndex(value: V) {
    const indexes = this.indexes;
    if (indexes) {
      for (const [, toIndexes] of Object.entries(indexes) as [
        keyof V,
        Index<keyof V, Exclude<keyof V, keyof V>, V>[],
      ][]) {
        for (const index of toIndexes) {
          index.add(value);
        }
      }
    }
  }

  private removeIndex(value: V) {
    const indexes = this.indexes;
    if (indexes) {
      for (const [, toIndexes] of Object.entries(indexes) as [
        keyof V,
        Index<keyof V, Exclude<keyof V, keyof V>, V>[],
      ][]) {
        for (const index of toIndexes) {
          index.add(value);
        }
      }
    }
  }

  static new<K, V extends Record<any, any>>(
    path: string,
    forceRender: () => void,
    initialValue: Map<K, V> | IterableIterator<[K, V]> = new Map(),
    indexes?: {
      [From in keyof V]?: Index<From, Exclude<keyof V, From>, V>[];
    },
  ): R.Result<MapLocalStorage<K, V>, symbol> {
    if (typeof window != "undefined")
      return R.Ok(
        new MapLocalStorage<K, V>(path, forceRender, initialValue, indexes),
      );

    return R.Err(Symbol("Cannot create a storage on serverside"));
  }

  @forceRender
  @syncStorage
  set(key: K, value: V) {
    this.map.set(key, value);
    this.addIndex(value);
    return R.Ok(this.map.get(key) as V);
  }

  @forceRender
  @syncStorage
  setNotDefined(key: K, value: V) {
    if (!this.map.has(key)) {
      this.map.set(key, value);
      this.addIndex(value);
      return R.Ok(value);
    }

    return R.Err(Symbol("Key already defined in the Storage"));
  }

  @forceRender
  @syncStorage
  clear() {
    const map = new Map(this.map);
    this.map.clear();
    map.forEach((value) => this.removeIndex(value));

    return map;
  }

  @forceRender
  @syncStorage
  remove(key: K) {
    const value = this.map.get(key);
    if (value != null) {
      this.map.delete(key);
      this.removeIndex(value);
      return R.Ok(value);
    }

    return R.Err(Symbol("Couldn't find any entry associated with this key"));
  }

  @forceRender
  @syncStorage
  removeAll(predicate: (value: V) => boolean) {
    const removed = [] as [K, V][];
    for (const [key, value] of this.map.entries()) {
      if (predicate(value)) {
        this.map.delete(key);
        this.removeIndex(value);
        removed.push([key, value]);
      }
    }

    return R.Ok(removed);
  }

  allWithIndex<A extends keyof V, B extends Exclude<keyof V, A>>(
    from: A,
    to: B,
    value: V[A],
  ): O.Option<string[]> {
    const indexedValues = this.indexes
      ? this.indexes[from]?.find((index) => index.getTo() === to)?.all(value)
      : undefined;

    return indexedValues ? O.Some(indexedValues) : O.None();
  }

  get(key: K) {
    const found = this.map.get(key);
    return found ? O.Some(found) : O.None();
  }

  filterEntries(predicate: (value: V) => boolean) {
    const filtered = [] as [K, V][];
    for (const [key, value] of this.map.entries()) {
      if (predicate(value)) {
        filtered.push([key, value]);
      }
    }

    return filtered;
  }

  filterValues(predicate: (value: V) => boolean) {
    const filtered = [] as V[];
    for (const value of this.map.values()) {
      if (predicate(value)) {
        filtered.push(value);
      }
    }

    return filtered;
  }

  values() {
    return Array.from(this.map.values());
  }

  private thisMapToString() {
    return Array.from(this.map.entries());
  }

  syncLocalStorage() {
    localStorage.setItem(
      this.path,
      JSON.stringify(this.thisMapToString(), defaultReplacer),
    );
  }
}

function defaultReviver<K extends keyof V, V extends Record<any, any>>(
  key: K,
  value: unknown,
) {
  return value != null &&
    typeof value === "object" &&
    "option_type" in value &&
    "value" in value
    ? value["option_type"] === "Some"
      ? O.Some(value.value)
      : value["option_type"] === "None"
      ? O.None()
      : undefined
    : value;
}

function defaultReplacer<K extends keyof V, V extends Record<any, any>>(
  this: V,
  _key: K,
  value: unknown,
) {
  if (value instanceof O.OptionClass) {
    if (value.isSome()) return { option_type: "Some", value: value.unwrap() };
    return { option_type: "None", value: null };
  }

  return value;
}

function treatForOption(value: string | O.Option<string>) {
  return value instanceof O.OptionClass
    ? value.isSome()
      ? value.unwrap()
      : null
    : value;
}

type Sla<From extends KeyType, To extends KeyType> = Record<To, string> &
  Record<From, string>;

type KeyType = string | symbol | number;
export class Index<
  From extends keyof V,
  To extends Exclude<keyof V, From>,
  V extends Record<any, any>,
> {
  private map: Map<string, string[]>;
  private from: From;
  private to: To;
  constructor(map: Map<string, string[]>, from: From, to: To) {
    this.map = map;
    this.from = from;
    this.to = to;
  }

  getFrom() {
    return this.from;
  }

  getTo() {
    return this.to;
  }

  add(value: V) {
    const valueFrom = treatForOption(value[this.from]);
    if (valueFrom == null) return;

    const valueTo = treatForOption(value[this.to]);
    if (valueTo == null) return;

    const found = this.map.get(valueFrom);
    if (found) {
      const valueTo = value[this.to];
      const alreadyRegistered = found.find((index) => valueTo === index);
      if (!alreadyRegistered) {
        found.push(valueTo);
        this.map = new Map(this.map.set(valueFrom, found));
      }

      return;
    }
    this.map = new Map(this.map.set(valueFrom, [valueTo]));
  }

  remove(value: V) {
    const valueFrom = treatForOption(value[this.from]);
    if (valueFrom == null) return;

    const found = this.map.get(valueFrom);
    if (found) {
      const valueTo = value[this.to];
      const foundTo = found.findIndex((value) => value === valueTo);
      if (foundTo >= 0) {
        found.splice(foundTo, 1);
      }

      this.map.set(valueFrom, found);
    }
  }

  all(valueFrom: V[From]) {
    const valueFromTreated = treatForOption(valueFrom);
    if (valueFromTreated == null) return;

    const found = this.map.get(valueFromTreated);
    if (found) {
      return found;
    }
    return [];
  }
}

export type AddValue<V> = Omit<V, "id">;
export type UpdateValue<V> = Partial<AddValue<V>>;
export interface StorageActions<
  K extends keyof V & string,
  V extends Record<string, any> & { id: string },
> {
  add(value: AddValue<V>): Promise<R.Result<V, symbol>>;
  update(id: V[K], updateValue: UpdateValue<V>): Promise<R.Result<V, symbol>>;
  remove(id: V[K]): Promise<R.Result<V, symbol>>;
  removeWithFilter(predicate: (value: V) => boolean): Promise<V[]>;
  removeAll(list: V[K][]): Promise<Array<[V[K], V]>>;
  findById(id: V[K]): Promise<O.Option<V>>;
  filteredValues(predicate: (value: V) => boolean): Promise<V[]>;
  findAll(value: Partial<V>): Promise<V[]>;
  find(searched: Partial<V>): Promise<O.Option<V>>;
  all(): Promise<V[]>;
  bulk(intialValue?: V[]): Bulk<V>;
}
