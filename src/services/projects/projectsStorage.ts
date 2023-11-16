import {
  AddValue,
  MapLocalStorage,
  StorageActions,
  UpdateValue,
} from "@/utils/storage";
import { Calendar } from "../calendar/calendar";
import * as R from "@/utils/result";
import * as O from "@/utils/option";
import { idGenerator } from "@/utils/idGenerator";
import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
  emitEvent,
} from "@/utils/eventEmitter";

export type Project = {
  id: string;
  title: string;
  calendars: Array<Calendar["id"]>;
};

export class ProjectStorage
  implements
    StorageActions<Project["id"], Project>,
    BetterEventEmitter<Project["id"], Project>
{
  private map: MapLocalStorage<Project["id"], Project>;
  private eventEmitter: MyEventEmitter;
  private constructor(map: MapLocalStorage<Project["id"], Project>) {
    this.eventEmitter = new MyEventEmitter();
    this.map = map;
  }

  emit<
    This extends StorageActions<string, Project>,
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, Project>,
    Event extends keyof This & string,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  static new(forceUpdate: () => void) {
    const path = "projects";
    const newStorage = MapLocalStorage.new<Project["id"], Project>(
      path,
      forceUpdate,
    );
    return newStorage.map((storage) => new ProjectStorage(storage));
  }

  @emitEvent("add")
  add(value: AddValue<Project>): Promise<R.Result<Project, symbol>> {
    const id = idGenerator();

    const resultAsync = async () =>
      this.map.setNotDefined(id, { id, ...value });
    return resultAsync();
  }

  update(
    id: string,
    updateValue: UpdateValue<Project>,
  ): Promise<R.Result<Project, symbol>> {
    const found = this.map.get(id);
    const resultAsync = async () =>
      found
        .map((valueFound) => {
          const updatedValue: Project = {
            id,
            title: updateValue.title ?? valueFound.title,
            calendars: updateValue.calendars ?? valueFound.calendars,
          };
          const result = this.map.set(id, updatedValue);

          this.emit("update", {
            args: [id, updateValue],
            opsSpecific: valueFound,
            result,
          });

          return result.unwrap();
        })
        .ok(Symbol("Couldn't find any entry for this key"));
    return resultAsync();
  }

  @emitEvent("remove")
  remove(id: string): Promise<R.Result<Project, symbol>> {
    const resultAsync = async () => this.map.remove(id);
    return resultAsync();
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(predicate: (value: Project) => boolean): Promise<Project[]> {
    const resultAsync = async () => this.removeWithFilter(predicate);
    return resultAsync();
  }

  @emitEvent("removeAll")
  removeAll(listOfIds: Array<Project["id"]>) {
    const resultAsync = async () =>
      listOfIds
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
          [] as Array<[Project["id"], Project]>,
        );
    return resultAsync();
  }

  findById(id: string): Promise<O.Option<Project>> {
    const resultAsync = async () => this.map.get(id);
    return resultAsync();
  }

  find(searched: Partial<Project>): Promise<Project[]> {
    return (async () => {
      const keys = Object.keys(searched) as (keyof Project)[];
      if (keys.length === 1 && keys[0] !== "id") {
        const from = keys[0];
        const valueFrom = searched[from];

        if (valueFrom != null) {
          const foundOnIndex = this.map.allWithIndex(from, "id", valueFrom);
          if (foundOnIndex.isSome()) {
            const valuesFromIndex = [];
            for (const id of foundOnIndex.unwrap()) {
              const value = this.map.get(id);
              if (value.isSome()) valuesFromIndex.push(value.unwrap());
            }

            return valuesFromIndex;
          }
        }
      }
      const keysToLook = Object.keys(searched) as (keyof Project)[];
      return this.filteredValues((searchee) => {
        return !keysToLook.some((key) => searchee[key] !== searched[key]);
      });
    })();
  }

  filteredValues(predicate: (value: Project) => boolean): Promise<Project[]> {
    const resultAsync = async () => this.map.values().filter(predicate);
    return resultAsync();
  }

  all(): Promise<Project[]> {
    const resultAsync = async () => this.map.values();
    return resultAsync();
  }
}
