import {
  BetterEventEmitter,
  emitEvent,
  EventArg,
  MyEventEmitter,
} from "@/utils/eventEmitter";
import * as O from "@/utils/option";
import * as R from "@/utils/result";
import { AddValue, StorageActions, UpdateValue } from "@/utils/storage";
import { validateTypes, ValidatorType } from "@/utils/validator";
import {
  IndexedDbStorage,
  IndexedDbStorageBuilder,
  openDb,
  StorageAPI,
} from "../indexedDb";
import { Bulk } from "@/utils/bulk";

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

export class CalendarStorageIndexedDb
  implements StorageActions<"id", Calendar>, BetterEventEmitter<"id", Calendar>
{
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

  private static DEFAULT_VALUE(): Omit<Calendar, "id"> {
    const timezone = (-new Date().getTimezoneOffset() / 60) as Timezones;
    return {
      name: "Default Calendar",
      timezone,
      default: true,
    };
  }

  private static DB_NAME = "calendars";
  private static indexedDbBuilder: IndexedDbStorageBuilder<"id", Calendar> =
    IndexedDbStorageBuilder.new(
      CalendarStorageIndexedDb.DB_NAME,
      CalendarStorageIndexedDb.DEFAULT_VALUE(),
    );

  private map: StorageAPI<"id", Calendar>;

  private constructor(map: IndexedDbStorage<"id", Calendar>) {
    this.map = map;
    this.eventEmitter = new MyEventEmitter();
  }

  emit<
    This extends StorageActions<"id", Calendar>,
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This, "id", Calendar>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<"id", Calendar>,
    Event extends keyof This & string,
  >(
    event: Event,
    handler: (args: EventArg<Event, This, "id", Calendar>) => void,
  ): void {
    this.eventEmitter.on(event, handler);
  }

  findById(id: string): Promise<O.Option<Calendar>> {
    const resultAsync = async () => this.map.findById(id);
    return resultAsync();
  }
  filteredValues(predicate: (value: Calendar) => boolean): Promise<Calendar[]> {
    const resultAsync = async () => (await this.map.getAll()).filter(predicate);
    return resultAsync();
  }
  all(): Promise<Calendar[]> {
    const resultAsync = async () => this.map.getAll();
    return resultAsync();
  }

  static async new(forceUpdate: () => void) {
    const dbResult = await openDb(CalendarStorageIndexedDb.DB_NAME, [
      this.indexedDbBuilder.upgradeVersionHandler(),
    ]);

    const storage = dbResult
      .andThen((db) => {
        return this.indexedDbBuilder.build(db, forceUpdate);
      })
      .map((value) => new CalendarStorageIndexedDb(value));

    return storage;
  }

  setupDefaults() {
    return (async () => {
      const foundDefault = await this.find({ default: true });
      if (!foundDefault.isSome()) {
        const timezone = (-new Date().getTimezoneOffset() / 60) as Timezones;
        await this.map.add({
          name: "Default Calendar",
          default: true,
          timezone,
        });
      }
    })();
  }

  @emitEvent
  add(calendar: AddValue<Calendar>): Promise<R.Result<Calendar, symbol>> {
    const { id: _id, ...validator } = CalendarStorageIndexedDb.validator;
    const validated = validateTypes(calendar, validator);
    if (validated.isOk()) {
      const calendarCreated = { ...calendar, default: false };
      let result = this.map.add(calendarCreated);

      const resultAsync = async () => result;
      return resultAsync();
    }

    const resultAsync = async () => R.Err(validated.unwrap_err());
    return resultAsync();
  }

  static RemoveCalendarError = Symbol(
    "There is no calendar registered with this id",
  );

  static RemoveDefaultCalendarError = Symbol(
    "Not allowed to delete the default calendar",
  );

  @emitEvent
  remove(id: string): Promise<R.Result<Calendar, symbol>> {
    const calendar = this.map.remove(id);

    return calendar;
  }

  @(emitEvent<
    "id",
    Calendar,
    CalendarStorageIndexedDb,
    "removeWithFilter",
    [predicate: (value: Calendar) => boolean],
    Promise<Calendar[]>
  >)
  removeWithFilter(
    predicate: (value: Calendar) => boolean,
  ): Promise<Calendar[]> {
    return (async () => {
      const list = (await this.map.getAll()).filter(predicate);
      const removedList = await Promise.all(
        list.map(({ id }) => this.map.remove(id)),
      );
      const calendarsRemoved = removedList.reduce(
        (acc, current) =>
          current.mapOrElse(
            () => acc,
            (calendar) => {
              acc.push(calendar);
              return acc;
            },
          ),
        [] as Calendar[],
      );
      return calendarsRemoved;
    })();
  }

  @emitEvent
  removeAll(listOfIds: Array<Calendar["id"]>) {
    const resultAsync = async () =>
      (
        await Promise.all(
          listOfIds.map((id) => {
            return this.map.remove(id);
          }),
        )
      ).reduce(
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
    return resultAsync();
  }

  update(calendarsId: string, calendar: UpdateCalendar) {
    const calendarGet = this.map.findById(calendarsId);
    const resultAsync = async () =>
      (
        await (
          await calendarGet
        )
          .map(async (calendarFound) => {
            const newCalendar: Calendar = {
              id: calendarsId,
              name: calendar.name ?? calendarFound.name,
              timezone: calendar.timezone ?? calendarFound.timezone,
              default: calendarFound.default,
            };

            const validated = validateTypes(
              newCalendar,
              CalendarStorageIndexedDb.validator,
            );
            const result = await validated.mapOrElse<
              Promise<R.Result<Calendar, symbol>>
            >(
              async (err) => R.Err(err),
              async () => {
                return (
                  await this.map.findAndUpdate({ id: calendarsId }, calendar)
                )
                  .map((calendars) => calendars.at(0))
                  .andThen((calendar) =>
                    calendar != null
                      ? R.Ok(calendar)
                      : R.Err(Symbol("Pretty Fucked up Error")),
                  );
              },
            );

            this.emit("update", {
              args: [calendarsId, calendar],
              result,
              opsSpecific: calendarFound,
            });

            return result.option();
          })
          .asyncFlatten()
      ).ok(Symbol("Event not found"));
    return resultAsync();
  }

  findAll(searched: Partial<Calendar>): Promise<Calendar[]> {
    return (async () => this.map.findAll(searched))();
  }

  find(searched: Partial<Calendar>): Promise<O.OptionClass<Calendar>> {
    return this.map.find(searched);
  }
  findDefault() {
    return (async () => {
      const calendars = this.map.getAll();
      for (const calendar of await calendars) {
        if (calendar.default) {
          return O.Some(calendar);
        }
      }
      return O.None();
    })();
  }

  close() {
    this.map.close();
  }

  bulk(initialValue?: Calendar[]): Bulk<Calendar> {
    return new Bulk(initialValue ?? [], this.map);
  }
}

export type { Calendar, CreateCalendar, Timezones };
