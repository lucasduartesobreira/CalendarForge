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
import {
  IndexedDbStorage,
  IndexedDbStorageBuilder,
  openDb,
  StorageAPI,
} from "../indexedDb";

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

class CalendarStorage
  implements
    StorageActions<Calendar["id"], Calendar>,
    BetterEventEmitter<Calendar["id"], Calendar>
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
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, Calendar>,
    Event extends keyof This & string,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
    this.eventEmitter.on(event, handler);
  }

  findById(id: string): Promise<O.Option<Calendar>> {
    const resultAsync = async () => this.map.get(id);
    return resultAsync();
  }
  filteredValues(predicate: (value: Calendar) => boolean): Promise<Calendar[]> {
    const resultAsync = async () => this.map.filterValues(predicate);
    return resultAsync();
  }
  all(): Promise<Calendar[]> {
    const resultAsync = async () => this.map.values();
    return resultAsync();
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
  add(calendar: AddValue<Calendar>): Promise<R.Result<Calendar, symbol>> {
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

  @emitEvent("remove")
  remove(id: string): Promise<R.Result<Calendar, symbol>> {
    const calendar = this.map.get(id);
    const resultAsync = async () =>
      calendar.mapOrElse(
        () => R.Err(CalendarStorage.RemoveCalendarError),
        (calendar) => {
          if (calendar.default) {
            return R.Err(CalendarStorage.RemoveDefaultCalendarError);
          }
          return this.map.remove(id);
        },
      );
    return resultAsync();
  }

  @emitEvent("removeWithFilter")
  removeWithFilter(
    predicate: (value: Calendar) => boolean,
  ): Promise<Calendar[]> {
    const result = this.map.removeAll(
      (value) => !value.default && predicate(value),
    );

    const resultAsync = async () =>
      result.unwrap().map(([, calendar]) => calendar);
    return resultAsync();
  }

  @emitEvent("removeAll")
  removeAll(listOfIds: Array<Calendar["id"]>) {
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
          [] as Array<[Calendar["id"], Calendar]>,
        );
    return resultAsync();
  }

  update(calendarsId: string, calendar: UpdateCalendar) {
    const calendarGet = this.map.get(calendarsId);
    const resultAsync = async () =>
      calendarGet
        .map((calendarFound) => {
          const newCalendar: Calendar = {
            id: calendarsId,
            name: calendar.name ?? calendarFound.name,
            timezone: calendar.timezone ?? calendarFound.timezone,
            default: calendarFound.default,
          };

          const validated = validateTypes(
            newCalendar,
            CalendarStorage.validator,
          );
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
    return resultAsync();
  }

  find(searched: Partial<Calendar>): Promise<Calendar[]> {
    return (async () => {
      const keys = Object.keys(searched) as (keyof Calendar)[];
      if (keys.length === 1 && keys[0] !== "id") {
        const from = keys[0];
        const valueFrom = searched[from];

        if (valueFrom != null) {
          const foundOnIndex = this.map.allWithIndex(from, "id", valueFrom);
          if (foundOnIndex.isSome()) {
            const valuesFromIndex = [];
            for (const id of foundOnIndex.unwrap()) {
              const value = this.map.get(id);
              if (value.isSome()) valuesFromIndex.push(value.unwrap());
            }

            return valuesFromIndex;
          }
        }
      }
      const keysToLook = Object.keys(searched) as (keyof Calendar)[];
      return this.filteredValues((searchee) => {
        return !keysToLook.some((key) => searchee[key] !== searched[key]);
      });
    })();
  }

  findDefault() {
    const calendars = this.map.values();
    for (const calendar of calendars) {
      if (calendar.default) {
        const resultAsync = async () => O.Some(calendar);
        return resultAsync();
      }
    }
    const resultAsync = async () => O.None();
    return resultAsync();
  }

  sync() {
    this.map.syncLocalStorage();
  }
}

export class CalendarStorageIndexedDb
  implements
    StorageActions<Calendar["id"], Calendar>,
    BetterEventEmitter<Calendar["id"], Calendar>
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

  private static indexedDbBuilder: IndexedDbStorageBuilder<"id", Calendar> =
    IndexedDbStorageBuilder.new(
      "calendars",
      CalendarStorageIndexedDb.DEFAULT_VALUE(),
    );

  private map: StorageAPI<"id", Calendar>;

  private constructor(map: IndexedDbStorage<"id", Calendar>) {
    this.map = map;
    this.eventEmitter = new MyEventEmitter();
  }

  emit<
    This extends StorageActions<string, Calendar>,
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<string, Calendar>,
    Event extends keyof This & string,
  >(event: Event, handler: (args: EventArg<Event, This>) => void): void {
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
    const dbResult = await openDb("calendars", [
      this.indexedDbBuilder.upgradeVersionHandler(),
    ]);

    const storage = dbResult
      .andThen((db) => {
        return this.indexedDbBuilder.build(db, forceUpdate);
      })
      .map((value) => new CalendarStorageIndexedDb(value));

    const addDefault = storage.map(async (storage) => {
      const foundDefault = await storage.find({ default: true });
      if (foundDefault.length === 0) {
        const timezone = (-new Date().getTimezoneOffset() / 60) as Timezones;
        await storage.add({
          name: "Default Calendar",
          default: true,
          timezone,
        });
      }
    });

    if (addDefault.isOk()) {
      await addDefault.unwrap();
    }

    return storage;
  }

  @emitEvent("add")
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

  @emitEvent("remove")
  remove(id: string): Promise<R.Result<Calendar, symbol>> {
    const calendar = this.map.remove(id);

    return calendar;
  }

  @emitEvent("removeWithFilter")
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

  @emitEvent("removeAll")
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

  find(searched: Partial<Calendar>): Promise<Calendar[]> {
    return (async () => this.map.findAll(searched))();
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
}

export { CalendarStorage };
export type { Calendar, CreateCalendar, Timezones };
