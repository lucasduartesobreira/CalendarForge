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
  implements BetterEventEmitter<Project["id"], Project>
{
  private map: MapLocalStorage<Project["id"], Project>;
  private eventEmitter: MyEventEmitter;
  private constructor(map: MapLocalStorage<Project["id"], Project>) {
    this.eventEmitter = new MyEventEmitter();
    this.map = map;
  }
  emit<
    This extends StorageActions<string, Project>,
    Event extends keyof StorageActions<Project["id"], Project>,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, Project>,
    Event extends keyof StorageActions<Project["id"], Project>,
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
  add(value: AddValue<Project>): R.Result<Project, symbol> {
    const id = idGenerator();

    return this.map.setNotDefined(id, { id, ...value });
  }

  update(
    id: string,
    updateValue: UpdateValue<Project>,
  ): R.Result<Project, symbol> {
    const found = this.map.get(id);
    return found
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
  }

  @emitEvent("remove")
  remove(id: string): R.Result<Project, symbol> {
    return this.map.remove(id);
  }

  @emitEvent("removeAll")
  removeAll(predicate: (value: Project) => boolean): Project[] {
    return this.removeAll(predicate);
  }

  findById(id: string): O.Option<Project> {
    return this.map.get(id);
  }

  filteredValues(predicate: (value: Project) => boolean): Project[] {
    return this.map.values().filter(predicate);
  }

  all(): Project[] {
    return this.map.values();
  }
}
