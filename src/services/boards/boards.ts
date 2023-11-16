import { ValidatorType, validateTypes } from "@/utils/validator";
import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
  emitEvent,
} from "@/utils/eventEmitter";
import * as O from "@/utils/option";
import * as R from "@/utils/result";
import {
  StorageActions,
  AddValue,
  MapLocalStorage,
  Index,
} from "@/utils/storage";
import { idGenerator } from "@/utils/idGenerator";
import { Project } from "../projects/projectsStorage";

export type Board = {
  id: string;
  title: string;
  project_id: string;
  position: number;
};

const BoardValidator: ValidatorType<Board> = {
  id: { optional: false, type: "string" },
  title: { optional: false, type: "string" },
  project_id: {
    optional: false,
    type: "string",
    validator: (value) => value.length !== 0,
  },
  position: {
    optional: false,
    type: "number",
    validator: (value) => value >= 0,
  },
};

const getTuple = <Args extends Array<unknown>>(
  ...args: readonly [...Args]
): [...Args] => {
  return [...args];
};

export class BoardStorage
  implements
    StorageActions<Board["id"], Board>,
    BetterEventEmitter<Board["id"], Board>
{
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
      new Map(),
      {
        project_id: [new Index(new Map(), "project_id", "id")],
      },
    );

    return localStorage.map((storage) => new BoardStorage(storage));
  }

  emit<
    This extends StorageActions<string, Board>,
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, Board>,
    Event extends keyof This & string,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  @emitEvent("add")
  add(value: AddValue<Board>): Promise<R.Result<Board, symbol>> {
    const id = idGenerator();

    const resultAsync = async () => this.boards.set(id, { id, ...value });
    return resultAsync();
  }
  update(
    id: string,
    updatedValue: Partial<AddValue<Board>>,
  ): Promise<R.Result<Board, symbol>> {
    const found = this.boards.get(id);
    const result = found
      .map((board) => {
        const validated = validateTypes(
          {
            id,
            title: updatedValue.title ?? board.title,
            project_id: updatedValue.project_id ?? board.project_id,
            position: updatedValue.position ?? board.position,
          },
          BoardValidator,
        );
        return validated.andThen((updatedBoard) =>
          this.boards.set(id, updatedBoard),
        );
      })
      .ok(Symbol("Cannot find board with this id"))
      .flatten();

    this.emit("update", {
      args: [id, updatedValue],
      result,
      opsSpecific: found,
    });

    const resultAsync = async () => result;
    return resultAsync();
  }
  @emitEvent("remove")
  remove(id: string): Promise<R.Result<Board, symbol>> {
    const resultAsync = async () => this.boards.remove(id);
    return resultAsync();
  }
  @emitEvent("removeWithFilter")
  removeWithFilter(predicate: (value: Board) => boolean): Promise<Board[]> {
    const resultAsync = async () =>
      this.boards
        .removeAll(predicate)
        .unwrap()
        .map(([, board]) => board);
    return resultAsync();
  }
  @emitEvent("removeAll")
  removeAll(list: string[]): Promise<[string, Board][]> {
    const resultAsync = async () => {
      const asyncList = list.map((id) => this.remove(id));

      const result: Array<[string, Board]> = [];
      for await (const value of asyncList) {
        value.mapOrElse(
          () => {},
          (ok) => {
            result.push(getTuple(ok.id, ok));
          },
        );
      }

      return result;
    };
    return resultAsync();
  }
  findById(id: string): Promise<O.Option<Board>> {
    const resultAsync = async () => this.boards.get(id);
    return resultAsync();
  }

  find(searched: Partial<Board>): Promise<Board[]> {
    return (async () => {
      const keys = Object.keys(searched) as (keyof Board)[];
      if (keys.length === 1 && keys[0] !== "id") {
        const from = keys[0];
        const valueFrom = searched[from];

        if (valueFrom != null) {
          const foundOnIndex = this.boards.allWithIndex(from, "id", valueFrom);
          if (foundOnIndex.isSome()) {
            const valuesFromIndex = [];
            for (const id of foundOnIndex.unwrap()) {
              const value = this.boards.get(id);
              if (value.isSome()) valuesFromIndex.push(value.unwrap());
            }

            return valuesFromIndex;
          }
        }
      }
      const keysToLook = Object.keys(searched) as (keyof Board)[];
      return this.filteredValues((searchee) => {
        return !keysToLook.some((key) => searchee[key] !== searched[key]);
      });
    })();
  }

  filteredValues(predicate: (value: Board) => boolean): Promise<Board[]> {
    const resultAsync = async () => this.boards.filterValues(predicate);
    return resultAsync();
  }
  all(): Promise<Board[]> {
    const resultAsync = async () => this.boards.values();
    return resultAsync();
  }
  allBoardsFromProject(projectId: Project["id"]) {
    const resultAsync = async () =>
      this.boards
        .allWithIndex("project_id", "id", projectId)
        .map((ids) =>
          ids.reduce((acc, id) => {
            this.boards.get(id).map((value) => acc.push(value));
            return acc;
          }, [] as Board[]),
        )
        .mapOrElse(
          () => {
            return this.boards.filterValues(
              ({ project_id }) => project_id === projectId,
            );
          },
          (ok) => ok,
        );
    return resultAsync();
  }
}
