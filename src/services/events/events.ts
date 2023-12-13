import * as R from "@/utils/result";
import * as O from "@/utils/option";
import { AddValue, StorageActions, UpdateValue } from "@/utils/storage";
import {
  BetterEventEmitter,
  EventArg,
  MyEventEmitter,
  emitEvent,
} from "@/utils/eventEmitter";
import {
  IndexedDbStorage,
  IndexedDbStorageBuilder,
  NOT_FOUND,
  StorageAPI,
  openDb,
} from "@/utils/indexedDb";
import { Bulk } from "@/utils/bulk";

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
  task_id?: string;
  recurring_settings?: RecurringSettings;
  recurring_id?: string;
};

type DaysOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type RecurringSettings = (
  | {
      frequencyType: "daily";
      frequency: number;
    }
  | { frequencyType: "weekly"; days: DaysOfWeek[] }
) & { stop: StopConfig };

type StopConfig =
  | {
      afterFrequency: number;
    }
  | { afterDay: Date };

type CreateEvent = AddValue<CalendarEvent>;
type UpdateEvent = UpdateValue<CalendarEvent>;

export const GetEventDays = (
  startDate: Date,
  recurringSettings: RecurringSettings,
): Date[] => {
  const { frequencyType, stop } = recurringSettings;
  if (frequencyType === "daily") {
    const { frequency } = recurringSettings;
    if (frequency <= 0) return [];

    if ("afterFrequency" in stop) {
      let { afterFrequency } = stop;
      let dates = new Array();
      dates.push(startDate);
      while (afterFrequency > 0) {
        dates.push(
          new Date(
            startDate.getTime() + 24 * 3600 * 1000 * dates.length * frequency,
          ),
        );
        afterFrequency--;
      }

      return dates;
    } else {
      let { afterDay } = stop;

      if (afterDay.getTime() <= startDate.getTime()) return [];

      afterDay.setHours(0, 0, 0, 0);
      let actualDay = startDate;
      const actualDayOnMidnight = actualDay.setHours(0, 0, 0, 0);

      const hoursAndMinutesInMiliseconds =
        startDate.getTime() - actualDayOnMidnight;

      let dates = new Array();
      dates.push(actualDay);
      while (actualDay.getTime() < afterDay.getTime()) {
        actualDay = new Date(
          actualDay.getTime() +
            24 * 3600 * 1000 * frequency +
            hoursAndMinutesInMiliseconds,
        );

        dates.push(actualDay);
      }

      return dates;
    }
  } else if (frequencyType === "weekly") {
    const { days } = recurringSettings;

    if (days.length === 0) return [];

    const daysSet = new Set(days.sort());

    if ("afterFrequency" in stop) {
      let { afterFrequency } = stop;

      let dates = new Array();
      dates.push(startDate);
      let firstDayOfWeek = new Date(
        startDate.getTime() - startDate.getDay() * 24 * 3600 * 1000,
      );
      while (afterFrequency > 0) {
        daysSet.forEach((dayOfWeek) => {
          const newDay = new Date(
            firstDayOfWeek.getTime() + dayOfWeek * 24 * 3600 * 1000,
          );
          if (newDay.getTime() > startDate.getTime()) {
            dates.push(newDay);
          }
        });

        firstDayOfWeek = new Date(
          firstDayOfWeek.getTime() + 7 * 24 * 3600 * 1000,
        );
        afterFrequency--;
      }

      return dates;
    } else {
      let { afterDay } = stop;
      afterDay.setHours(0, 0, 0, 0);

      let lastDayPushed = startDate;
      lastDayPushed.setHours(0, 0, 0, 0);

      if (afterDay.getTime() <= startDate.getTime()) return [];

      let dates = new Array();

      dates.push(startDate);

      let firstDayOfWeek = new Date(
        startDate.getTime() - startDate.getDay() * 24 * 3600 * 1000,
      );

      while (lastDayPushed.getTime() <= afterDay.getTime()) {
        daysSet.forEach((dayOfWeek) => {
          const newDay = new Date(
            firstDayOfWeek.getTime() + dayOfWeek * 24 * 3600 * 1000,
          );

          if (newDay.getTime() > startDate.getTime()) {
            if (
              new Date(newDay.getTime()).setHours(0, 0, 0, 0) <=
              afterDay.getTime()
            )
              dates.push(newDay);

            newDay.setHours(0, 0, 0, 0);
            lastDayPushed = newDay;
          }
        });

        firstDayOfWeek = new Date(
          firstDayOfWeek.getTime() + 7 * 24 * 3600 * 1000,
        );
      }

      return dates;
    }
  }

  return [];
};

