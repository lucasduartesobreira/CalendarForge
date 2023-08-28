import { Actions } from "@/hooks/mapHook";
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
  }

  addCalendar(calendar: Calendar): Result<Calendar, string> {
    const validated = validateTypes(calendar, CalendarStorage.validator);
    if (validated.isOk() && !this.calendars.has(calendar.id))
      this.actions.set(calendar.id, calendar);

    return validated;
  }

  static RemoveCalendarError = Symbol(
    "There is no calendar registered with this id",
  );

  removeCalendar(id: string): Result<Calendar, symbol> {
    const calendar = this.calendars.get(id);
    if (calendar !== undefined) {
      this.actions.remove(id);
      return Ok(calendar);
    }
    return Err(CalendarStorage.RemoveCalendarError);
  }

  getCalendars() {
    console.log(this.calendars);
  }
}

export { CalendarStorage };
export type { Calendar, Timezones };
