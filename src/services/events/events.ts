import * as R from "@/utils/result";
import * as O from "@/utils/option";
import { MapLocalStorage, StorageActions } from "@/utils/storage";

type EventNotification = {
  id: string;
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

type TypeOfArray<T> = T extends Array<infer InsideType> ? InsideType : never;
type InputAndOutput<T extends (...args: any) => any> = {
  input: Parameters<T>;
  output: ReturnType<T>;
};

type Subscribed = {
  add: ((eventData: InputAndOutput<EventStorage["add"]>) => void)[];
  remove: ((eventData: InputAndOutput<EventStorage["remove"]>) => void)[];
  removeAll: ((dunno: { output: CalendarEvent[] }) => void)[];
  update: ((
    eventData: InputAndOutput<EventStorage["update"]> & {
      found: O.Option<CalendarEvent>;
    },
  ) => void)[];
};

class EventStorage
  implements StorageActions<CalendarEvent["id"], CalendarEvent>
{
  private map: MapLocalStorage<CalendarEvent["id"], CalendarEvent>;
  private subscribed: Subscribed;

  private constructor(
    map: MapLocalStorage<CalendarEvent["id"], CalendarEvent>,
  ) {
    this.map = map;
    this.subscribed = {
      add: [],
      remove: [],
      removeAll: [],
      update: [],
    };
  }
  filteredValues(
    predicate: (value: CalendarEvent) => boolean,
  ): CalendarEvent[] {
    return this.map.filter(predicate).map(([, value]) => value);
  }
  all(): CalendarEvent[] {
    return this.map.values();
  }

  static new(forceUpdate: () => void) {
    const localStorage = MapLocalStorage.new<
      CalendarEvent["id"],
      CalendarEvent
    >("eventsMap", forceUpdate);

    if (localStorage.isOk()) {
      const unwrapedLocalStorage = localStorage.unwrap();
      return R.Ok(new EventStorage(unwrapedLocalStorage));
    }

    return localStorage;
  }

  subscribe<
    Handler extends TypeOfArray<HandlerList>,
    HandlerList extends Subscribed[E],
    E extends keyof Subscribed,
  >(event: E, handler: Handler) {
    this.subscribed[event] = [
      ...this.subscribed[event],
      handler,
    ] as Subscribed[E];
  }

  add(event: CreateEvent): R.Result<CalendarEvent, never> {
    const eventWithId = {
      id: Buffer.from(Date.now().toString()).toString("base64"),
      ...event,
    };
    const result = this.map.set(eventWithId.id, eventWithId);

    const inputEventHandler: [event: CalendarEvent] = [eventWithId];
    this.subscribed.add.forEach((handler) => {
      handler({ input: inputEventHandler, output: result });
    });
    return result;
  }

  remove(eventId: string): R.Result<CalendarEvent, symbol> {
    const result = this.map.remove(eventId);
    return result;
  }

  removeAll(predicate: (event: CalendarEvent) => boolean): CalendarEvent[] {
    const result = this.map.removeAll(predicate);
    const resultMapped = result.unwrap().map(([, value]) => value);

    this.subscribed.removeAll.forEach((handler) => {
      handler({ output: resultMapped });
    });

    return resultMapped;
  }

  findById(eventId: string): O.Option<CalendarEvent> {
    const event = this.map.get(eventId);
    return event;
  }

  find(predicate: (event: CalendarEvent) => boolean) {
    for (const event of this.map.values()) {
      if (predicate(event)) {
        return R.Ok(event);
      }
    }

    return R.Err(Symbol("Event not found"));
  }

  filter(predicate: (event: CalendarEvent) => boolean) {
    const filtered = this.map.filter(predicate);

    return filtered;
  }

  update(eventId: string, event: UpdateEvent) {
    const eventFromGet = this.map.get(eventId);
    if (!eventFromGet.isSome()) {
      return R.Err(Symbol("Event not found"));
    }

    const eventFound = eventFromGet.unwrap();

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

    const result = this.map.set(eventId, newEvent);
    const inputEventHandler: [eventId: string, event: UpdateEvent] = [
      eventId,
      event,
    ];
    this.subscribed.update.forEach((handler) => {
      handler({
        input: inputEventHandler,
        output: result,
        found: O.Some(eventFound),
      });
    });

    return result;
  }

  values() {
    return this.map.values();
  }

  sync() {
    this.map.syncLocalStorage();
  }
}

export type { CalendarEvent, CreateEvent, UpdateEvent, EventNotification };
export { EventStorage, COLORS as EventColors };
