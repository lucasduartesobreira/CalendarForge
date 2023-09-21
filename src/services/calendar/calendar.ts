import {
  BetterEventEmitter,
  emitEvent,
  EventArg,
  MyEventEmitter,
} from "@/utils/eventEmitter";
import { idGenerator } from "@/utils/idGenerator";
import * as O from "@/utils/option";
import * as R from "@/utils/result";
import {
  AddValue,
  MapLocalStorage,
  StorageActions,
  UpdateValue,
} from "@/utils/storage";
import { validateTypes, ValidatorType } from "@/utils/validator";

type Timezones =
  | -12
  | -11
  | -10
  | -9
  | -8
  | -7
  | -6
  | -5
  | -4
  | -3
  | -2
  | -1
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

type Calendar = {
  id: string;
  name: string;
  timezone: Timezones;
  default: boolean;
};

type CreateCalendar = AddValue<Calendar>;
type UpdateCalendar = UpdateValue<Calendar>;

class CalendarStorage implements BetterEventEmitter<Calendar["id"], Calendar> {
  private eventEmitter: MyEventEmitter;
  private static validator: ValidatorType<Calendar> = {
    id: { optional: false, type: "string" },
    timezone: {
      optional: false,
      type: "number",
      validator: (a) => {
        return a <= 12 && a >= -12;
      },
    },
    name: { optional: false, type: "string" },
    default: { optional: false, type: "boolean" },
  };

  static StorageKey = "calendars";

  private map: MapLocalStorage<string, Calendar>;

  private constructor(mapLocalStorage: MapLocalStorage<string, Calendar>) {
    this.map = mapLocalStorage;
    this.eventEmitter = new MyEventEmitter();

    if (this.map.values().length === 0) {
      const id = Buffer.from(Date.now().toString()).toString("base64");
      const timezone = (-new Date().getTimezoneOffset() / 60) as Timezones;
      this.map.set(id, {
        id,
        name: "Default Calendar",
        timezone,
        default: true,
      });
    }
  }
  emit<
    This extends StorageActions<string, Calendar>,
    Event extends keyof StorageActions<string, Calendar>,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<This extends StorageActions<string, Calendar>, Event extends keyof This>(
    event: Event,
    handler: (args: EventArg<Event, This>) => void,
  ): void {
    this.eventEmitter.on(event.toString(), handler);
  }

  findById(id: string): O.Option<Calendar> {
    return this.map.get(id);
  }
  filteredValues(predicate: (value: Calendar) => boolean): Calendar[] {
    return this.map.filterValues(predicate);
  }
  all(): Calendar[] {
    return this.map.values();
  }

  static new(forceUpdate: () => void) {
    const id = Buffer.from(Date.now().toString()).toString("base64");
    const timezone = (-new Date().getTimezoneOffset() / 60) as Timezones;

    const localStorage = MapLocalStorage.new(
      "calendars",
      forceUpdate,
      new Map([
        [
          id,
          {
            id,
            name: "Default Calendar",
            timezone,
            default: true,
          },
        ],
      ]),
    );

    return localStorage.map((storage) => new CalendarStorage(storage));
  }

  @emitEvent<"add", CalendarStorage>("add")
  add(calendar: AddValue<Calendar>): R.Result<Calendar, symbol> {
    const id = Buffer.from(Date.now().toString()).toString("base64");
    const { id: _id, ...validator } = CalendarStorage.validator;
    const validated = validateTypes(calendar, validator);
    if (validated.isOk()) {
      const calendarCreated = { id, ...calendar, default: false };
      let result = this.map.setNotDefined(id, calendarCreated);
      let retries = 0;
      while (!result.isOk() && retries < 100) {
        const newId = idGenerator(Date.now() + retries);
        result = this.map.setNotDefined(newId, {
          ...calendarCreated,
          id: newId,
          default: false,
        });
      }

      return result;
    }

    return R.Err(validated.unwrap_err());
  }

  static RemoveCalendarError = Symbol(
    "There is no calendar registered with this id",
  );

  static RemoveDefaultCalendarError = Symbol(
    "Not allowed to delete the default calendar",
  );

  @emitEvent("remove")
  remove(id: string): R.Result<Calendar, symbol> {
    const calendar = this.map.get(id);
    return calendar.mapOrElse(
      () => R.Err(CalendarStorage.RemoveCalendarError),
      (calendar) => {
        if (calendar.default) {
          return R.Err(CalendarStorage.RemoveDefaultCalendarError);
        }
        return this.map.remove(id);
      },
    );
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(predicate: (value: Calendar) => boolean): Calendar[] {
    const result = this.map.removeAll(
      (value) => !value.default && predicate(value),
    );

    return result.unwrap().map(([, calendar]) => calendar);
  }

  @emitEvent("removeAll")
  removeAll(listOfIds: Array<Calendar["id"]>) {
    return listOfIds
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
        [] as Array<[Calendar["id"], Calendar]>,
      );
  }

  update(calendarsId: string, calendar: UpdateCalendar) {
    const calendarGet = this.map.get(calendarsId);
    return calendarGet
      .map((calendarFound) => {
        const newCalendar: Calendar = {
          id: calendarsId,
          name: calendar.name ?? calendarFound.name,
          timezone: calendar.timezone ?? calendarFound.timezone,
          default: calendarFound.default,
        };

        const validated = validateTypes(newCalendar, CalendarStorage.validator);
        const result = validated.mapOrElse<R.Result<Calendar, symbol>>(
          (err) => R.Err(err),
          () => {
            return this.map.set(calendarsId, newCalendar);
          },
        );

        this.emit("update", {
          args: [calendarsId, calendar],
          result,
          opsSpecific: calendarFound,
        });

        return result.option();
      })
      .flatten()
      .ok(Symbol("Event not found"));
  }

  findDefault() {
    const calendars = this.map.values();
    for (const calendar of calendars) {
      if (calendar.default) {
        return O.Some(calendar);
      }
    }
    return O.None();
  }

  sync() {
    this.map.syncLocalStorage();
  }
}

export { CalendarStorage };
export type { Calendar, CreateCalendar, Timezones };
