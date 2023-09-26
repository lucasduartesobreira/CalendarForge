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
  startDate?: number;
  endDate?: number;
};

const TaskValidator: ValidatorType<Task> = {
  id: { optional: false, type: "string" },
  title: { optional: false, type: "string" },
  description: { optional: false, type: "string" },
  board_id: { optional: false, type: "string" },
  project_id: { optional: false, type: "string" },
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
  add(value: AddValue<Task>): Result<Task, symbol> {
    const id = idGenerator();
    const validated = validateTypes({ id, ...value }, TaskValidator);
    return validated.map((created) => this.map.set(id, created)).flatten();
  }

  update(
    id: string,
    updateValue: Partial<AddValue<Task>>,
  ): Result<Task, symbol> {
    const found = this.map.get(id);
    return found
      .map((foundTask) => {
        const validated = validateTypes(
          {
            id,
            project_id: updateValue.project_id ?? foundTask.project_id,
            board_id: updateValue.board_id ?? foundTask.board_id,
            title: updateValue.title ?? foundTask.title,
            description: updateValue.description ?? foundTask.description,
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
  }

  @emitEvent("remove")
  remove(id: string): Result<Task, symbol> {
    return this.map.remove(id);
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(predicate: (value: Task) => boolean): Task[] {
    return this.map
      .removeAll(predicate)
      .unwrapOrElse(() => [])
      .map(([, value]) => value);
  }

  @emitEvent("removeAll")
  removeAll(list: string[]): [string, Task][] {
    return list
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
  }

  findById(id: string): Option<Task> {
    return this.map.get(id);
  }
  filteredValues(predicate: (value: Task) => boolean): Task[] {
    return this.map.filterValues(predicate);
  }
  all(): Task[] {
    return this.map.values();
  }
}
