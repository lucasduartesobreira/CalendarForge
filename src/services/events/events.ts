import * as R from "@/utils/result";
import * as O from "@/utils/option";
import {
  AddValue,
  MapLocalStorage,
  StorageActions,
  UpdateValue,
} from "@/utils/storage";
import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
  emitEvent,
} from "@/utils/eventEmitter";

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

type CreateEvent = AddValue<CalendarEvent>;
type UpdateEvent = UpdateValue<CalendarEvent>;

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

class EventStorage
  implements BetterEventEmitter<CalendarEvent["id"], CalendarEvent>
{
  private map: MapLocalStorage<CalendarEvent["id"], CalendarEvent>;
  private eventEmitter: MyEventEmitter;

  private constructor(
    map: MapLocalStorage<CalendarEvent["id"], CalendarEvent>,
  ) {
    this.map = map;
    this.eventEmitter = new MyEventEmitter();
  }
  emit<
    This extends StorageActions<string, CalendarEvent>,
    Event extends keyof StorageActions<string, CalendarEvent>,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, CalendarEvent>,
    Event extends keyof StorageActions<string, CalendarEvent>,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }
  filteredValues(
    predicate: (value: CalendarEvent) => boolean,
  ): CalendarEvent[] {
    return this.map.filterValues(predicate);
  }
  all(): CalendarEvent[] {
    return this.map.values();
  }

  static new(forceUpdate: () => void) {
    const localStorage = MapLocalStorage.new<
      CalendarEvent["id"],
      CalendarEvent
    >("eventsMap", forceUpdate);

    return localStorage.map((localStorage) => new EventStorage(localStorage));
  }

  @emitEvent("add")
  add(event: AddValue<CalendarEvent>): R.Result<CalendarEvent, symbol> {
    const eventWithId = {
      id: Buffer.from(Date.now().toString()).toString("base64"),
      ...event,
    };
    return this.map.set(eventWithId.id, eventWithId);
  }

  @emitEvent("remove")
  remove(eventId: string): R.Result<CalendarEvent, symbol> {
    return this.map.remove(eventId);
  }

  @emitEvent("removeAll")
  removeAll(predicate: (event: CalendarEvent) => boolean): CalendarEvent[] {
    const result = this.map.removeAll(predicate);
    return result.unwrap().map(([, value]) => value);
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
    const filtered = this.map.filterEntries(predicate);

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

    this.eventEmitter.emit("update", {
      input: inputEventHandler,
      output: result,
      found: O.Some(eventFound),
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
