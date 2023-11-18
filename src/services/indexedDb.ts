import { Err, Ok, Result } from "@/utils/result";
import { None, Option, Some } from "@/utils/option";
import { idGenerator } from "@/utils/idGenerator";

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

const DB_NAME = "calendar";
const DB_VERSION = 6;

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

const foreachCursor = (
  req: IDBRequest<IDBCursorWithValue | null>,
  iterator: (cursor: IDBCursorWithValue, stop: () => void) => void,
): Promise<Result<null, symbol>> => {
  return new Promise((resolve, _reject) => {
    req.onsuccess = function (ev) {
      const cursor = this.result;
      if (cursor) {
        iterator(cursor, () => {
          resolve(Ok(null));
        });
      } else {
        resolve(Ok(null));
      }
    };

    req.onerror = function (ev) {
      resolve(Err(Symbol(this.error?.name)));
    };
  });
};

export class IndexedDbStorage<
  K extends keyof V & string,
  V extends Record<string, any>,
> implements StorageAPI<K, V>
{
  private db: IDBDatabase;
  private storeName: string;
  private indexesNames: Map<string, Set<string>> = new Map();
  constructor(
    db: IDBDatabase,
    storeName: string,
    indexes: {
      keyPath: (keyof V & string)[];
      options?: IDBIndexParameters;
    }[],
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
  }

  add(value: Omit<V, "id">): Promise<Result<V, symbol>> {
    const resultAsync = async () => {
      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      const idGenerated = idGenerator();

      const addedKey = await requestIntoResult(
        store.add({ ...value, id: idGenerated }),
      );
      const valueFound = await addedKey
        .map(
          async (addedKey) => await requestIntoResult<V>(store.get(addedKey)),
        )
        .asyncFlatten();

      const transactionFinished = await transactionIntoResult(transaction);

      return transactionFinished.map(() => valueFound).flatten();
    };

    return resultAsync();
  }

  findById(key: V[K]): Promise<Option<V>> {
    const resultAsync = async () => {
      const transaction = this.db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);

      const foundValue = await requestIntoResult<V | undefined>(store.get(key));

      const transactionFinished = await transactionIntoResult(transaction);

      return transactionFinished
        .map(() =>
          foundValue.map((value) => (value != null ? Some(value) : None())),
        )
        .flatten()
        .option()
        .flatten();
    };
    return resultAsync();
  }

  async storeOperation<T>(
    op: (store: IDBObjectStore) => Promise<T>,
    mode: "readonly" | "readwrite" | "versionchange",
  ) {
    const transaction = this.db.transaction(this.storeName, mode);
    const store = transaction.objectStore(this.storeName);

    return await op(store);
  }

  static upgradeVersionHandler<V extends Record<string, any>>(
    storeName: string,
    indexes: {
      keyPath: (keyof V & string)[];
      options?: IDBIndexParameters;
    }[],
  ) {
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

        console.log(store.indexNames);
      } else {
        const transaction = (ev.target as any)?.transaction as any;
        const store = transaction.objectStore(storeName);
        indexes.forEach(({ keyPath, options }) => {
          const indexName = keyPath.join(",");
          if (!store.indexNames.contains(indexName)) {
            console.log(store.createIndex(indexName, keyPath, options));
          }
        });
        console.log(store.indexNames);
      }
    };
  }

  find(searched: Partial<V>): Promise<Option<V>> {
    const resultAsync = async () => {
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

      console.log(aList, this.indexesNames);

      const indexKeys = aList.indexesNames.reduce((previous, current) =>
        current.length > previous.length ? current : previous,
      );

      const indexKeySplitted = indexKeys.split(",");

      const query = Object.keys(searched).reduce(
        (acc, key) => {
          const index = indexKeySplitted.findIndex(
            (indexKey) => indexKey === key,
          );
          acc.splice(index, 1, searched[key] as V[string]);

          return acc;
        },
        new Array(indexKeySplitted.length) as V[string][],
      );

      const storeOperation = await this.storeOperation(async (store) => {
        if (indexKeys.length > 0) {
          console.log(store.indexNames);
          const index = store.index(indexKeys);
          const queryResult = await requestIntoResult<V>(index.get(query));

          if (aList.notFound.length != 0) {
            return queryResult
              .map((value) =>
                aList.notFound.some(
                  (current) => value[current] !== searched[current],
                )
                  ? Err(Symbol("Item Not Found"))
                  : Ok(value),
              )
              .flatten();
          }
          return queryResult;
        }

        let found: V;

        const keys = Object.keys(searched);

        const cursor = await foreachCursor(
          store.openCursor(),
          (cursor, stop) => {
            if (
              keys.some((searchedKey) => searched[searchedKey] !== cursor.value)
            )
              cursor.continue();

            found = cursor.value;
            stop();
          },
        );

        return cursor.map(() => found);
      }, "readonly");

      return storeOperation.option();
    };
    return resultAsync();
  }

  remove(key: K): Promise<Result<V, symbol>> {
    throw new Error("Method not implemented.");
  }

  removeAll(searched: [Partial<V>]): Promise<Result<V, symbol>> {
    throw new Error("Method not implemented.");
  }

  findAndUpdate(searched: Partial<V>, updated: Partial<V>): Promise<V[]> {
    throw new Error("Method not implemented.");
  }

  getAll(): Promise<V[]> {
    throw new Error("Method not implemented.");
  }

  cursor(): Promise<Iterator<V, any, undefined>> {
    throw new Error("Method not implemented.");
  }
}
