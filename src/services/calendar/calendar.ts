import { Actions } from "@/hooks/mapHook";
import { None, Some } from "@/utils/option";
import { Err, Ok, Result } from "@/utils/result";
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
): Result<A, string> => {
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
    : Err("Missing properties or property with wrong type");
};

type CreateCalendar = Omit<Calendar, "id" | "default">;
type UpdateCalendar = Partial<CreateCalendar>;

class CalendarStorage {
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

  private calendars: Omit<Map<string, Calendar>, "set" | "clear" | "delete">;
  private actions: Actions<string, Calendar>;

  constructor(
    calendars: Omit<Map<string, Calendar>, "set" | "clear" | "delete">,
    actions: Actions<string, Calendar>,
  ) {
    this.calendars = calendars;
    this.actions = actions;

    if (Array.from(calendars.values()).length === 0) {
      const id = Buffer.from(Date.now().toString()).toString("base64");
      const timezone = (-new Date().getTimezoneOffset() / 60) as Timezones;
      this.actions.set(id, {
        id,
        name: "Default Calendar",
        timezone,
        default: true,
      });
    }
  }

  addCalendar(calendar: CreateCalendar): Result<Calendar, string> {
    const id = Buffer.from(Date.now().toString()).toString("base64");
    const { id: _id, ...validator } = CalendarStorage.validator;
    const validated = validateTypes(calendar, validator);
    if (validated.isOk()) {
      const calendarCreated = { id, default: false, ...calendar };
      this.actions.set(id, calendarCreated);
      return Ok(calendarCreated);
    }

    return validated;
  }

  static RemoveCalendarError = Symbol(
    "There is no calendar registered with this id",
  );

  static RemoveDefaultCalendarError = Symbol(
    "Not allowed to delete the default calendar",
  );

  removeCalendar(id: string): Result<Calendar, symbol> {
    const calendar = this.calendars.get(id);
    if (calendar !== undefined) {
      if (!calendar.default) {
        return Err(CalendarStorage.RemoveDefaultCalendarError);
      }
      this.actions.remove(id);
      return Ok(calendar);
    }
    return Err(CalendarStorage.RemoveCalendarError);
  }

  getCalendars(): Calendar[] {
    return Array.from(this.calendars.values());
  }

  updateCalendar(calendarsId: string, calendar: UpdateCalendar) {
    const calendarFound = this.calendars.get(calendarsId);
    if (calendarFound == undefined) {
      return Err(Symbol("Event not found"));
    }

    const newCalendar: Calendar = {
      id: calendarsId,
      name: calendar.name ?? calendarFound.name,
      timezone: calendar.timezone ?? calendarFound.timezone,
      default: false,
    };

    const validated = validateTypes(newCalendar, CalendarStorage.validator);
    if (validated.isOk()) {
      this.actions.set(calendarsId, newCalendar);
    }

    return validated;
  }

  findDefault() {
    const calendars = this.calendars.values();
    for (const calendar of calendars) {
      if (calendar.default) {
        return Some(calendar);
      }
    }
    return None();
  }

  sync(map: Omit<Map<string, Calendar>, "set" | "clear" | "delete">) {
    this.calendars = new Map(map);
  }
}

export { CalendarStorage };
export type { Calendar, CreateCalendar, Timezones };
