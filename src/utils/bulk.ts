import { NOT_FOUND, StorageAPI } from "./indexedDb";
import { idGenerator } from "./idGenerator";
import { Err, Ok, Result } from "./result";

type WithId<V extends Record<string, any>> = V & { id: string };
type RecordWithId = WithId<Record<string, any>>;

type RemoveId<V extends RecordWithId> = Omit<V, "id">;
type Operation<V extends RecordWithId> =
  | {
      id: string;
      type: "UPDATE";
      value: RemoveId<V>;
      oldType: "UPDATE" | "DELETE" | "NOTHING";
    }
  | {
      id: string;
      type: "DELETE";
      value: RemoveId<V>;
      oldType: "UPDATE" | "DELETE" | "INSERT" | "NOTHING";
    }
  | {
      id: string;
      type: "INSERT";
      value: RemoveId<V>;
      oldType: "DELETE" | "INSERT";
    }
  | {
      id: string;
      type: "NOTHING";
      value: RemoveId<V>;
      oldType: "NOTHING";
    };

const BULK_NOT_FOUND = Symbol("Registry Not Found");

type OpCommitError<V extends RecordWithId> = { err: symbol; op: Operation<V> };

type OpCommitOk<V extends RecordWithId> =
  | {
      id: string;
      newValue: Omit<V, "id">;
      type: "INSERT";
      revertOp: { type: "DELETE"; value: null };
    }
  | {
      id: string;
      newValue: null;
      type: "DELETE";
      revertOp: { type: "INSERT"; value: Omit<V, "id"> };
    }
  | {
      id: string;
      newValue: Omit<V, "id">;
      type: "UPDATE";
      revertOp: { type: "UPDATE"; value: Omit<V, "id"> };
    }
  | {
      id: string;
      newValue: Omit<V, "id">;
      type: "NOTHING";
      revertOp: { type: "NOTHING"; value: Omit<V, "id"> };
    };

export class Bulk<V extends RecordWithId> {
  private ops: Array<Operation<V>>;
  private storage: StorageAPI<"id", V>;

  constructor(initial: V[], storageApi: StorageAPI<"id", V>) {
    this.ops = initial.map(({ id, ...value }) => ({
      id,
      type: "NOTHING",
      value: value,
      oldType: "NOTHING",
    }));

    this.storage = storageApi;
  }

  list(): V[] {
    return this.ops.map(({ id, value }) => ({ id, ...value }) as V);
  }

  update(value: WithId<Partial<V>>): Result<V, symbol> {
    const { id, ...update } = value;

    const foundIndex = this.ops.findIndex((value) => value.id === id);

    if (foundIndex === -1) {
      return Err(BULK_NOT_FOUND);
    }

    const { id: opId, type: opType, value: opValue } = this.ops[foundIndex];

    if (opType !== "INSERT") {
      this.ops[foundIndex].oldType = opType;
      this.ops[foundIndex].type = "UPDATE";
    }

    const updatedValue = { ...opValue, ...update };
    this.ops[foundIndex].value = updatedValue;

    return Ok({ id: opId, ...updatedValue } as V);
  }

  insert(value: RemoveId<V>): Result<V, symbol> {
    const idGenerated = idGenerator();
    this.ops.push({
      id: idGenerated,
      value,
      type: "INSERT",
      oldType: "INSERT",
    });

    return Ok({ id: idGenerated, ...value } as V);
  }

  delete(id: string): Result<null, symbol> {
    const opFoundIndex = this.ops.findIndex((value) => value.id === id);

    if (opFoundIndex === -1) return Err(BULK_NOT_FOUND);

    this.ops[opFoundIndex].oldType = this.ops[opFoundIndex].type;
    this.ops[opFoundIndex].type = "DELETE";

    return Ok(null);
  }

  private retryCount = 0;
  private state:
    | "COMMITING"
    | "RETRYING"
    | "ROLLBACKING"
    | "COMMITED"
    | "NOTSTARTED" = "NOTSTARTED";
  private missingCommit: Array<Operation<V>> = [];
  private rollbacks: Array<OpCommitOk<V>> = [];

