import { Actions } from "@/hooks/mapHook";
import { Err, Ok, Result } from "@/utils/result";

type EventNotification = {
  from: "start" | "end";
  time: number;
  timescale: "minutes" | "hours" | "week" | "month";
};

const COLORS = [
  "#003f5c",
  "#374c80",
  "#7a5195",
  "#bc5090",
  "#ef5675",
  "#ff764a",
  "#ffa600",
] as const;

type FromTupleToUnion<Some> = Some extends readonly [infer A, ...infer B]
  ? A | FromTupleToUnion<B>
  : Some extends readonly [infer A]
  ? A
  : never;

type CalendarEvent = {
  id: string;
  startDate: number;
  endDate: number;
  title: string;
  description: string;
  calendar_id: string;
  notifications: EventNotification[];
  color: FromTupleToUnion<typeof COLORS>;
};

type CreateEvent = Omit<CalendarEvent, "id">;
type UpdateEvent = Partial<CreateEvent>;

const fix = <T extends CalendarEvent[K], K extends keyof CalendarEvent>(
  def: T,
  key: K,
  events: IterableIterator<[string, CalendarEvent]>,
) => {
  const final = [] as [string, CalendarEvent][];
  for (const [id, event] of events) {
    if (event[key] == null) {
      event[key] = def;
    }
    final.push([id, event]);
  }

  return final;
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

  add(event: CreateEvent): Result<CalendarEvent, null> {
    const eventWithId = {
      id: Buffer.from(Date.now().toString()).toString("base64"),
      ...event,
    };
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

  removeAll(
    predicate: (event: CalendarEvent) => boolean,
  ): Result<CalendarEvent[], symbol> {
    const events = this.events.entries();
    const removed = [] as CalendarEvent[];
    const notRemoved = [] as [string, CalendarEvent][];
    for (const [id, event] of events) {
      if (predicate(event)) {
        removed.push(event);
      } else {
        notRemoved.push([id, event]);
      }
    }
    this.actions.setAll(notRemoved);

    return Ok(removed);
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

  filter(predicate: (event: CalendarEvent) => boolean) {
    const result = [];
    for (const event of this.events.values()) {
      if (predicate(event)) {
        result.push(event);
      }
    }

    return result;
  }

  update(eventId: string, event: UpdateEvent) {
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
      notifications: event.notifications ?? eventFound.notifications,
      color: event.color ?? eventFound.color,
    };

    this.actions.set(eventId, newEvent);

    return Ok(newEvent);
  }
}

export type { CalendarEvent, CreateEvent, UpdateEvent, EventNotification };
export { EventStorage, COLORS as EventColors };
