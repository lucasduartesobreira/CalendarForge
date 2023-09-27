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

export type Todo = {
  id: string;
  title: string;
  project_id: string;
  board_id: string;
  task_id: string;
};

const TodoValidator: ValidatorType<Todo> = {
  id: { optional: false, type: "string" },
  title: { optional: false, type: "string" },
  project_id: { optional: false, type: "string" },
  board_id: { optional: false, type: "string" },
  task_id: { optional: false, type: "string" },
};

export class TodoStorage implements BetterEventEmitter<Todo["id"], Todo> {
  private map: MapLocalStorage<Todo["id"], Todo>;
  private eventEmitter: MyEventEmitter;

  private constructor(map: MapLocalStorage<string, Todo>) {
    this.eventEmitter = new MyEventEmitter();
    this.map = map;
  }

  static new(forceUpdate: () => void) {
    const path = "todos";
    const newStorage = MapLocalStorage.new<Todo["id"], Todo>(path, forceUpdate);
    return newStorage.map((storage) => new TodoStorage(storage));
  }

  emit<
    This extends StorageActions<string, Todo>,
    Event extends keyof StorageActions<Todo["id"], Todo>,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }

  on<
    This extends StorageActions<string, Todo>,
    Event extends keyof StorageActions<Todo["id"], Todo>,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  @emitEvent("add")
  add(value: AddValue<Todo>): Result<Todo, symbol> {
    const id = idGenerator();

    return this.map.setNotDefined(id, { id, ...value });
  }

  update(
    id: string,
    updateValue: Partial<AddValue<Todo>>,
  ): Result<Todo, symbol> {
    const found = this.map.get(id);
    return found
      .map((valueFound) => {
        const validated = validateTypes(
          {
            id,
            title: updateValue.title ?? valueFound.title,
            task_id: updateValue.task_id ?? valueFound.task_id,
            project_id: updateValue.project_id ?? valueFound.project_id,
            board_id: updateValue.board_id ?? valueFound.board_id,
          },
          TodoValidator,
        );
        return validated
          .map((updatedTodo) => {
            const result = this.map.set(id, updatedTodo);
            this.emit("update", {
              result,
              args: [id, updateValue],
              opsSpecific: found,
            });
            return result;
          })
          .flatten();
      })
      .ok(Symbol("Cannot find any todo with this id"))
      .flatten();
  }

  @emitEvent("remove")
  remove(id: string): Result<Todo, symbol> {
    return this.map.remove(id);
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(predicate: (value: Todo) => boolean): Todo[] {
    return this.map
      .removeAll(predicate)
      .unwrapOrElse(() => [])
      .map(([, value]) => value);
  }

  @emitEvent("removeAll")
  removeAll(list: string[]): [string, Todo][] {
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
        [] as Array<[Todo["id"], Todo]>,
      );
  }

  findById(id: string): Option<Todo> {
    return this.map.get(id);
  }

  filteredValues(predicate: (value: Todo) => boolean): Todo[] {
    return this.map.filterValues(predicate);
  }

  all(): Todo[] {
    return this.map.values();
  }
}
