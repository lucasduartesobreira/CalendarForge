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
  todo_id?: string;
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
  ): Promise<CalendarEvent[]> {
    const resultAsync = async () => this.map.filterValues(predicate);
    return resultAsync();
  }
  all(): Promise<CalendarEvent[]> {
    const resultAsync = async () => this.map.values();
    return resultAsync();
  }

  static new(forceUpdate: () => void) {
    const localStorage = MapLocalStorage.new<
      CalendarEvent["id"],
      CalendarEvent
    >("eventsMap", forceUpdate);

    return localStorage.map((localStorage) => new EventStorage(localStorage));
  }

  @emitEvent("add")
  add(
    event: AddValue<CalendarEvent>,
  ): Promise<R.Result<CalendarEvent, symbol>> {
    const eventWithId = {
      id: Buffer.from(Date.now().toString()).toString("base64"),
      ...event,
    };

    const resultAsync = async () => this.map.set(eventWithId.id, eventWithId);
    return resultAsync();
  }

  @emitEvent("remove")
  remove(eventId: string): Promise<R.Result<CalendarEvent, symbol>> {
    const resultAsync = async () => this.map.remove(eventId);
    return resultAsync();
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(
    predicate: (event: CalendarEvent) => boolean,
  ): Promise<CalendarEvent[]> {
    const result = this.map.removeAll(predicate);
    const resultAsync = async () => result.unwrap().map(([, value]) => value);
    return resultAsync();
  }

  @emitEvent("removeAll")
  removeAll(listOfIds: Array<CalendarEvent["id"]>) {
    const resultAsync = async () =>
      listOfIds
        .map((id) => {
          return this.map.remove(id);
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
          [] as Array<[CalendarEvent["id"], CalendarEvent]>,
        );
    return resultAsync();
  }

  findById(eventId: string): Promise<O.Option<CalendarEvent>> {
    const event = this.map.get(eventId);
    const resultAsync = async () => event;
    return resultAsync();
  }

  find(predicate: (event: CalendarEvent) => boolean) {
    for (const event of this.map.values()) {
      if (predicate(event)) {
        const resultAsync = async () => O.Some(event);
        return resultAsync();
      }
    }

    const resultAsync = async () => O.None();
    return resultAsync();
  }

  filter(predicate: (event: CalendarEvent) => boolean) {
    const filtered = this.map.filterEntries(predicate);

    const resultAsync = async () => filtered;
    return resultAsync();
  }

  update(eventId: string, event: UpdateEvent) {
    const eventFromGet = this.map.get(eventId);
    const resultAsync = async () =>
      eventFromGet
        .map((eventFound) => {
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

          this.emit("update", {
            args: inputEventHandler,
            result,
            opsSpecific: O.Some(eventFound),
          });

          return result.unwrap();
        })
        .ok(Symbol("Event not found"));

    return resultAsync();
  }

  values() {
    const resultAsync = async () => this.map.values();
    return resultAsync();
  }

  sync() {
    this.map.syncLocalStorage();
  }
}

export type { CalendarEvent, CreateEvent, UpdateEvent, EventNotification };
export { EventStorage, COLORS as EventColors };
