import { CalendarEvent } from "@/services/events/events";
import { idGenerator } from "@/utils/idGenerator";
import * as R from "@/utils/result";
import * as O from "@/utils/option";
import { AddValue, MapLocalStorage, StorageActions } from "@/utils/storage";
import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
  emitEvent,
} from "@/utils/eventEmitter";

export const INITIAL_TEMPLATE: EventTemplate = {
  id: "",
  title: "",
  description: "",
  calendar_id: "",
  notifications: [],
  color: "#7a5195",
};

export type EventTemplate = Omit<
  CalendarEvent,
  "startDate" | "endDate" | "task_id"
>;

export type CreateTemplate = Omit<EventTemplate, "id">;
export type UpdateTemplate = Partial<CreateTemplate>;

export class EventTemplateStorage
  implements
    StorageActions<EventTemplate["id"], EventTemplate>,
    BetterEventEmitter<EventTemplate["id"], EventTemplate>
{
  private eventTemplates: MapLocalStorage<string, EventTemplate>;
  private eventEmitter: MyEventEmitter;
  private constructor(storage: MapLocalStorage<string, EventTemplate>) {
    this.eventTemplates = storage;
    this.eventEmitter = new MyEventEmitter();
  }
  emit<
    This extends StorageActions<string, EventTemplate>,
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, EventTemplate>,
    Event extends keyof This & string,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  @emitEvent("remove")
  remove(id: string): Promise<R.Result<EventTemplate, symbol>> {
    const resultAsync = async () => this.eventTemplates.remove(id);
    return resultAsync();
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(
    predicate: (value: EventTemplate) => boolean,
  ): Promise<EventTemplate[]> {
    const resultAsync = async () =>
      this.eventTemplates
        .removeAll(predicate)
        .unwrap()
        .map(([, value]) => value);
    return resultAsync();
  }

  @emitEvent("removeAll")
  removeAll(listOfIds: Array<EventTemplate["id"]>) {
    const resultAsync = async () =>
      listOfIds
        .map((id) => {
          return this.eventTemplates.remove(id);
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
          [] as Array<[EventTemplate["id"], EventTemplate]>,
        );
    return resultAsync();
  }

  filteredValues(
    predicate: (value: EventTemplate) => boolean,
  ): Promise<EventTemplate[]> {
    const resultAsync = async () => this.eventTemplates.filterValues(predicate);
    return resultAsync();
  }

  static new(forceUpdate: () => void) {
    const path = "eventTemplates";
    const newStorage = MapLocalStorage.new<string, EventTemplate>(
      path,
      forceUpdate,
    );
    return newStorage.map((storage) => new EventTemplateStorage(storage));
  }

  @emitEvent("add")
  add(
    template: AddValue<EventTemplate>,
  ): Promise<R.Result<EventTemplate, symbol>> {
    const id = idGenerator();
    const newTemplate = { ...template, id } satisfies EventTemplate;
    this.eventTemplates.setNotDefined(id, newTemplate);
    const resultAsync = async () => R.Ok(newTemplate);
    return resultAsync();
  }

  update(id: EventTemplate["id"], template: UpdateTemplate) {
    const templateGet = this.eventTemplates.get(id);
    const resultAsync = async () =>
      templateGet
        .map((templateFound) => {
          const updatedTemplate: EventTemplate = {
            calendar_id: template.calendar_id ?? templateFound.calendar_id,
            title: template.title ?? templateFound.title,
            id: id,

            color: template.color ?? templateFound.color,
            description: template.description ?? templateFound.description,
            notifications:
              template.notifications ?? templateFound.notifications,
          };

          const result = this.eventTemplates.set(id, updatedTemplate);
          this.emit("update", {
            args: [id, template],
            opsSpecific: templateFound,
            result,
          });

          return result.unwrap();
        })
        .ok(Symbol("Couldn't find any template with this Id"));
    return resultAsync();
  }

  findById(id: EventTemplate["id"]): Promise<O.Option<EventTemplate>> {
    const resultAsync = async () => this.eventTemplates.get(id);
    return resultAsync();
  }

  find(searched: Partial<EventTemplate>): Promise<EventTemplate[]> {
    return (async () => {
      const keys = Object.keys(searched) as (keyof EventTemplate)[];
      if (keys.length === 1 && keys[0] !== "id") {
        const from = keys[0];
        const valueFrom = searched[from];

        if (valueFrom != null) {
          const foundOnIndex = this.eventTemplates.allWithIndex(
            from,
            "id",
            valueFrom,
          );
          if (foundOnIndex.isSome()) {
            const valuesFromIndex = [];
            for (const id of foundOnIndex.unwrap()) {
              const value = this.eventTemplates.get(id);
              if (value.isSome()) valuesFromIndex.push(value.unwrap());
            }

            return valuesFromIndex;
          }
        }
      }
      const keysToLook = Object.keys(searched) as (keyof EventTemplate)[];
      return this.filteredValues((searchee) => {
        return !keysToLook.some((key) => searchee[key] !== searched[key]);
      });
    })();
  }

  all() {
    const resultAsync = async () => this.eventTemplates.values();
    return resultAsync();
  }
}
