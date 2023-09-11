import { CalendarEvent } from "@/services/events/events";
import { idGenerator } from "@/utils/idGenerator";
import { Ok, Result } from "@/utils/result";
import { Option } from "@/utils/option";
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

type CreateTemplate = Omit<EventTemplate, "id">;
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
    if (newStorage.isOk()) {
      return Ok(new EventTemplateStorage(newStorage.unwrap()));
    }
    return newStorage;
  }

  add(template: CreateTemplate) {
    const id = idGenerator();
    const newTemplate = { ...template, id } satisfies EventTemplate;
    this.eventTemplates.set(id, newTemplate);
    return Ok(newTemplate);
  }

  findById(id: EventTemplate["id"]): Option<EventTemplate> {
    return this.eventTemplates.get(id);
  }

  delete(id: EventTemplate["id"]): Result<EventTemplate, symbol> {
    return this.eventTemplates.remove(id);
  }

  all() {
    return this.eventTemplates.values();
  }
}