  async commit(): Promise<Result<null, symbol>> {
    if (this.state === "NOTSTARTED") this.state = "COMMITING";

    if (this.state === "COMMITED")
      return Err(Symbol("Bulk transaction already commited"));

    if (this.state === "RETRYING") return this.retry();

    if (this.state === "ROLLBACKING") return this.rollback();

    const triedToCommit = await this.tryCommit(this.ops);

    if (triedToCommit.some((value) => !value.isOk())) {
      triedToCommit.map((value) =>
        value
          .map((value) => this.rollbacks.push(value))
          .mapErr((err) => this.missingCommit.push(err.op)),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await this.retry();
      return result.map(() => {
        this.state = "COMMITED";
        return null;
      });
    }

    this.state = "COMMITED";
    return Ok(null);
  }

  private async tryCommit(ops: Operation<V>[]) {
    const triedToCommit = await Promise.all(
      ops.map<Promise<Result<OpCommitOk<V>, OpCommitError<V>>>>(
        async ({ id, value, type, oldType }) =>
          type === "INSERT"
            ? (await this.storage.add(value))
                .map(({ id, ...value }) => ({
                  id,
                  newValue: value,
                  type,
                  revertOp: { type: "DELETE" as "DELETE", value: null },
                }))
                .mapErr((err) => ({ err, op: { id, value, type, oldType } }))
            : type === "DELETE"
            ? (await this.storage.remove(id))
                .map(({ id, ...oldValue }) => ({
                  id,
                  newValue: null,
                  type,
                  revertOp: { type: "INSERT" as "INSERT", value: oldValue },
                }))
                .mapErr((err) => ({ err, op: { id, value, type, oldType } }))
            : type === "UPDATE"
            ? (await this.storage.find({ id } as Partial<V>))
                .ok({ err: NOT_FOUND, op: { id, value, type, oldType } })
                .map(async ({ id, ...oldValue }) =>
                  (
                    await this.storage.findAndUpdate(
                      { id } as Partial<V>,
                      value as Partial<V>,
                    )
                  )
                    .map<OpCommitOk<V>>(([{ id, ...newValue }]) => ({
                      id,
                      newValue,
                      type,
                      revertOp: { type: "UPDATE" as "UPDATE", value: oldValue },
                    }))
                    .mapErr((err) => ({
                      err,
                      op: { id, value, type, oldType },
                    })),
                )
                .asyncFlatten()
            : Ok({
                id,
                newValue: value,
                type,
                revertOp: { type: "NOTHING" as "NOTHING", value: value },
              }).mapErr((err) => ({ err, op: { id, value, type, oldType } })),
      ),
    );

    return triedToCommit;
  }

  async retry(): Promise<Result<null, symbol>> {
    if (this.state === "COMMITED")
      return Err(Symbol("Bulk transaction already commited"));

    if (this.state === "COMMITING") this.state = "RETRYING";

    if (this.state !== "RETRYING") return Err(Symbol("Cannot retry"));

    if (this.missingCommit.length > 0) {
      this.retryCount++;
      const commitTryResult = await this.tryCommit(this.missingCommit);

      if (commitTryResult.some((value) => !value.isOk())) {
        this.missingCommit = [];
        commitTryResult.map((value) =>
          value
            .map((value) => this.rollbacks.push(value))
            .mapErr((err) => this.missingCommit.push(err.op)),
        );

        return this.rollback();
      }

      return Ok(null);
    }

    return Err(Symbol("Something went wrong, there is nothing else to commit"));
  }

  async rollback(): Promise<Result<null, symbol>> {
    if (this.state === "COMMITED")
      return Err(
        Symbol("Cannot rollback a transaction that is already commited"),
      );

    if (this.state === "RETRYING") this.state = "ROLLBACKING";

    if (this.rollbacks.length > 0) {
      const ops: Operation<V>[] = this.rollbacks.map(
        ({
          id,
          type,
          newValue,
          revertOp: { value: oldValue, type: oldType },
        }) =>
          ({
            id,
            type: oldType,
            value: oldValue ?? newValue,
            oldType: type,
          }) as Operation<V>,
      );

      const rollbackTryResult = await this.tryCommit(ops);

      if (rollbackTryResult.some((value) => !value.isOk())) {
        this.missingCommit = [];
        rollbackTryResult.map((value) =>
          value
            .map((value) => this.rollbacks.push(value))
            .mapErr((err) => this.missingCommit.push(err.op)),
        );

        return Err(Symbol("Something went wrong, we couldn't rollback"));
      }

      return Ok(null);
    }

    return Err(Symbol("Something went wrong, there is no rollback to do"));
  }
}
