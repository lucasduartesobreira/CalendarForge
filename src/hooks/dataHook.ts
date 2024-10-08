/* eslint-disable react-hooks/exhaustive-deps */
import {
  CalendarEvent,
  EventStorageIndexedDb,
  RecurringEventsManager,
} from "@/services/events/events";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as O from "@/utils/option";
import {
  Calendar,
  CalendarStorageIndexedDb,
} from "@/services/calendar/calendar";
import { NotificationManager } from "@/services/notifications/notificationPermission";
import {
  EventTemplate,
  EventTemplateStorageIndexedDb,
} from "@/services/events/eventTemplates";
import { Task, TaskStorageIndexedDb } from "@/services/task/task";
import { StorageActions } from "@/utils/storage";

type Storages = {
  eventsStorage: StorageActions<"id", CalendarEvent>;
  calendarsStorage: StorageActions<"id", Calendar>;
  eventsTemplateStorage: StorageActions<"id", EventTemplate>;
  tasksStorage: StorageActions<"id", Task>;
};

type StorageContext = {
  storages: O.Option<Storages>;
  listeners: StorageListeners;
};

type StorageListeners = {
  [Key in keyof Storages as `${Key}Listener`]: StateUpdate;
};

const StorageContext = createContext<StorageContext>({
  storages: O.None(),
  listeners: {
    eventsStorageListener: undefined,
    calendarsStorageListener: undefined,
    eventsTemplateStorageListener: undefined,
    tasksStorageListener: undefined,
  },
});

export const RecurringEventsHandler = createContext<
  O.Option<RecurringEventsManager>
>(O.None());
type StateUpdate = {} | undefined;

const useForceUpdate = () => {
  const [stateUpdated, updateState] = useState<{}>();
  const forceUpdate = useCallback(() => updateState({}), []);
  return [stateUpdated, forceUpdate] as const;
};

