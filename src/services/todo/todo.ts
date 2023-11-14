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
  calendar_id: string;
};

const TodoValidator: ValidatorType<Todo> = {
  id: { optional: false, type: "string" },
  title: { optional: false, type: "string" },
  project_id: { optional: false, type: "string" },
  board_id: { optional: false, type: "string" },
  task_id: { optional: false, type: "string" },
  calendar_id: { optional: false, type: "string" },
};

export class TodoStorage
  implements
    StorageActions<Todo["id"], Todo>,
    BetterEventEmitter<Todo["id"], Todo>
{
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
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }

  on<
    This extends StorageActions<string, Todo>,
    Event extends keyof This & string,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  @emitEvent("add")
  add(value: AddValue<Todo>): Promise<Result<Todo, symbol>> {
    const id = idGenerator();

    const resultAsync = async () =>
      this.map.setNotDefined(id, { id, ...value });
    return resultAsync();
  }

  update(
    id: string,
    updateValue: Partial<AddValue<Todo>>,
  ): Promise<Result<Todo, symbol>> {
    const found = this.map.get(id);
    const resultAsync = async () =>
      found
        .map((valueFound) => {
          const validated = validateTypes(
            {
              id,
              title: updateValue.title ?? valueFound.title,
              task_id: updateValue.task_id ?? valueFound.task_id,
              project_id: updateValue.project_id ?? valueFound.project_id,
              board_id: updateValue.board_id ?? valueFound.board_id,
              calendar_id: updateValue.calendar_id ?? valueFound.calendar_id,
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
    return resultAsync();
  }

  @emitEvent("remove")
  remove(id: string): Promise<Result<Todo, symbol>> {
    const resultAsync = async () => this.map.remove(id);
    return resultAsync();
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(predicate: (value: Todo) => boolean): Promise<Todo[]> {
    const resultAsync = async () =>
      this.map
        .removeAll(predicate)
        .unwrapOrElse(() => [])
        .map(([, value]) => value);

    return resultAsync();
  }

  @emitEvent("removeAll")
  removeAll(list: string[]): Promise<[string, Todo][]> {
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
          [] as Array<[Todo["id"], Todo]>,
        );
    return resultAsync();
  }

  findById(id: string): Promise<Option<Todo>> {
    const resultAsync = async () => this.map.get(id);
    return resultAsync();
  }

  filteredValues(predicate: (value: Todo) => boolean): Promise<Todo[]> {
    const resultAsync = async () => this.map.filterValues(predicate);
    return resultAsync();
  }

  all(): Promise<Todo[]> {
    const resultAsync = async () => this.map.values();
    return resultAsync();
  }
}
