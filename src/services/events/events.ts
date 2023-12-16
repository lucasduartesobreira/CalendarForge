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
      type: "frequency";
      afterFrequency: number;
    }
  | { type: "date"; afterDay: Date };

type CreateEvent = AddValue<CalendarEvent>;
type UpdateEvent = UpdateValue<CalendarEvent>;

export const getRecurringDates = (
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

    if (stop.type === "frequency") {
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

export const getCappedRecurringSetting = (
  capDate: Date,
  recurringSettings: RecurringSettings,
): RecurringSettings => {
  const capDateAtMidnight = new Date(capDate.getTime()).setHours(0, 0, 0, 0);
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

  async updateForward(
    id: CalendarEvent["id"],
    event: UpdateEvent,
  ): Promise<R.Result<null, symbol>> {
    if (event.recurring_settings != null) {
      const found = await this.map.findById(id);
      return await found
        .map(async (eventFound) => {
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

          if (
            !changedStartDate &&
            !changedEndDate &&
            !changedRecurringSettings &&
            !changedDateUnrelated
          )
            return R.Ok(null);

          const { startDate: oldStartDate, endDate: oldEndDate } = eventFound;
          const {
            startDate: newStartDate,
            endDate: newEndDate,
            recurring_settings: newRecurringSettings,
            recurring_id,
          } = event;

          const foundAllRelatedEvents = await this.map.findAll({
            recurring_id: recurring_id ?? id,
          });

          if (!foundAllRelatedEvents.find(({ id: thisId }) => thisId === id)) {
            foundAllRelatedEvents.splice(0, 0, eventFound);
          }

          const allNextEvents = foundAllRelatedEvents.filter(
            ({ startDate }) => startDate >= oldStartDate,
          );

          const baseBulk = this.map.bulk(allNextEvents);

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

            return await bulk.commit();
          } else if (newRecurringSettings != null) {
            const getNewRecurringDates = new Set(
              getRecurringDates(
                new Date(oldStartDate),
                newRecurringSettings,
              ).map((date) => date.getTime()),
            );

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

            const bulkRemoved = this.removeFromBulk(removed, baseBulk);
            const bulkWithUpdated = this.updateOnBulk(
              kept,
              { ...dataToUpdate, recurring_id: id },
              referenceStartDate,
              referenceEndDate,
              bulkRemoved,
            );

            bulkWithUpdated.update({
              id,
              recurring_id: undefined,
              ...dataToUpdate,
            });
            const bulkComplete = this.addToBulk(newEvents, bulkWithUpdated);

            return await bulkComplete.commit();
          } else if (newRecurringSettings == null) {
            const allNext = allNextEvents.reduce(
              (acc, { id: thisId }) => {
                if (thisId !== id) acc.push(thisId);
                return acc;
              },
              [] as CalendarEvent["id"][],
            );
            const bulk = this.removeFromBulk(allNext, baseBulk);
            bulk.update({
              id,
              recurring_id: undefined,
              recurring_settings: undefined,
            });

            return await bulk.commit();
          } else {
            return R.Ok(null);
          }
        })
        .ok(Symbol("Cannot update deleted event"))
        .asyncFlatten();
    }

    return R.Ok(null);
  }

  async updateAll(
    id: CalendarEvent["id"],
    event: UpdateEvent,
  ): Promise<R.Result<null, symbol>> {
    const findRoot = await this.map.findById(id);
    return await findRoot
      .map(({ id: thisId }) => this.updateForward(thisId, event))
      .map((result) => {
        this.map.update(id, event);
        return result;
      })
      .ok(Symbol("Cannot update a deleted record"))
      .asyncFlatten();
  }

  async deleteForward(id: CalendarEvent["id"]) {
    const found = await this.map.findById(id);
    return found
      .map(async (eventFound) => {
        const { recurring_settings } = eventFound;
        if (recurring_settings != null) {
          const base = eventFound.recurring_id
            ? await this.map.findById(eventFound.recurring_id)
            : O.Some(eventFound);

          return await base
            .ok(Symbol("Cannot find main event"))
            .map(async (base) => {
              const allRelatedEventsFound = await this.map.findAll({
                recurring_id: eventFound.recurring_id ?? id,
              });

              if (allRelatedEventsFound.find(({ id }) => id === base.id))
                allRelatedEventsFound.splice(0, 0, base);

              const allForward = allRelatedEventsFound.reduce(
                (acc, nextEvent) => {
                  const { id, startDate } = nextEvent;
                  if (startDate > eventFound.startDate) {
                    acc.set(id, nextEvent);
                  }
                  return acc;
                },
                new Map() as Map<CalendarEvent["id"], CalendarEvent>,
              );

              const bulk = this.map.bulk(allRelatedEventsFound);
              const removedFromBulk = this.removeFromBulk(
                Array.from(allForward.keys()),
                bulk,
              );

              const allBefore = allRelatedEventsFound.filter(
                (relatedEvent) => !allForward.has(relatedEvent.id),
              );

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
            })
            .map(async (bulk) => (await bulk).commit())
            .asyncFlatten();
        }
        return R.Ok(null);
      })
      .ok(Symbol("Couldn't find record with this id"))
      .asyncFlatten();
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
      .map(async (result) => {
        await this.map.remove(id);
        return result;
      })
      .asyncFlatten();
  }
}

export type { CalendarEvent, CreateEvent, UpdateEvent, EventNotification };
export { COLORS as EventColors };
