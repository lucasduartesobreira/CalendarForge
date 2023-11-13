import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
  emitEvent,
} from "@/utils/eventEmitter";
import { idGenerator } from "@/utils/idGenerator";
import { Option } from "@/utils/option";
import { Result } from "@/utils/result";
import { StorageActions, AddValue, MapLocalStorage } from "@/utils/storage";
import { ValidatorType, validateTypes } from "@/utils/validator";

export type Task = {
  id: string;
  project_id: string;
  board_id: string;
  title: string;
  description: string;
  position: number;
  startDate?: number;
  endDate?: number;
};

const TaskValidator: ValidatorType<Task> = {
  id: { optional: false, type: "string" },
  title: { optional: false, type: "string" },
  description: { optional: false, type: "string" },
  board_id: { optional: false, type: "string" },
  project_id: { optional: false, type: "string" },
  position: {
    optional: false,
    type: "number",
    validator(a) {
      return a >= 0;
    },
  },
  startDate: {
    optional: true,
    type: "number",
    validator(this, date) {
      return date && this.endDate ? date <= this.endDate : true;
    },
  },
  endDate: {
    optional: true,
    type: "number",
    validator(this, date) {
      return date && this.startDate ? date >= this.startDate : true;
    },
  },
};

export class TaskStorage implements BetterEventEmitter<Task["id"], Task> {
  private map: MapLocalStorage<Task["id"], Task>;
  private eventEmitter: MyEventEmitter;

  private constructor(map: MapLocalStorage<string, Task>) {
    this.map = map;
    this.eventEmitter = new MyEventEmitter();
  }

  static new(forceUpdate: () => void) {
    const path = "tasks";
    const newStorage = MapLocalStorage.new<Task["id"], Task>(path, forceUpdate);
    return newStorage.map((storage) => new TaskStorage(storage));
  }

  emit<
    This extends StorageActions<string, Task>,
    Event extends keyof StorageActions<Task["id"], Task>,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, Task>,
    Event extends keyof StorageActions<Task["id"], Task>,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  @emitEvent("add")
  add(value: AddValue<Task>): Promise<Result<Task, symbol>> {
    const id = idGenerator();
    const validated = validateTypes({ id, ...value }, TaskValidator);
    const resultAsync = async () =>
      validated.map((created) => this.map.set(id, created)).flatten();
    return resultAsync();
  }

  update(
    id: string,
    updateValue: Partial<AddValue<Task>>,
  ): Promise<Result<Task, symbol>> {
    const found = this.map.get(id);
    const resultAsync = async () =>
      found
        .map((foundTask) => {
          const validated = validateTypes(
            {
              id,
              project_id: updateValue.project_id ?? foundTask.project_id,
              board_id: updateValue.board_id ?? foundTask.board_id,
              title: updateValue.title ?? foundTask.title,
              description: updateValue.description ?? foundTask.description,
              position: updateValue.position ?? foundTask.position,
              startDate: updateValue.startDate ?? foundTask.startDate,
              endDate: updateValue.endDate ?? foundTask.endDate,
            },
            TaskValidator,
          );
          return validated
            .map((updatedTask) => {
              const result = this.map.set(id, updatedTask);
              this.emit("update", {
                result,
                args: [id, updateValue],
                opsSpecific: found,
              });
              return result;
            })
            .flatten();
        })
        .ok(Symbol("Cannot find any task with this id"))
        .flatten();
    return resultAsync();
  }

  @emitEvent("remove")
  remove(id: string): Promise<Result<Task, symbol>> {
    const resultAsync = async () => this.map.remove(id);
    return resultAsync();
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(predicate: (value: Task) => boolean): Promise<Task[]> {
    const resultAsync = async () =>
      this.map
        .removeAll(predicate)
        .unwrapOrElse(() => [])
        .map(([, value]) => value);
    return resultAsync();
  }

  @emitEvent("removeAll")
  removeAll(list: string[]): Promise<[string, Task][]> {
    const resultAsync = async () =>
      list
        .map((id) => {
          return this.map.remove(id);
        })
        .reduce(
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
    const resultAsync = async () => this.map.get(id);
    return resultAsync();
  }
  filteredValues(predicate: (value: Task) => boolean): Promise<Task[]> {
    const resultAsync = async () => this.map.filterValues(predicate);
    return resultAsync();
  }
  all(): Promise<Task[]> {
    const resultAsync = async () => this.map.values();
    return resultAsync();
  }
}
