import { Err, Ok, Result } from "@/utils/result";
import { None, Option, Some } from "@/utils/option";
import { idGenerator } from "@/utils/idGenerator";

export interface StorageAPI<
  K extends keyof V & string,
  V extends Record<string, any>,
> {
  close(): void;
  add(value: Omit<V, K>): Promise<Result<V, symbol>>;
  findById(key: V[K]): Promise<Option<V>>;
  find(searched: Partial<V>): Promise<Option<V>>;
  remove(key: V[K]): Promise<Result<V, symbol>>;
  removeAll(searched: Partial<V>): Promise<Result<V[], symbol>>;
  findAndUpdate(
    searched: Partial<V>,
    updated: Partial<V>,
  ): Promise<Result<V[], symbol>>;
  getAll(): Promise<V[]>;
  findAll(searched: Partial<V>): Promise<V[]>;
}

const DB_NAME = "calendar";
const DB_VERSION = 9;

const requestIntoResult = <T>(
  req: IDBRequest<T>,
): Promise<Result<T, symbol>> => {
  return new Promise((resolve, reject) => {
    req.onsuccess = function (ev) {
      resolve(Ok(this.result));
    };

    req.onerror = function (ev) {
      if (typeof ev.preventDefault === "function") ev.preventDefault();
      resolve(Err(Symbol(this.error?.name)));
    };
  });
};

const transactionIntoResult = (
  transaction: IDBTransaction,
): Promise<Result<null, symbol>> => {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = function () {
      resolve(Ok(null));
    };
    transaction.onerror = function () {
      resolve(Err(Symbol(this.error?.name)));
    };
    transaction.onabort = function () {
      resolve(Err(Symbol(this.error?.name)));
    };
  });
};

const foreachCursor = <V>(
  req: IDBRequest<IDBCursorTyped<V> | null>,
  iterator: (cursor: IDBCursorTyped<V>, stop: () => void) => void,
): Promise<Result<null, symbol>> => {
  return new Promise((resolve, _reject) => {
    const stop = () => {
      resolve(Ok(null));
    };
    req.onsuccess = function (ev) {
      const cursor = this.result;
      if (cursor) {
        iterator(cursor, stop);
      } else {
        resolve(Ok(null));
      }
    };

    req.onerror = function (ev) {
      resolve(Err(Symbol(this.error?.name)));
    };
  });
};

type IDBCursorTyped<V> = IDBCursorWithValue & { readonly value: V | undefined };

const cursorReduce = async <T, V>(
  req: IDBRequest<IDBCursorWithValue | null>,
  iterator: (
    acc: T,
    cursor: Omit<
      IDBCursorTyped<V>,
      "continue" | "advance" | "continuePrimaryKey"
    >,
    stop: () => void,
  ) => T,
  initial: T,
) => {
  let acc = initial;
  const cursorResult = await foreachCursor<V | undefined>(
    req,
    (cursor, stop) => {
      acc = iterator(acc, cursor, stop);
      cursor.continue();
    },
  );

  return cursorResult.map(() => acc);
};

const partialEqual = <V extends Record<string, any>>(
  partial: Partial<V>,
  searched: V,
  keys?: (keyof V)[],
) =>
  !(keys == null
    ? Object.keys(partial).some((key) => {
        searched[key] !== partial[key];
      })
    : keys.some((key) => searched[key] !== partial[key]));

export const openDb = (
  dbName = DB_NAME,
  upgradeCallback: ((
    this: IDBOpenDBRequest,
    db: IDBVersionChangeEvent,
  ) => void)[],
): Promise<Result<IDBDatabase, symbol>> => {
  if (typeof window === undefined)
    return new Promise((resolve) => resolve(Err(Symbol("Client side only"))));

  const req = window.indexedDB.open(dbName, DB_VERSION);

  return new Promise((resolve, reject) => {
    req.onsuccess = function () {
      resolve(Ok(this.result));
    };

    req.onerror = function () {
      resolve(Err(Symbol(this.error?.name)));
    };

    req.onupgradeneeded = function (ev) {
      upgradeCallback.forEach((callback) => callback.call(this, ev));
    };
  });
};

export class IndexedDbStorageBuilder<
  K extends keyof V & string,
  V extends Record<string, any> & { id: string },
