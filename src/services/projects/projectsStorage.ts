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
import EventEmitter from "events";

export type Project = {
  id: string;
  title: string;
  calendars: Array<Calendar["id"]>;
};

export class ProjectStorage implements StorageActions<Project["id"], Project> {
  private map: MapLocalStorage<Project["id"], Project>;
  private eventEmitter: EventEmitter;
  private constructor(map: MapLocalStorage<Project["id"], Project>) {
    this.eventEmitter = new EventEmitter();
    this.map = map;
  }

  static new(forceUpdate: () => void) {
    const path = "projects";
    const newStorage = MapLocalStorage.new<Project["id"], Project>(
      path,
      forceUpdate,
    );
    if (newStorage.isOk()) {
      return R.Ok(new ProjectStorage(newStorage.unwrap()));
    }
    return newStorage;
  }

  add(value: AddValue<Project>): R.Result<Project, symbol> {
    const id = idGenerator();

    const result = this.map.set(id, { id, ...value });

    this.eventEmitter.emit("add", { input: value, output: result });
    return result;
  }

  update(
    id: string,
    updateValue: UpdateValue<Project>,
  ): R.Result<Project, symbol> {
    const found = this.map.get(id);
    if (!found.isSome()) {
      return R.Err(Symbol("Couldn't find any entry for this key"));
    }

    const valueFound = found.unwrap();
    const updatedValue: Project = {
      id,
      title: updateValue.title ?? valueFound.title,
      calendars: updateValue.calendars ?? valueFound.calendars,
    };
    const result = this.map.set(id, updatedValue);

    this.eventEmitter.emit("update", {
      input: [id, updateValue, valueFound],
      output: result,
    });

    return result;
  }

  remove(id: string): R.Result<Project, symbol> {
    const result = this.map.remove(id);

    this.eventEmitter.emit("remove", {
      input: [id],
      output: result,
    });

    return result;
  }

  removeAll(predicate: (value: Project) => boolean): Project[] {
    const result = this.removeAll(predicate);

    this.eventEmitter.emit("removeAll", {
      input: [predicate],
      output: result,
    });

    return result;
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
