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

export type EventTemplate = Omit<CalendarEvent, "startDate" | "endDate">;

export type CreateTemplate = Omit<EventTemplate, "id">;
export type UpdateTemplate = Partial<CreateTemplate>;

export class EventTemplateStorage
  implements BetterEventEmitter<EventTemplate["id"], EventTemplate>
{
  private eventTemplates: MapLocalStorage<string, EventTemplate>;
  private eventEmitter: MyEventEmitter;
  private constructor(storage: MapLocalStorage<string, EventTemplate>) {
    this.eventTemplates = storage;
    this.eventEmitter = new MyEventEmitter();
  }
  emit<
    This extends StorageActions<string, EventTemplate>,
    Event extends keyof StorageActions<string, EventTemplate>,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, EventTemplate>,
    Event extends keyof StorageActions<string, EventTemplate>,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  @emitEvent("remove")
  remove(id: string): R.Result<EventTemplate, symbol> {
    return this.eventTemplates.remove(id);
  }

  @emitEvent("removeAll")
  removeAll(predicate: (value: EventTemplate) => boolean): EventTemplate[] {
    return this.eventTemplates
      .removeAll(predicate)
      .unwrap()
      .map(([, value]) => value);
  }

  filteredValues(
    predicate: (value: EventTemplate) => boolean,
  ): EventTemplate[] {
    return this.eventTemplates.filterValues(predicate);
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
  add(template: AddValue<EventTemplate>): R.Result<EventTemplate, symbol> {
    const id = idGenerator();
    const newTemplate = { ...template, id } satisfies EventTemplate;
    this.eventTemplates.setNotDefined(id, newTemplate);
    return R.Ok(newTemplate);
  }

  update(id: EventTemplate["id"], template: UpdateTemplate) {
    const templateGet = this.eventTemplates.get(id);
    return templateGet.mapOrElse<R.Result<EventTemplate, symbol>>(
      () => R.Err(Symbol("Couldn't find any template with this Id")),
      (template) => {
        const templateFound = templateGet.unwrap();
        const updatedTemplate: EventTemplate = {
          calendar_id: template.calendar_id ?? templateFound.calendar_id,
          title: template.title ?? templateFound.title,
          id: id,

          color: template.color ?? templateFound.color,
          description: template.description ?? templateFound.description,
          notifications: template.notifications ?? templateFound.notifications,
        };

        const result = this.eventTemplates.set(id, updatedTemplate);
        this.emit("update", {
          args: [id, template],
          opsSpecific: templateFound,
          result,
        });

        return result;
      },
    );
  }

  findById(id: EventTemplate["id"]): O.Option<EventTemplate> {
    return this.eventTemplates.get(id);
  }

  all() {
    return this.eventTemplates.values();
  }
}
