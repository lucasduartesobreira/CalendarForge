import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
  emitEvent,
} from "@/utils/eventEmitter";
import { idGenerator } from "@/utils/idGenerator";
import { Option } from "@/utils/option";
import { Err, Ok, Result } from "@/utils/result";
import { StorageActions, AddValue } from "@/utils/storage";
import { ValidatorType, validateTypes } from "@/utils/validator";
import {
  IndexedDbStorageBuilder,
  NOT_FOUND,
  StorageAPI,
  openDb,
} from "@/utils/indexedDb";
import { Bulk } from "@/utils/bulk";

export type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

const TaskValidator: ValidatorType<Task> = {
  id: { optional: false, type: "string" },
  title: { optional: false, type: "string" },
  description: { optional: false, type: "string" },
  completed: { optional: true, type: "boolean" },
};

export class TaskStorageIndexedDb
  implements BetterEventEmitter<"id", Task>, StorageActions<"id", Task>
{
  private map: StorageAPI<"id", Task>;
  private eventEmitter: MyEventEmitter;

  private static DEFAULT_VALUE(): Omit<Task, "id"> {
    return {
      title: "",
      description: "",
      completed: false,
    };
  }

  private static DB_NAME = "tasks";
  private static indexedDbBuilder: IndexedDbStorageBuilder<"id", Task> =
    IndexedDbStorageBuilder.new(
      TaskStorageIndexedDb.DB_NAME,
      TaskStorageIndexedDb.DEFAULT_VALUE(),
    );

  private constructor(map: StorageAPI<"id", Task>) {
    this.map = map;
    this.eventEmitter = new MyEventEmitter();
  }

  static async new(forceUpdate: () => void) {
    const dbResult = await openDb(TaskStorageIndexedDb.DB_NAME, [
      this.indexedDbBuilder.upgradeVersionHandler(),
    ]);

    return dbResult
      .andThen((db) => {
        return this.indexedDbBuilder.build(db, forceUpdate);
      })
      .map((value) => new TaskStorageIndexedDb(value));
  }

  emit<
    This extends StorageActions<"id", Task>,
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This, "id", Task>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<"id", Task>,
    Event extends keyof This & string,
  >(
    event: Event,
    handler: (args: EventArg<Event, This, "id", Task>) => void,
  ): void {
    this.eventEmitter.on(event, handler);
  }

  @emitEvent
  add(value: AddValue<Task>): Promise<Result<Task, symbol>> {
    const id = idGenerator();
    const validated = validateTypes({ id, ...value }, TaskValidator);
    return validated.map((created) => this.map.add(created)).asyncFlatten();
  }

  update(
    id: string,
    updateValue: Partial<AddValue<Task>>,
  ): Promise<Result<Task, symbol>> {
    const found = this.map.findById(id);
    const resultAsync = async () =>
      (await found)
        .map((foundTask) => {
          const validated = validateTypes(
            {
              id,
              title: updateValue.title ?? foundTask.title,
              description: updateValue.description ?? foundTask.description,
              completed: updateValue.completed ?? foundTask.completed,
            },
            TaskValidator,
          );
          return validated
            .map(async (updatedTask) => {
              const result = await this.map.findAndUpdate(
                { id: id },
                updatedTask,
              );
              const resultFiltered = result
                .map((tasks) => tasks.at(0))
                .andThen((task) => (task != null ? Ok(task) : Err(NOT_FOUND)));
              this.emit("update", {
                result: resultFiltered,
                args: [id, updateValue],
                opsSpecific: found,
              });
              return resultFiltered;
            })
            .asyncFlatten();
        })
        .ok(Symbol("Cannot find any task with this id"))
        .asyncFlatten();
    return resultAsync();
  }

  @emitEvent
  remove(id: string): Promise<Result<Task, symbol>> {
    const resultAsync = async () => this.map.remove(id);
    return resultAsync();
  }

  @(emitEvent<
    "id",
    Task,
    TaskStorageIndexedDb,
    "removeWithFilter",
    [predicate: (value: Task) => boolean],
    Promise<Task[]>
  >)
  removeWithFilter(predicate: (value: Task) => boolean): Promise<Task[]> {
    const resultAsync = async () =>
      (
        await Promise.all(
          (await this.map.getAll())
            .filter(predicate)
            .map((task) => this.map.remove(task.id)),
        )
      ).reduce(
        (acc, curr) =>
          curr.mapOrElse(
            () => acc,
            (task) => {
              acc.push(task);
              return acc;
            },
          ),
        [] as Task[],
      );
    return resultAsync();
  }

  @emitEvent
  removeAll(list: string[]): Promise<[string, Task][]> {
    const resultAsync = async () =>
      (
        await Promise.all(
          list.map((id) => {
            return this.map.remove(id);
          }),
        )
      ).reduce(
        (acc, value) =>
          value.mapOrElse(
            () => acc,
            (ok) => {
              acc.push([ok.id, ok]);
              return acc;
            },
          ),
        [] as Array<[Task["id"], Task]>,
      );
    return resultAsync();
  }

  findById(id: string): Promise<Option<Task>> {
    const resultAsync = async () => this.map.findById(id);
    return resultAsync();
  }

  findAll(searched: Partial<Task>): Promise<Task[]> {
    return (async () => {
      return this.map.findAll(searched);
    })();
  }

  find(searched: Partial<Task>): Promise<Option<Task>> {
    return this.map.find(searched);
  }

  filteredValues(predicate: (value: Task) => boolean): Promise<Task[]> {
    const resultAsync = async () => (await this.map.getAll()).filter(predicate);
    return resultAsync();
  }

  all(): Promise<Task[]> {
    const resultAsync = async () => this.map.getAll();
    return resultAsync();
  }

  close() {
    this.map.close();
  }

  bulk(initialValue?: Task[]): Bulk<Task> {
    return new Bulk(initialValue ?? [], this.map);
  }
}
