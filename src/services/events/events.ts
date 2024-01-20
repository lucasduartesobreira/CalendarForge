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

export type DaysOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RecurringSettings = (
  | {
      frequencyType: "daily";
      frequency: number;
    }
  | { frequencyType: "weekly"; days: DaysOfWeek[] }
) & { stop: StopConfig };

export type StopConfig =
  | {
      type: "frequency";
      afterFrequency: number;
    }
  | { type: "date"; afterDay: Date };

type CreateEvent = AddValue<CalendarEvent>;
type UpdateEvent = UpdateValue<CalendarEvent>;

const isPreviousDay = (firstDate: Date, secondDate: Date) => {
  return atMidnight(firstDate) <= atMidnight(secondDate);
};

const HOUR_IN_MILLISECONDS = 3600 * 1000;

const offsetDays = (date: Date, days: number, hoursFromMidnight: number) => {
  return new Date(
    atMidnight(date) + days * 24 * HOUR_IN_MILLISECONDS + hoursFromMidnight,
  );
};

const getTimeSinceMidnight = (date: Date) => {
  return date.getTime() - atMidnight(date);
};

const getStopDate = (startDate: Date, recurringSetting: RecurringSettings) => {
  const { frequencyType, stop } = recurringSetting;
  const { type: stopType } = stop;
  if (frequencyType === "daily") {
    const { frequency } = recurringSetting;
    if (stopType === "frequency") {
      const { afterFrequency } = stop;
      const stopDate = offsetDays(startDate, afterFrequency * frequency, 0);
      return stopDate;
    }
    return new Date(atMidnight(stop.afterDay));
  }

  if (stopType === "frequency") {
    const { afterFrequency } = stop;
    const lastDayOfWeek = offsetDays(startDate, 6 - startDate.getDay(), 0);
    const stopDate = offsetDays(lastDayOfWeek, 7 * afterFrequency, 0);
    return stopDate;
  }

  return new Date(atMidnight(stop.afterDay));
};

const DatesGenerators = {
  daily: (startDate: Date, stopDate: Date, frequency: number) => {
    const dates = [startDate];

    if (isPreviousDay(stopDate, startDate)) return [];

    let actualDay = new Date(atMidnight(startDate));

    const hoursAndMinutesInMiliseconds = getTimeSinceMidnight(startDate);

    actualDay = offsetDays(actualDay, frequency, hoursAndMinutesInMiliseconds);

    while (isPreviousDay(actualDay, stopDate)) {
      dates.push(actualDay);
      actualDay = offsetDays(
        actualDay,
        frequency,
        hoursAndMinutesInMiliseconds,
      );
    }

    return dates;
  },
  weekly: (startDate: Date, stopDate: Date, daysSet: Set<DaysOfWeek>) => {
    const afterDay = stopDate;
    let lastDayPushed = new Date(atMidnight(startDate));

    if (isPreviousDay(afterDay, lastDayPushed)) return [];

    const dates = [startDate];

    const hoursAndMinutesInMiliseconds = getTimeSinceMidnight(startDate);
    let firstDayOfWeek = offsetDays(startDate, -startDate.getDay(), 0);

    while (lastDayPushed.getTime() <= afterDay.getTime()) {
      daysSet.forEach((dayOfWeek) => {
        const newDay = offsetDays(
          firstDayOfWeek,
          dayOfWeek,
          hoursAndMinutesInMiliseconds,
        );

        if (newDay.getTime() > startDate.getTime()) {
          const newDayAtMidgnight = atMidnight(newDay);
          if (isPreviousDay(newDay, afterDay))
            dates.push(
              new Date(newDayAtMidgnight + hoursAndMinutesInMiliseconds),
            );

          lastDayPushed = new Date(newDayAtMidgnight);
        }
      });

      firstDayOfWeek = offsetDays(firstDayOfWeek, 7, 0);
    }

    return dates;
  },
};

export const getRecurringDates = (
  startDate: Date,
  recurringSettings: RecurringSettings,
) => {
  const { frequencyType } = recurringSettings;
  const stopDate = getStopDate(startDate, recurringSettings);
  if (frequencyType === "daily") {
    const generatorOfDatesUntilStopDate = DatesGenerators[frequencyType];
    return generatorOfDatesUntilStopDate(
      startDate,
      stopDate,
      recurringSettings.frequency,
    );
  } else {
    const generatorOfDatesUntilStopDate = DatesGenerators[frequencyType];
    return generatorOfDatesUntilStopDate(
      startDate,
      stopDate,
      new Set(recurringSettings.days),
    );
  }
};

