import { CreateEvent } from "@/services/events/events";
import { idGenerator } from "@/utils/idGenerator";
import { Ok } from "@/utils/result";
import { MapLocalStorage } from "@/utils/storage";

export const INITIAL_TEMPLATE: CreateEvent & { id: string } = {
  id: "",
  startDate: 0,
  endDate: 0,
  title: "",
  description: "",
  calendar_id: "",
  notifications: [],
  color: "#7a5195",
};

export type EventTemplate = typeof INITIAL_TEMPLATE;

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
    const newTemplate = { ...template, id };
    this.eventTemplates.set(id, newTemplate);
    return Ok(newTemplate);
  }

  all() {
    return this.eventTemplates.filter(() => true);
  }
}
