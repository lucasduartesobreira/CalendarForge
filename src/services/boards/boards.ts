import { ValidatorType, validateTypes } from "@/utils/validator";
import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
} from "@/utils/eventEmitter";
import * as O from "@/utils/option";
import * as R from "@/utils/result";
import { StorageActions, AddValue, MapLocalStorage } from "@/utils/storage";
import { idGenerator } from "@/utils/idGenerator";

type Board = {
  id: string;
  title: string;
  project_id: string;
};

const BoardValidator: ValidatorType<Board> = {
  id: { optional: false, type: "string" },
  title: { optional: false, type: "string" },
  project_id: {
    optional: false,
    type: "string",
    validator: (value) => value.length !== 0,
  },
};

const getTuple = <Args extends Array<unknown>>(
  ...args: readonly [...Args]
): [...Args] => {
  return [...args];
};

export class BoardStorage implements BetterEventEmitter<Board["id"], Board> {
  private boards: MapLocalStorage<Board["id"], Board>;
  private eventEmitter: MyEventEmitter;

  private constructor(boards: MapLocalStorage<string, Board>) {
    this.boards = boards;
    this.eventEmitter = new MyEventEmitter();
  }

  static new(forceUpdate: () => void) {
    const localStorage = MapLocalStorage.new<Board["id"], Board>(
      "boards",
      forceUpdate,
    );

    return localStorage.map((storage) => new BoardStorage(storage));
  }

  emit<
    This extends StorageActions<string, Board>,
    Event extends keyof StorageActions<string, Board>,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, Board>,
    Event extends keyof StorageActions<string, Board>,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }
  add(value: AddValue<Board>): R.Result<Board, symbol> {
    const id = idGenerator();
    return this.boards.set(id, { id, ...value });
  }
  update(
    id: string,
    updatedValue: Partial<AddValue<Board>>,
  ): R.Result<Board, symbol> {
    const found = this.boards.get(id);
    return found
      .map((board) => {
        const validated = validateTypes(
          {
            id,
            title: updatedValue.title ?? board.title,
            project_id: updatedValue.project_id ?? board.title,
          },
          BoardValidator,
        );
        return validated.andThen((updatedBoard) =>
          this.boards.set(id, updatedBoard),
        );
      })
      .ok(Symbol("Cannot find board with this id"))
      .flatten();
  }
  remove(id: string): R.Result<Board, symbol> {
    return this.boards.remove(id);
  }
  removeWithFilter(predicate: (value: Board) => boolean): Board[] {
    return this.boards
      .removeAll(predicate)
      .unwrap()
      .map(([, board]) => board);
  }
  removeAll(list: string[]): [string, Board][] {
    return list
      .map((id) => this.remove(id))
      .reduce(
        (acc, value) => {
          return value.mapOrElse(
            () => acc,
            (ok) => {
              acc.push(getTuple(ok.id, ok));
              return acc;
            },
          );
        },
        [] as Array<[string, Board]>,
      );
  }
  findById(id: string): O.Option<Board> {
    return this.boards.get(id);
  }
  filteredValues(predicate: (value: Board) => boolean): Board[] {
    return this.boards.filterValues(predicate);
  }
  all(): Board[] {
    return this.boards.values();
  }
}