const atMidnight = (date: Date) => new Date(date).setHours(0, 0, 0, 0);

export const getCappedRecurringSetting = (
  capDate: Date,
  recurringSettings: RecurringSettings,
): RecurringSettings => {
  const capDateAtMidnight = atMidnight(capDate);
  const updatedAfterDay = new Date(capDateAtMidnight);

  return {
    ...recurringSettings,
    stop: { type: "date", afterDay: updatedAfterDay },
  };
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
      endDate: Date.now() + HOUR_IN_MILLISECONDS,
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
  ).addIndex({ keyPath: ["task_id"], options: { unique: false } });

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
        const dates = getRecurringDates(
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

  async update(eventId: string, event: UpdateEvent) {
    const found = await this.map.findById(eventId);
    const result = (await this.map.findAndUpdate({ id: eventId }, event))
      .map((value) => value.at(0))
      .andThen((value) => (value != null ? R.Ok(value) : R.Err(NOT_FOUND)));

    this.emit("update", { args: [eventId, event], result, opsSpecific: found });
    return result;
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

export class RecurringEventsManager {
  map: StorageActions<"id", CalendarEvent>;

  constructor(map: StorageActions<"id", CalendarEvent>) {
    this.map = map;
  }

  private hasChanged({
    event,
    eventFound,
  }: {
    event: UpdateEvent;
    eventFound: CalendarEvent;
  }) {
    const {
      startDate: oldStartDate,
      endDate: oldEndDate,
      recurring_settings: oldRecurringSettings,
      color: oldColor,
      title: oldTitle,
      task_id: oldTaskId,
      todo_id: oldTodoId,
      calendar_id: oldCalendarId,
      description: oldDescription,
      notifications: oldNotifications,
    } = eventFound;
    const {
      startDate: newStartDate,
      endDate: newEndDate,
      recurring_settings: newRecurringSettings,
      color: newColor,
      title: newTitle,
      task_id: newTaskId,
      todo_id: newTodoId,
      calendar_id: newCalendarId,
      description: newDescription,
      notifications: newNotifications,
    } = event;
    const changedStartDate = oldStartDate !== newStartDate;
    const changedEndDate = oldEndDate !== newEndDate;
    const changedFrequencyType =
      oldRecurringSettings?.frequencyType !==
      newRecurringSettings?.frequencyType;
    const changedStopType =
      oldRecurringSettings?.stop.type !== newRecurringSettings?.stop.type;
    const changedDailyFrequency =
      oldRecurringSettings?.frequencyType === "daily" &&
      newRecurringSettings?.frequencyType === "daily" &&
      oldRecurringSettings.frequency !== newRecurringSettings.frequency;

    const changedWeekDays =
      oldRecurringSettings?.frequencyType === "weekly" &&
      newRecurringSettings?.frequencyType === "weekly" &&
      oldRecurringSettings.days.find(
        (value, index) => newRecurringSettings.days.at(index) !== value,
      ) != null;

    const changedStopFrequency =
      oldRecurringSettings?.stop.type === "frequency" &&
      newRecurringSettings?.stop.type === "frequency" &&
      oldRecurringSettings.stop.afterFrequency !==
        newRecurringSettings.stop.afterFrequency;
    const changedStopDate =
      oldRecurringSettings?.stop.type === "date" &&
      newRecurringSettings?.stop.type === "date" &&
      oldRecurringSettings.stop.afterDay !== newRecurringSettings.stop.afterDay;

    const changedColor = oldColor !== newColor;
    const changedTitle = oldTitle !== newTitle;
    const changedTaskId = oldTaskId !== newTaskId;
    const changedTodoId = oldTodoId !== newTodoId;
    const changedCalendarId = oldCalendarId !== newCalendarId;
    const changedDescription = oldDescription !== newDescription;

    const changedNotificationsLength =
      oldNotifications.length !== newNotifications?.length;
    const changedNotificationsContent =
      oldNotifications.find(
        (value, index) =>
          value.id !== newNotifications?.at(index)?.id ||
          value.from !== newNotifications.at(index)?.from ||
          value.time !== newNotifications.at(index)?.time ||
          value.timescale !== newNotifications.at(index)?.timescale,
      ) != null;
    const changedNotifications =
      changedNotificationsLength || changedNotificationsContent;

    return {
      changedStartDate,
      changedEndDate,
      changedRecurringSettings:
        changedFrequencyType ||
        changedStopType ||
        changedDailyFrequency ||
        changedWeekDays ||
        changedStopFrequency ||
        changedStopDate,
      changedDateUnrelated:
        changedColor ||
        changedTitle ||
        changedTaskId ||
        changedTodoId ||
        changedCalendarId ||
        changedDescription ||
        changedNotifications,

      changedUnrelatedSpecific: {
        changedColor,
        changedTitle,
        changedTaskId,
        changedTodoId,
        changedCalendarId,
        changedDescription,
        changedNotifications,
      },
    };
  }

  private newDateWithReferenceHours(
    timeInMiliseconds: number,
    reference: Date,
  ) {
    return new Date(timeInMiliseconds).setHours(
      reference.getHours(),
      reference.getMinutes(),
      reference.getSeconds(),
      reference.getMilliseconds(),
    );
  }

  private updateOnBulk(
    events: CalendarEvent[],
    updateEvent: UpdateEvent,
    referenceStart: Date,
    referenceEnd: Date,
    baseBulk: Bulk<CalendarEvent>,
  ) {
    const bulk = events.reduce(
      (
        bulk,
        { id, startDate: startDateMiliseconds, endDate: endDateMiliseconds },
      ) => {
        const startDate = this.newDateWithReferenceHours(
          startDateMiliseconds,
          referenceStart,
        );
        const endDate = this.newDateWithReferenceHours(
          endDateMiliseconds,
          referenceEnd,
        );

        bulk.update({
          ...updateEvent,
          id,
          startDate: startDate,
          endDate: endDate,
        });
        return bulk;
      },
      baseBulk,
    );

    return bulk;
  }

  private removeFromBulk(
    events: CalendarEvent["id"][],
    bulk: Bulk<CalendarEvent>,
  ) {
    events.forEach((id) => bulk.delete(id));

    return bulk;
  }

  private addToBulk(
    events: Omit<CalendarEvent, "id">[],
    bulk: Bulk<CalendarEvent>,
  ) {
    events.forEach((event) => bulk.insert(event));

    return bulk;
  }

  private fixedUpdate(
    event: UpdateEvent,
    changedSpecific: {
      changedTodoId: boolean;
      changedColor: boolean;
      changedTitle: boolean;
      changedTaskId: boolean;
      changedCalendarId: boolean;
      changedDescription: boolean;
      changedNotifications: boolean;
      changedRecurringSettings: boolean;
    },
  ) {
    const {
      changedTodoId,
      changedColor,
      changedTitle,
      changedTaskId,
      changedCalendarId,
      changedDescription,
      changedNotifications,
      changedRecurringSettings,
    } = changedSpecific;
    const toUpdate: UpdateEvent = {};
    if (changedTodoId) toUpdate.todo_id = event.todo_id;
    if (changedColor) toUpdate.color = event.color;
    if (changedTitle) toUpdate.title = event.title;
    if (changedTaskId) toUpdate.task_id = event.task_id;
    if (changedCalendarId) toUpdate.calendar_id = event.calendar_id;
    if (changedDescription) toUpdate.description = event.description;
    if (changedNotifications) toUpdate.notifications = event.notifications;
    if (changedRecurringSettings)
      toUpdate.recurring_settings = event.recurring_settings;

    return toUpdate;
  }

  private async allRelatedEvents(
    id: CalendarEvent["id"],
  ): Promise<
    R.Result<
      readonly [allEvents: CalendarEvent[], eventFound: CalendarEvent],
      symbol
    >
  > {
    return this.map.findById(id).then((eventFound) => {
      return eventFound
        .ok(Symbol(""))
        .map(
          (event) =>
            [
              this.map.findAll({ recurring_id: event.recurring_id ?? id }),
              event.recurring_id
                ? this.map.findById(event.recurring_id)
                : (async () => O.Some(event))(),
              (async () => event)(),
            ] as const,
        )
        .map(async (events) => {
          const [allEvents, base, eventFound] = await Promise.all(events);
          return base
            .map((baseEvent) => {
              allEvents.splice(0, 0, baseEvent);
              return [allEvents, eventFound] as const;
            })
            .ok(Symbol(""));
        })
        .asyncFlatten();
    });
  }

  private findKeptRemovedAndToAddEvents({
    oldStartDate,
    newRecurringSettings,
    allNextEvents,
    referenceStartDate,
    referenceEndDate,
    eventFound,
    event,
    id,
  }: {
    oldStartDate: number;
    newRecurringSettings: RecurringSettings;
    allNextEvents: CalendarEvent[];
    referenceStartDate: Date;
    referenceEndDate: Date;
    eventFound: CalendarEvent;
    event: UpdateValue<CalendarEvent>;
    id: CalendarEvent["id"];
  }) {
    const getNewRecurringDates = new Set(
      getRecurringDates(new Date(oldStartDate), newRecurringSettings).map(
        (date) => date.getTime(),
      ),
    ).add(oldStartDate);

    const [kept, keptDates, removed] = allNextEvents.reduce(
      (acc, event) => {
        const { startDate, id } = event;
        if (getNewRecurringDates.has(startDate)) {
          acc[0].push(event);
          acc[1].add(startDate);
        } else {
          acc[2].push(id);
        }
        return acc;
      },
      [new Array(), new Set([]), new Array()] as [
        CalendarEvent[],
        Set<CalendarEvent["startDate"]>,
        CalendarEvent["id"][],
      ],
    );

    const newEvents = Array.from(getNewRecurringDates.values())
      .filter((dateToTest) => !keptDates.has(dateToTest))
      .map((startDateMiliseconds) => {
        const startDate = this.newDateWithReferenceHours(
          startDateMiliseconds,
          referenceStartDate,
        );
        return {
          ...eventFound,
          ...event,
          recurring_id: id,
          startDate: startDate,
          endDate:
            startDate +
            referenceEndDate.getTime() -
            referenceStartDate.getTime(),
        };
      });

    return [kept, removed, newEvents] as const;
  }

  async updateForward(
    id: CalendarEvent["id"],
    event: UpdateEvent,
  ): Promise<R.Result<null, symbol>> {
    const allFound = await this.allRelatedEvents(id);
    const bulkWhat = allFound.map(([allEvents, eventFound]) => {
      const {
        changedStartDate,
        changedEndDate,
        changedRecurringSettings,
        changedDateUnrelated,
        changedUnrelatedSpecific,
      } = this.hasChanged({
        eventFound,
        event,
      });

      const baseBulk = this.map.bulk(allEvents);
      if (
        !changedStartDate &&
        !changedEndDate &&
        !changedRecurringSettings &&
        !changedDateUnrelated
      )
        return baseBulk;

      const { startDate: oldStartDate, endDate: oldEndDate } = eventFound;
      const {
        startDate: newStartDate,
        endDate: newEndDate,
        recurring_settings: newRecurringSettings,
      } = event;

      const allNextEvents = allEvents.filter(
        ({ startDate }) => startDate >= oldStartDate,
      );

      const referenceStartDate = new Date(newStartDate ?? oldStartDate);
      const referenceEndDate = new Date(newEndDate ?? oldEndDate);

      const dataToUpdate = this.fixedUpdate(event, {
        ...changedUnrelatedSpecific,
        changedRecurringSettings,
      });

      if (!changedRecurringSettings) {
        const bulk = this.updateOnBulk(
          allNextEvents,
          dataToUpdate,
          referenceStartDate,
          referenceEndDate,
          baseBulk,
        );

        return bulk;
      } else if (newRecurringSettings != null) {
        const [kept, removed, newEvents] = this.findKeptRemovedAndToAddEvents({
          oldStartDate,
          eventFound,
          referenceEndDate,
          referenceStartDate,
          newRecurringSettings,
          allNextEvents,
          event,
          id,
        });

        const bulkWithUpdated = this.updateOnBulk(
          kept,
          { ...dataToUpdate, recurring_id: id },
          referenceStartDate,
          referenceEndDate,
          baseBulk,
        );

        const allNextSetIds = new Set(allNextEvents.map(({ id }) => id));

        const beforeUpdatedEvent = allEvents.filter(
          ({ id }) => !allNextSetIds.has(id),
        );

        if (beforeUpdatedEvent.length === 1) {
          bulkWithUpdated.update({
            id: beforeUpdatedEvent[0].id,
            recurring_id: undefined,
            recurring_settings: undefined,
          });
        } else {
          const capped = getCappedRecurringSetting(
            new Date(
              beforeUpdatedEvent.at(-1)?.startDate ??
                referenceStartDate.getTime() - 24 * HOUR_IN_MILLISECONDS,
            ),
            newRecurringSettings,
          );
          beforeUpdatedEvent.forEach(({ id }) =>
            bulkWithUpdated.update({ id, recurring_settings: capped }),
          );
        }

        const bulkRemoved = this.removeFromBulk(removed, bulkWithUpdated);

        bulkRemoved.update({
          id,
          ...dataToUpdate,
          recurring_id: undefined,
        });
        const bulkComplete = this.addToBulk(newEvents, bulkWithUpdated);

        return bulkComplete;
      } else if (
        newRecurringSettings == null &&
        eventFound.recurring_settings != null
      ) {
        const allNext = allNextEvents.reduce(
          (acc, { id: thisId }) => {
            if (thisId !== id) acc.push(thisId);
            return acc;
          },
          [] as CalendarEvent["id"][],
        );

        const allNextIdsSet = new Set(allNext);

        const bulk = this.removeFromBulk(allNext, baseBulk);
        bulk.update({
          id,
          recurring_id: undefined,
          recurring_settings: undefined,
        });

        const beforeUpdatedEvent = allEvents.filter(
          (event) => !allNextIdsSet.has(event.id),
        );

        if (beforeUpdatedEvent.length === 1) {
          bulk.update({
            id: beforeUpdatedEvent[0].id,
            recurring_id: undefined,
            recurring_settings: undefined,
          });
        } else {
          const capped = getCappedRecurringSetting(
            new Date(
              beforeUpdatedEvent.at(-1)?.startDate ??
                referenceStartDate.getTime() - 24 * HOUR_IN_MILLISECONDS,
            ),
            eventFound.recurring_settings,
          );
          beforeUpdatedEvent.forEach(({ id }) =>
            bulk.update({ id, recurring_settings: capped }),
          );
        }

        return bulk;
      } else {
        return baseBulk;
      }
    });

    return bulkWhat.map((bulk) => bulk.commit()).asyncFlatten();
  }

  async updateAll(
    id: CalendarEvent["id"],
    event: UpdateEvent,
  ): Promise<R.Result<null, symbol>> {
    const findRoot = await this.map.findById(id);
    return await findRoot
      .map(({ id: thisId, startDate, endDate }) => {
        const oldStartDate = new Date(startDate);
        const oldEndDate = new Date(endDate);

        const newStartDate = new Date(event.startDate ?? startDate);
        const newEndDate = new Date(event.endDate ?? endDate);

        return this.updateForward(thisId, {
          ...event,
          startDate: oldStartDate.setHours(
            newStartDate.getHours(),
            newStartDate.getMinutes(),
            newStartDate.getSeconds(),
            newStartDate.getMilliseconds(),
          ),
          endDate: oldEndDate.setHours(
            newEndDate.getHours(),
            newEndDate.getMinutes(),
            newEndDate.getSeconds(),
            newEndDate.getMilliseconds(),
          ),
        });
      })
      .ok(Symbol("Cannot update a deleted record"))
      .asyncFlatten();
  }

  async deleteForward(id: CalendarEvent["id"]) {
    const allRelatedEvents = await this.allRelatedEvents(id);
    const bulk = allRelatedEvents.map(([allRelatedEventsFound, eventFound]) => {
      const { recurring_settings } = eventFound;
      const bulk = this.map.bulk(allRelatedEventsFound);
      if (recurring_settings == null) return bulk;

      const allForward = allRelatedEventsFound.reduce(
        (acc, nextEvent) => {
          const { id, startDate } = nextEvent;
          if (startDate >= eventFound.startDate) {
            acc.set(id, nextEvent);
          }
          return acc;
        },
        new Map() as Map<CalendarEvent["id"], CalendarEvent>,
      );

      const removedFromBulk = this.removeFromBulk(
        Array.from(allForward.keys()),
        bulk,
      );

      const allBefore = allRelatedEventsFound.filter(
        (relatedEvent) => !allForward.has(relatedEvent.id),
      );

      if (allBefore.length === 1) {
        removedFromBulk.update({
          id: allBefore[0].id,
          recurring_settings: undefined,
        });

        return removedFromBulk;
      }

      const cappedRecurringSettings = getCappedRecurringSetting(
        new Date(allBefore.at(-1)?.startDate ?? eventFound.startDate),
        recurring_settings,
      );

      return allBefore.reduce((bulk, event) => {
        bulk.update({
          id: event.id,
          recurring_settings: cappedRecurringSettings,
        });
        return bulk;
      }, removedFromBulk);
    });

    return bulk.map((bulk) => bulk.commit()).asyncFlatten();
  }

  async deleteAll(id: CalendarEvent["id"]) {
    const eventFound = await this.map.findById(id);
    return eventFound
      .ok(Symbol("Couldn't find record with this id"))
      .map(({ recurring_id, recurring_settings, id }) =>
        recurring_settings != null
          ? id === recurring_id || recurring_id == null
            ? this.deleteForward(id)
            : this.deleteForward(recurring_id)
          : (async () => R.Ok(null))(),
      )
      .asyncFlatten();
  }
}

export type { CalendarEvent, CreateEvent, UpdateEvent, EventNotification };
export { COLORS as EventColors };
