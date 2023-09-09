import { None, Some } from "./option";
import { Err, Ok, Result } from "./result";

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
  ): Result<MapLocalStorage<K, V>, symbol> {
    if (typeof window != "undefined")
      return Ok(new MapLocalStorage<K, V>(path, forceRender, initialValue));

    return Err(Symbol("Cannot create a storage on serverside"));
  }

  @forceRender
  @syncStorage
  set(key: K, value: V) {
    this.map.set(key, value);
    return Ok(this.map.get(key) as V);
  }

  @forceRender
  @syncStorage
  setNotDefined(key: K, value: V) {
    if (this.map.has(key)) {
      this.map.set(key, value);
      return Ok(value);
    }

    return Err(Symbol("Key already defined in the Storage"));
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
    if (key != null) {
      this.map.delete(key);
      return Ok(value);
    }

    return Err(Symbol("Couldn't find any entry associated with this key"));
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

    return Ok(removed);
  }

  get(key: K) {
    const found = this.map.get(key);
    return found ? Some(found) : None();
  }

  filter(predicate: (value: V) => boolean) {
    const filtered = [] as [K, V][];
    for (const [key, value] of this.map.entries()) {
      if (predicate(value)) {
        filtered.push([key, value]);
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