> {
  private storeName: string = "";
  private indexesNames: {
    indexName: string;
    keyPath: (keyof V & string)[];
    options?: IDBIndexParameters;
  }[] = new Array(10);
  private defaultValue?: V;
  private key = "id";

  private constructor(defaultValue?: V) {
    this.defaultValue = defaultValue;
  }

  static new<
    K extends keyof V & string,
    V extends Record<string, any> & { id: string },
  >(storeName: string, _defaultValue?: Omit<V, "id">, _key?: K) {
    const builder = new IndexedDbStorageBuilder<K, V>();
    return builder.setStoreName(storeName);
  }

  private setStoreName(name: string) {
    if (this.storeName.length === 0) this.storeName = name;

    return this;
  }

  addIndex(indexConfig: { keyPath: string[]; options?: IDBIndexParameters }) {
    const { keyPath, options } = indexConfig;
    const indexName = keyPath.join(",");

    this.indexesNames.push({ indexName, keyPath, options });

    return this;
  }

  upgradeVersionHandler(): (
    this: IDBOpenDBRequest,
    ev: IDBVersionChangeEvent,
  ) => void {
    const storeName = this.storeName;
    const indexes = this.indexesNames;

    return function (this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) {
      const db = this.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: "id",
        });

        indexes.forEach(({ keyPath, options }) => {
          const indexName = keyPath.join(",");
          store.createIndex(indexName, keyPath, options);
        });
      } else {
        const transaction = (ev.target as any)?.transaction as any;
        const store: IDBObjectStore = transaction.objectStore(storeName);
        Array.from(store.indexNames).forEach((indexName) =>
          store.deleteIndex(indexName),
        );

        indexes.forEach(({ keyPath, options }) => {
          const indexName = keyPath.join(",");
          if (!store.indexNames.contains(indexName)) {
            store.createIndex(indexName, keyPath, options);
          }
        });
      }
    };
  }

  build(
    db: IDBDatabase,
    forceUpdate: () => void,
  ): Result<IndexedDbStorage<K, V>, symbol> {
    if (typeof window !== undefined) {
      return Ok(
        new IndexedDbStorage(
          db,
          this.storeName,
          this.indexesNames,
          forceUpdate,
        ),
      );
    }

    return Err(Symbol("Not Client Side"));
  }
}

function forceRender<
  K extends keyof V & string,
  V extends Record<string, any>,
  This extends IndexedDbStorage<K, V>,
  Args extends any[],
  ReturnT,
>(
  target: (this: This, ...args: Args) => Promise<ReturnT>,
  _context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Promise<ReturnT>
  >,
) {
  function replacementMethod(this: This, ...args: Args): Promise<ReturnT> {
    const result = target.call(this, ...args);
    return result
      .then((value) => {
        this.forceUpdate();
        return value;
      })
      .catch((reason) => {
        this.forceUpdate();
        return reason;
      });
  }

  return replacementMethod;
}

export const NOT_FOUND = Symbol("Record Not Found");
export const COULDNT_CREATE = Symbol("Couldn't Create New Record");

class IndexedDbStorage<
  K extends keyof V & string,
  V extends Record<string, any>,