export class EventStorageIndexedDb
  implements
    StorageActions<"id", CalendarEvent>,
    BetterEventEmitter<"id", CalendarEvent>
{
  private map: StorageAPI<"id", CalendarEvent>;
  private eventEmitter: MyEventEmitter;

  private static DB_NAME = "events";
  private static DEFAULT_VALUE(): Omit<CalendarEvent, "id"> {
    return {
      title: "",
      endDate: Date.now() + 60 * 60 * 1000,
      startDate: Date.now(),
      description: "",
      calendar_id: "",
      notifications: [],
      color: "#7a5195",
    };
  }
  private static indexedDbBuilder: IndexedDbStorageBuilder<
    "id",
    CalendarEvent
  > = IndexedDbStorageBuilder.new(
    EventStorageIndexedDb.DB_NAME,
    EventStorageIndexedDb.DEFAULT_VALUE(),
  );

  private constructor(map: IndexedDbStorage<"id", CalendarEvent>) {
    this.map = map;
    this.eventEmitter = new MyEventEmitter();
  }
  emit<
    This extends StorageActions<"id", CalendarEvent>,
    Event extends keyof This & string,
  >(event: Event, args: EventArg<Event, This, "id", CalendarEvent>): void {
    this.eventEmitter.emit(event, args);
  }
  on<
    This extends StorageActions<"id", CalendarEvent>,
    Event extends keyof This & string,
  >(
    event: Event,
    handler: (args: EventArg<Event, This, "id", CalendarEvent>) => void,
  ): void {
    this.eventEmitter.on(event, handler);
  }
  filteredValues(
    predicate: (value: CalendarEvent) => boolean,
  ): Promise<CalendarEvent[]> {
    const resultAsync = async () => (await this.map.getAll()).filter(predicate);
    return resultAsync();
  }
  all(): Promise<CalendarEvent[]> {
    const resultAsync = async () => await this.map.getAll();
    return resultAsync();
  }

  static async new(forceUpdate: () => void) {
    const dbResult = await openDb(EventStorageIndexedDb.DB_NAME, [
      this.indexedDbBuilder.upgradeVersionHandler(),
    ]);

    return dbResult
      .andThen((db) => {
        return this.indexedDbBuilder.build(db, forceUpdate);
      })
      .map((value) => new EventStorageIndexedDb(value));
  }

  @emitEvent
  async add(
    event: AddValue<CalendarEvent>,
  ): Promise<R.Result<CalendarEvent, symbol>> {
    const created = await this.map.add(event);

    const bulkResult = created.map(({ id, ...event }) => {
      if (event.recurring_settings != null) {
        const dates = GetEventDays(
          new Date(event.startDate),
          event.recurring_settings,
        ).slice(1);

        const bulk = dates.reduce((bulk, date) => {
          bulk.insert({
            ...event,
            recurring_id: id,
            recurring_settings: event.recurring_settings,
            startDate: date.getTime(),
            endDate: new Date(
              date.getTime() + event.endDate - event.startDate,
            ).getTime(),
          });
          return bulk;
        }, this.bulk());

        return bulk;
      }
    });

    if (bulkResult.isOk()) {
      const bulk = bulkResult.unwrap();
      if (bulk) {
        let response = await bulk.commit();
        if (!response.isOk()) {
          await bulk.retry();
        }
      }
    }

    return created;
  }

  @emitEvent
  remove(eventId: string): Promise<R.Result<CalendarEvent, symbol>> {
    const resultAsync = async () => this.map.remove(eventId);
    return resultAsync();
  }

  @(emitEvent<
    "id",
    CalendarEvent,
    EventStorageIndexedDb,
    "removeWithFilter",
    [predicate: (value: CalendarEvent) => boolean],
    Promise<CalendarEvent[]>
  >)
  removeWithFilter(
    predicate: (event: CalendarEvent) => boolean,
  ): Promise<CalendarEvent[]> {
    const result = this.map.getAll();
    const resultAsync = async () =>
      (
        await Promise.all(
          (await result)
            .filter(predicate)
            .map(async ({ id }) => await this.map.remove(id)),
        )
      ).reduce(
        (acc, current) => (current.isOk() ? [...acc, current.unwrap()] : acc),
        [] as CalendarEvent[],
      );

    return resultAsync();
  }

  @emitEvent
  removeAll(listOfIds: Array<CalendarEvent["id"]>) {
    const resultAsync = async () =>
      (
        await Promise.all(
          listOfIds.map(async (id) => {
            return await this.map.remove(id);
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
        [] as Array<[CalendarEvent["id"], CalendarEvent]>,
      );
    return resultAsync();
  }

  findById(eventId: string): Promise<O.Option<CalendarEvent>> {
    const event = this.map.findById(eventId);
    const resultAsync = async () => event;
    return resultAsync();
  }

  findAll(searched: Partial<CalendarEvent>): Promise<CalendarEvent[]> {
    return (async () => {
      return this.map.findAll(searched);
    })();
  }

  find(
    searched: Partial<CalendarEvent>,
  ): Promise<O.OptionClass<CalendarEvent>> {
    return this.map.find(searched);
  }

  filter(predicate: (event: CalendarEvent) => boolean) {
    const filtered = this.map.getAll();

    const resultAsync = async () => (await filtered).filter(predicate);
    return resultAsync();
  }

  update(eventId: string, event: UpdateEvent) {
    const resultAsync = async () =>
      (await this.map.findAndUpdate({ id: eventId }, event))
        .map((value) => value.at(0))
        .andThen((value) => (value != null ? R.Ok(value) : R.Err(NOT_FOUND)));

    return resultAsync();
  }

  values() {
    const resultAsync = async () => this.map.getAll();
    return resultAsync();
  }

  close() {
    this.map.close();
  }

  bulk(initialValue?: CalendarEvent[]): Bulk<CalendarEvent> {
    return new Bulk(initialValue ?? [], this.map);
  }
}

export type { CalendarEvent, CreateEvent, UpdateEvent, EventNotification };
export { COLORS as EventColors };