export function useDataStorage(): StorageContext {
  const [calendarsUpdated, forceCalendarUpdate] = useForceUpdate();
  const [eventsUpdated, forceEventsUpdate] = useForceUpdate();
  const [templatesUpdated, forceTemplatesUpdate] = useForceUpdate();
  const [tasksUpdated, forceTasksUpdate] = useForceUpdate();

  const [clientData, setClientData] = useState<O.Option<Storages>>(O.None());
  const [setupDefaults, setFunctionSetup] = useState<
    O.Option<() => Promise<void>>
  >(O.None());

  const storages = [
    EventStorageIndexedDb.new(forceEventsUpdate),
    CalendarStorageIndexedDb.new(forceCalendarUpdate),
    TaskStorageIndexedDb.new(forceTasksUpdate),
    EventTemplateStorageIndexedDb.new(forceTemplatesUpdate),
  ] as const;

  let isDataReady: boolean = false;

  Promise.all(storages).then((value) => {
    isDataReady = !value.some((value) => !value.isOk());
  });
  useEffect(() => {
    (async () => {
      const [
        eventsStorageIDB,
        calendarStorageIDB,
        taskStorageIDB,
        eventTemplatesIDB,
      ] = await Promise.all(storages);

      if (isDataReady) {
        const notificationManager = new NotificationManager();
        const eventsUnwrapped = eventsStorageIDB.unwrap();
        const calendarsUnwrapped = calendarStorageIDB.unwrap();
        const tasksUnwraped = taskStorageIDB.unwrap();
        const templatesUnwrapped = eventTemplatesIDB.unwrap();

        eventsUnwrapped.on("add", ({ result: output }) => {
          if (output.isOk()) {
            const eventCreated = output.unwrap();
            eventCreated.notifications.forEach((notification) => {
              notificationManager.push(notification, eventCreated);
            });
          }
        });

        eventsUnwrapped.on(
          "update",
          ({ args: input, result: output, opsSpecific: found }) => {
            const [_id, eventPreUpdate] = input;
            if (
              output.isOk() &&
              found.isSome() &&
              eventPreUpdate.notifications
            ) {
              const updatedEvent = output.unwrap();
              const foundEvent = found.unwrap();
              foundEvent.notifications.forEach(({ id }: { id: string }) => {
                notificationManager.remove(id);
              });

              updatedEvent.notifications.forEach((notification) => {
                notificationManager.push(notification, updatedEvent);
              });
            }
          },
        );

        eventsUnwrapped.on("update", ({ result, opsSpecific }) => {
          const found = opsSpecific as O.Option<CalendarEvent>;
          result
            .option()
            .flatMap((updatedEvent) =>
              found.map((foundEvent) => [updatedEvent, foundEvent] as const),
            )
            .map(([updatedEvent, foundEvent]) => {
              const { task_id: updatedTaskId } = updatedEvent;
              const { task_id: foundTaskId } = foundEvent;
              const wasTurnedIntoEvent =
                updatedTaskId == null && foundTaskId != null;

              if (wasTurnedIntoEvent) {
                const taskId = foundTaskId;
                return eventsUnwrapped
                  .find({ task_id: taskId })
                  .then((result) => {
                    result.mapOrElse(
                      () => {
                        tasksUnwraped.remove(taskId);
                      },
                      () => {},
                    );
                  });
              }
            });
        });

        eventsUnwrapped.on("remove", ({ result }) => {
          result.map(({ task_id }) => {
            eventsUnwrapped.find({ task_id }).then((findResult) =>
              findResult.mapOrElse(
                () => {
                  task_id != null && tasksUnwraped.remove(task_id);
                },
                () => {},
              ),
            );
          });
        });

        eventsUnwrapped.on("removeWithFilter", ({ result }) => {
          result.map((event) => {
            eventsUnwrapped
              .find({ task_id: event.task_id })
              .then((findResult) =>
                findResult.mapOrElse(
                  () => {
                    event.task_id != null &&
                      tasksUnwraped.remove(event.task_id);
                  },
                  () => {},
                ),
              );
          });
        });

        eventsUnwrapped.on("removeAll", ({ result }) => {
          result.map(([, event]) => {
            eventsUnwrapped
              .find({ task_id: event.task_id })
              .then((findResult) =>
                findResult.mapOrElse(
                  () => {
                    event.task_id != null &&
                      tasksUnwraped.remove(event.task_id);
                  },
                  () => {},
                ),
              );
          });
        });

        eventsUnwrapped.on("remove", ({ result }) => {
          result.map(({ notifications }) => {
            notifications.forEach((notification) => {
              notificationManager.remove(notification.id);
            });
          });
        });

        eventsUnwrapped.on("removeWithFilter", ({ result: output }) => {
          const deletedEvents = output;
          if (deletedEvents) {
            deletedEvents.forEach((event) => {
              event.notifications.forEach((notification) => {
                notificationManager.remove(notification.id);
              });
            });
          }
        });

        eventsUnwrapped.on("removeAll", ({ result }) => {
          result.map(([, event]) => {
            event.notifications.forEach((notification) => {
              notificationManager.remove(notification.id);
            });
          });
        });

        calendarsUnwrapped.on("remove", ({ result }) => {
          result.map(({ id: deletedCalendar }) => {
            eventsUnwrapped.removeWithFilter(
              (event) => event.calendar_id === deletedCalendar,
            );
          });
        });

        calendarsUnwrapped.on("removeAll", ({ result }) => {
          result.map(([id]) =>
            eventsUnwrapped.removeWithFilter(
              ({ calendar_id }) => id === calendar_id,
            ),
          );
        });

        calendarsUnwrapped.on("removeWithFilter", ({ result }) => {
          result.map(({ id }) =>
            eventsUnwrapped.removeWithFilter(
              ({ calendar_id }) => id === calendar_id,
            ),
          );
        });

        calendarsUnwrapped.on("update", () => {
          // TODO: When using the timezones
        });

        for (const event of await eventsUnwrapped.all()) {
          event.notifications.forEach((notification) => {
            notificationManager.push(notification, event);
          });
        }

        setClientData(
          O.Some({
            tasksStorage: tasksUnwraped,
            eventsStorage: eventsUnwrapped,
            calendarsStorage: calendarsUnwrapped,
            eventsTemplateStorage: templatesUnwrapped,
          }),
        );

        setFunctionSetup(
          O.Some(async () => {
            calendarsUnwrapped.setupDefaults();
          }),
        );
      }
    })();
  }, [isDataReady]);

  const setupDefaultOnce = useCallback(
    () => setupDefaults.map((setup) => setup()),
    [setupDefaults.isSome()],
  );

  useEffect(() => {
    setupDefaultOnce();
  }, [setupDefaultOnce]);

  const memoized: StorageContext = useMemo(() => {
    return {
      storages: clientData,
      listeners: {
        eventsTemplateStorageListener: templatesUpdated,
        calendarsStorageListener: calendarsUpdated,
        eventsStorageListener: eventsUpdated,
        tasksStorageListener: tasksUpdated,
      },
    };
  }, [
    clientData,
    calendarsUpdated,
    eventsUpdated,
    templatesUpdated,
    tasksUpdated,
  ]);

  return memoized;
}

export { StorageContext };
