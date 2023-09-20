import * as O from "./option";
import * as R from "./result";

function syncStorage<
  K,
  V,
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
  V,
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

export class MapLocalStorage<K, V> {
  private map: Map<K, V>;
  private path: string;
  forceRender: () => void;

  private constructor(
    path: string,
    forceRender: () => void,
    initialValue: Map<K, V> | IterableIterator<[K, V]> = new Map(),
  ) {
    this.path = path;
    this.forceRender = forceRender;

    const localStorageItemsString = localStorage.getItem(path);
    if (localStorageItemsString) {
      const parsed: Array<[K, V]> = JSON.parse(localStorageItemsString);
      const initialData = parsed.length === 0 ? initialValue : parsed;
      this.map = new Map(initialData);
    } else {
      this.map = new Map(initialValue);
      this.syncLocalStorage();
    }
  }

  static new<K, V>(
    path: string,
    forceRender: () => void,
    initialValue: Map<K, V> | IterableIterator<[K, V]> = new Map(),
  ): R.Result<MapLocalStorage<K, V>, symbol> {
    if (typeof window != "undefined")
      return R.Ok(new MapLocalStorage<K, V>(path, forceRender, initialValue));

    return R.Err(Symbol("Cannot create a storage on serverside"));
  }

  @forceRender
  @syncStorage
  set(key: K, value: V) {
    this.map.set(key, value);
    return R.Ok(this.map.get(key) as V);
  }

  @forceRender
  @syncStorage
  setNotDefined(key: K, value: V) {
    if (!this.map.has(key)) {
      this.map.set(key, value);
      return R.Ok(value);
    }

    return R.Err(Symbol("Key already defined in the Storage"));
  }

  @forceRender
  @syncStorage
  clear() {
    const map = new Map(this.map);
    this.map.clear();

    return map;
  }

  @forceRender
  @syncStorage
  remove(key: K) {
    const value = this.map.get(key);
    if (value != null) {
      this.map.delete(key);
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
        removed.push([key, value]);
      }
    }

    return R.Ok(removed);
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
        filtered.push();
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
    localStorage.setItem(this.path, JSON.stringify(this.thisMapToString()));
  }
}

export type AddValue<V> = Omit<V, "id">;
export type UpdateValue<V> = Partial<AddValue<V>>;
export interface StorageActions<K, V extends Record<string, any> & { id: K }> {
  add(value: AddValue<V>): R.Result<V, symbol>;
  update(id: K, updateValue: UpdateValue<V>): R.Result<V, symbol>;
  remove(id: K): R.Result<V, symbol>;
  removeWithFilter(predicate: (value: V) => boolean): V[];
  removeAll(list: K[]): Array<[K, V]>;
  findById(id: K): O.Option<V>;
  filteredValues(predicate: (value: V) => boolean): V[];
  all(): V[];
}