> implements StorageAPI<K, V>
{
  private db: IDBDatabase;
  private storeName: string;
  private indexesNames: Map<string, Set<string>> = new Map();
  forceUpdate: () => void;

  constructor(
    db: IDBDatabase,
    storeName: string,
    indexes: {
      keyPath: (keyof V & string)[];
      options?: IDBIndexParameters;
    }[],
    forceUpdate: () => void,
  ) {
    indexes.forEach(({ keyPath }) => {
      const indexName = keyPath.join(",");
      keyPath.forEach((key) => {
        const keyEntry = this.indexesNames.get(key);
        if (!keyEntry) return this.indexesNames.set(key, new Set([indexName]));

        keyEntry.add(indexName);
        this.indexesNames.set(key, keyEntry);
      });
    });

    this.db = db;
    this.storeName = storeName;
    this.forceUpdate = forceUpdate;
  }

  @forceRender
  add(value: Omit<V, K>): Promise<Result<V, symbol>> {
    const resultAsync = async () => {
      return (
        await this.storeOperation(async (store) => {
          const idGenerated = idGenerator();

          const addedKey = await requestIntoResult(
            store.add({ ...value, id: idGenerated }),
          );
          const valueFound = await addedKey
            .map(
              async (addedKey) =>
                await requestIntoResult<V | undefined>(store.get(addedKey)),
            )
            .asyncFlatten();

          return valueFound.andThen((value) =>
            value != null ? Ok(value) : Err(COULDNT_CREATE),
          );
        }, "readwrite")
      ).flatten();
    };

    return resultAsync();
  }

  findById(key: V[K]): Promise<Option<V>> {
    const resultAsync = async () => {
      const storeOperation = await this.storeOperation(async (store) => {
        const foundValue = await requestIntoResult<V | undefined>(
          store.get(key),
        );

        return foundValue
          .map(() =>
            foundValue.map((value) => (value != null ? Some(value) : None())),
          )
          .flatten()
          .option()
          .flatten();
      }, "readonly");

      return storeOperation.option().flatten();
    };
    return resultAsync();
  }

  async storeOperation<T>(
    op: (store: IDBObjectStore) => Promise<T>,
    mode: "readonly" | "readwrite" | "versionchange",
  ): Promise<Result<T, symbol>> {
    try {
      const transaction = this.db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      const [opResult, transactionResult] = await Promise.all([
        op(store),
        transactionIntoResult(transaction),
      ]);

      return Ok(opResult);
    } catch (e) {
      return Err(Symbol("Transaction Error"));
    }
  }

  selectPlan(
    searched: Partial<V>,
  ): [
    indexKeys: string,
    query: (string | V[string])[],
    notCovered: (keyof V & string)[],
  ] {
    if (this.indexesNames.size === 0) {
      return ["", [""], []];
    }

    const aList = Object.keys(searched).reduce(
      (acc, key) => {
        const indexesNames = this.indexesNames.get(key);
        if (!indexesNames)
          return {
            indexesNames: acc.indexesNames,
            notFound: [...acc.notFound, key],
          };

        if (acc.indexesNames.length === 0) {
          return {
            indexesNames: Array.from(indexesNames.values()),
            notFound: acc.notFound,
          };
        }

        return {
          indexesNames: acc.indexesNames.filter((possibleIndexes) =>
            possibleIndexes.includes(key),
          ),
          notFound: acc.notFound,
        };
      },
      { indexesNames: [], notFound: [] } as {
        indexesNames: string[];
        notFound: string[];
      },
    );
    const keysWithIndex = Object.keys(searched).filter(
      (key) => !aList.notFound.includes(key),
    );

    const indexMatches = aList.indexesNames
      .map((indexName) =>
        indexName
          .split(",")
          .reduce(
            (count, indexKey) =>
              keysWithIndex.includes(indexKey) ? count + 1 : count - 1,
            0,
          ),
      )
      .reduce(
        ([max, maxIndex], value, index) =>
          value > max
            ? ([value, index] as [number, number])
            : ([max, maxIndex] as [number, number]),
        [-1, -1] as [maxValue: number, maxIndex: number],
      );

    const indexKeys = aList.indexesNames[indexMatches[1]];

    const indexKeySplitted = indexKeys.split(",");

    const query = indexKeySplitted.reduce((acc, indexKey, currentIndex) => {
      if (!Object.keys(searched).includes(indexKey)) {
        return acc;
      }

      const value = searched[indexKey];
      acc[currentIndex] =
        value === true
          ? "true"
          : value === false
          ? "false"
          : value === null
          ? "null"
          : value === undefined
          ? "undefined"
          : value;

      return acc;
    }, new Array<V[string] | string>(indexKeySplitted.length));

    if (Object.values(query).length !== query.length) {
      return ["", query, aList.notFound];
    }

    return [indexKeys, query, aList.notFound];
  }

  find(searched: Partial<V>): Promise<Option<V>> {
    const [indexKeys, query, notFound] = this.selectPlan(searched);
    const resultAsync = async () => {
      const storeOperation = await this.storeOperation(async (store) => {
        let cursorReq;
        let keys: (keyof V)[];
        if (indexKeys.length > 0) {
          const index = store.index(indexKeys);

          if (notFound.length === 0) {
            return await requestIntoResult<V | undefined>(index.get(query));
          }

          cursorReq = store.openCursor(query);
          keys = notFound;
        } else {
          cursorReq = store.openCursor();
          keys = Object.keys(searched);
        }

        const cursor = await cursorReduce(
          cursorReq,
          (acc, cursor, stop) => {
            if (partialEqual(searched, cursor.value, keys)) {
              acc = cursor.value;
              stop();
            }

            return acc;
          },
          undefined,
        );

        return cursor.map((found) => found);
      }, "readonly");

      return storeOperation
        .flatten()
        .option()
        .map((value) => (value == null ? None() : Some(value)))
        .flatten();
    };
    return resultAsync();
  }

  @forceRender
  remove(key: V[K]): Promise<Result<V, symbol>> {
    const resultAsync = async () => {
      return (
        await this.storeOperation(async (store) => {
          const [foundValue, result] = await Promise.all([
            requestIntoResult<V>(store.get(key)),
            requestIntoResult(store.delete(key)),
          ]);

          return result
            .map((result) => (result == null ? Err(NOT_FOUND) : foundValue))
            .flatten();
        }, "readwrite")
      ).flatten();
    };

    return resultAsync();
  }

  @forceRender
  removeAll(searched: Partial<V>): Promise<Result<V[], symbol>> {
    const [indexName, query, notFound] = this.selectPlan(searched);
    const resultAsync = async () => {
      return (
        await this.storeOperation(async (store) => {
          let cursorReq;
          let keys: (keyof V)[] | undefined = undefined;
          if (indexName.length > 0) {
            cursorReq = store.index(indexName).openCursor(query);
            keys = notFound;
          } else {
            cursorReq = store.openCursor();
            keys = Object.keys(searched);
          }

          const result = await cursorReduce<V[], V>(
            cursorReq,
            (acc, cursor) => {
              const matches = partialEqual(searched, cursor.value, keys);
              if (matches) {
                const value = cursor.value;
                cursor.delete().onsuccess = () => {
                  acc.push(value);
                };
              }

              return acc;
            },
            [],
          );

          return result
            .map((deleted) =>
              deleted.length === 0 ? Err(NOT_FOUND) : Ok(deleted),
            )
            .flatten();
        }, "readwrite")
      ).flatten();
    };

    return resultAsync();
  }

  @forceRender
  findAndUpdate(
    searched: Partial<V>,
    updated: Partial<V>,
  ): Promise<Result<V[], symbol>> {
    return (async () => {
      const [indexKeys, query, notFound] = this.selectPlan(searched);
      const result = await this.storeOperation(async (store) => {
        let cursorReq;
        let keys: (keyof V)[];

        if (indexKeys.length > 0) {
          cursorReq = store.index(indexKeys).openCursor(query);
          keys = notFound;
        } else {
          cursorReq = store.openCursor();
          keys = Object.keys(searched);
        }

        const result = await cursorReduce<V[], V>(
          cursorReq,
          (acc, cursor) => {
            const value = cursor.value;
            const matches = partialEqual(searched, value, keys);

            if (matches) {
              const updatedValue = { ...value, ...updated };
              requestIntoResult(cursor.update(updatedValue)).then(() => {
                acc.push(value);
              });
            }

            return acc;
          },
          [],
        );

        return result.andThen((list) =>
          list.length === 0 ? Err(NOT_FOUND) : Ok(list),
        );
      }, "readwrite");

      return result.flatten();
    })();
  }

  getAll(): Promise<V[]> {
    return (async () =>
      (
        await this.storeOperation(
          async (store) => await requestIntoResult<V[]>(store.getAll()),
          "readonly",
        )
      )
        .flatten()
        .mapOrElse(
          () => [],
          (result) => result,
        ))();
  }

  findAll(searched: Partial<V>): Promise<V[]> {
    const [indexKeys, query, notFound] = this.selectPlan(searched);
    const resultAsync = async () => {
      const storeOperation = await this.storeOperation(async (store) => {
        let cursorReq;
        let keys: (keyof V)[];
        if (indexKeys.length > 0) {
          const index = store.index(indexKeys);
          if (notFound.length === 0) {
            const queryResult = await requestIntoResult<V[]>(
              index.getAll(query),
            );

            return queryResult;
          }

          cursorReq = index.openCursor(query);
          keys = notFound;
        } else {
          cursorReq = store.openCursor();
          keys = Object.keys(searched);
        }

        const result = await cursorReduce(
          cursorReq,
          (acc, cursor) => {
            if (partialEqual(searched, cursor.value, keys)) {
              acc.push(cursor.value);
            }

            return acc;
          },
          [] as V[],
        );

        return result;
      }, "readonly");

      return storeOperation.flatten().unwrapOrElse(() => []);
    };
    return resultAsync();
  }

  close(): void {
    this.db.close();
  }
}

export type { IndexedDbStorage };
