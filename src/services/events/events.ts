import { Actions } from "@/hooks/mapHook";
import { Err, Ok, Result } from "@/utils/result";

type CalendarEvent = {
  id: string;
  startDate: number;
  endDate: number;
  title: string;
  description: string;
  calendar_id: string;
};

class EventStorage {
  private events: Omit<Map<string, CalendarEvent>, "set" | "clear" | "delete">;
  private actions: Actions<string, CalendarEvent>;

  constructor(
    events: Omit<Map<string, CalendarEvent>, "set" | "clear" | "delete">,
    actions: Actions<string, CalendarEvent>,
  ) {
    this.events = events;
    this.actions = actions;
  }

  add(event: Omit<CalendarEvent, "id">): Result<CalendarEvent, null> {
    const eventWithId = { id: "a", ...event };
    this.actions.set(eventWithId.id, eventWithId);
    return Ok(eventWithId);
  }

  remove(eventId: string): Result<CalendarEvent, symbol> {
    const event = this.events.get(eventId);
    if (event == undefined) {
      return Err(Symbol("Event not found"));
    }

    this.actions.remove(eventId);

    return Ok(event);
  }

  findById(eventId: string): Result<CalendarEvent, symbol> {
    const event = this.events.get(eventId);
    if (event == undefined) {
      return Err(Symbol("Event not found"));
    }

    return Ok(event);
  }

  find(predicate: (event: CalendarEvent) => boolean) {
    for (const event of this.events.values()) {
      if (predicate(event)) {
        return Ok(event);
      }
    }

    return Err(Symbol("Event not found"));
  }

  update(eventId: string, event: Partial<Omit<CalendarEvent, "id">>) {
    const eventFound = this.events.get(eventId);
    if (eventFound == undefined) {
      return Err(Symbol("Event not found"));
    }

    const newEvent: CalendarEvent = {
      id: eventId,
      title: event.title ?? eventFound.title,
      endDate: event.endDate ?? eventFound.endDate,
      startDate: event.startDate ?? eventFound.startDate,
      calendar_id: event.calendar_id ?? eventFound.calendar_id,
      description: event.description ?? eventFound.description,
    };

    this.actions.set(eventId, newEvent);

    return Ok(newEvent);
  }
}

export type { CalendarEvent };
export { EventStorage };
