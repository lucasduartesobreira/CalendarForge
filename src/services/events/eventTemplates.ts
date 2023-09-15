import { CalendarEvent } from "@/services/events/events";
import { idGenerator } from "@/utils/idGenerator";
import * as R from "@/utils/result";
import * as O from "@/utils/option";
import { MapLocalStorage } from "@/utils/storage";

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

export class EventTemplateStorage {
  private eventTemplates: MapLocalStorage<string, EventTemplate>;
  private constructor(storage: MapLocalStorage<string, EventTemplate>) {
    this.eventTemplates = storage;
  }

  static new(forceUpdate: () => void) {
    const path = "eventTemplates";
    const newStorage = MapLocalStorage.new<string, EventTemplate>(
      path,
      forceUpdate,
    );
    return newStorage.map((storage) => new EventTemplateStorage(storage));
  }

  add(template: CreateTemplate) {
    const id = idGenerator();
    const newTemplate = { ...template, id } satisfies EventTemplate;
    this.eventTemplates.set(id, newTemplate);
    return R.Ok(newTemplate);
  }

  update(id: EventTemplate["id"], template: UpdateTemplate) {
    const templateGet = this.eventTemplates.get(id);
    if (!templateGet.isSome()) {
      return R.Err(Symbol("Couldn't find any template with this Id"));
    }

    const templateFound = templateGet.unwrap();
    const updatedTemplate: EventTemplate = {
      calendar_id: template.calendar_id ?? templateFound.calendar_id,
      title: template.title ?? templateFound.title,
      id: id,

      color: template.color ?? templateFound.color,
      description: template.description ?? templateFound.description,
      notifications: template.notifications ?? templateFound.notifications,
    };

    return this.eventTemplates.set(id, updatedTemplate);
  }

  findById(id: EventTemplate["id"]): O.Option<EventTemplate> {
    return this.eventTemplates.get(id);
  }

  delete(id: EventTemplate["id"]): R.Result<EventTemplate, symbol> {
    return this.eventTemplates.remove(id);
  }

  all() {
    return this.eventTemplates.values();
  }
}
