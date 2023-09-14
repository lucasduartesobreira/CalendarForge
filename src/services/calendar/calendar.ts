import { idGenerator } from "@/utils/idGenerator";
import { None, Option, Some } from "@/utils/option";
import { Err, Ok, Result } from "@/utils/result";
import { MapLocalStorage, StorageActions } from "@/utils/storage";
import { TypeOfTag } from "typescript";

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

type ValidatorType<A> = {
  [Key in keyof A]: A[Key] extends undefined
    ? { optional: true; type: TypeOfTag; validator?: (a: A[Key]) => boolean }
    : {
        optional: false;
        type: TypeOfTag;
        validator?: (a: A[Key]) => boolean;
      };
};

const validateTypes = <A extends Record<string, any>>(
  a: A,
  b: ValidatorType<A>,
): Result<A, symbol> => {
  const isValid = Object.entries(b).filter(([key, value]) => {
    const newK = key as keyof typeof b;
    const { optional, type, validator } = value;

    if (!optional) {
      return a[newK] !== undefined && typeof a[newK] === type && validator
        ? validator(a[newK])
        : true;
    }

    return (
      a[newK] === undefined ||
      (typeof a[newK] === type && validator ? validator(a[newK]) : true)
    );
  });

  return isValid
    ? Ok(a)
    : Err(Symbol("Missing properties or property with wrong type"));
};

type CreateCalendar = Omit<Calendar, "id" | "default">;
type UpdateCalendar = Partial<CreateCalendar>;

class CalendarStorage implements StorageActions<Calendar["id"], Calendar> {
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

  findById(id: string): Option<Calendar> {
    return this.map.get(id);
  }
  filteredValues(predicate: (value: Calendar) => boolean): Calendar[] {
    return this.map.filter(predicate).map(([, calendar]) => calendar);
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

    if (localStorage.isOk()) {
      const unwrapedLocalStorage = localStorage.unwrap();
      return Ok(new CalendarStorage(unwrapedLocalStorage));
    }

    return localStorage;
  }

  add(calendar: CreateCalendar): Result<Calendar, symbol> {
    const id = Buffer.from(Date.now().toString()).toString("base64");
    const { id: _id, ...validator } = CalendarStorage.validator;
    const validated = validateTypes(calendar, validator);
    if (validated.isOk()) {
      const calendarCreated = { id, default: false, ...calendar };
      let result = this.map.setNotDefined(id, calendarCreated);
      let retries = 0;
      while (!result.isOk() && retries < 100) {
        const newId = idGenerator(Date.now() + retries);
        result = this.map.setNotDefined(newId, {
          ...calendarCreated,
          id: newId,
        });
      }

      return result;
    }

    return validated;
  }

  static RemoveCalendarError = Symbol(
    "There is no calendar registered with this id",
  );

  static RemoveDefaultCalendarError = Symbol(
    "Not allowed to delete the default calendar",
  );

  remove(id: string): Result<Calendar, symbol> {
    const calendar = this.map.get(id);
    if (calendar.isSome()) {
      const calendarFound = calendar.unwrap();
      if (calendarFound.default) {
        return Err(CalendarStorage.RemoveDefaultCalendarError);
      }
      this.map.remove(id);
      return Ok(calendarFound);
    }
    return Err(CalendarStorage.RemoveCalendarError);
  }

  removeAll(predicate: (value: Calendar) => boolean): Calendar[] {
    const result = this.map.removeAll(
      (value) => !value.default && predicate(value),
    );

    return result.unwrap().map(([, calendar]) => calendar);
  }

  getCalendars(): Calendar[] {
    return this.map.values();
  }

  update(calendarsId: string, calendar: UpdateCalendar) {
    const calendarGet = this.map.get(calendarsId);
    if (!calendarGet.isSome()) {
      return Err(Symbol("Event not found"));
    }

    const calendarFound = calendarGet.unwrap();

    const newCalendar: Calendar = {
      id: calendarsId,
      name: calendar.name ?? calendarFound.name,
      timezone: calendar.timezone ?? calendarFound.timezone,
      default: false,
    };

    const validated = validateTypes(newCalendar, CalendarStorage.validator);
    if (validated.isOk()) {
      this.map.set(calendarsId, newCalendar);
    }

    return validated;
  }

  findDefault() {
    const calendars = this.map.values();
    for (const calendar of calendars) {
      if (calendar.default) {
        return Some(calendar);
      }
    }
    return None();
  }

  sync() {
    this.map.syncLocalStorage();
  }
}

export { CalendarStorage };
export type { Calendar, CreateCalendar, Timezones };
