/* eslint-disable react-hooks/exhaustive-deps */
import { EventStorage } from "@/services/events/events";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as O from "@/utils/option";
import { CalendarStorage } from "@/services/calendar/calendar";
import { NotificationManager } from "@/services/notifications/notificationPermission";
import { EventTemplateStorage } from "@/services/events/eventTemplates";
import { Project, ProjectStorage } from "@/services/projects/projectsStorage";
import { BoardStorage } from "@/services/boards/boards";

type Storages = {
  eventsStorage: EventStorage;
  calendarsStorage: CalendarStorage;
  eventsTemplateStorage: EventTemplateStorage;
  projectsStorage: ProjectStorage;
  boardsStorage: BoardStorage;
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
    projectsStorageListener: undefined,
    boardsStorageListener: undefined,
  },
});
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
  const [projectsUpdated, forceProjectsUpdate] = useForceUpdate();
  const [boardsUpdated, forceBoardsUpdate] = useForceUpdate();

  const [clientData, setClientData] = useState<O.Option<Storages>>(O.None());

  const eventsStorage = EventStorage.new(forceEventsUpdate);
  const calendarStorage = CalendarStorage.new(forceCalendarUpdate);
  const templateStorage = EventTemplateStorage.new(forceTemplatesUpdate);
  const projectsStorage = ProjectStorage.new(forceProjectsUpdate);
  const boardsStorage = BoardStorage.new(forceBoardsUpdate);
  const tasksStorage = TaskStorage.new(forceTasksUpdate);

  const isDataReady =
    eventsStorage.isOk() &&
    calendarStorage.isOk() &&
    templateStorage.isOk() &&
    projectsStorage.isOk() &&
    boardsStorage.isOk() &&
    tasksStorage.isOk();

  useEffect(() => {
    if (isDataReady) {
      const notificationManager = new NotificationManager();
      const eventsStorageSome = eventsStorage.unwrap();
      const calendarStorageUnwraped = calendarStorage.unwrap();
      const projectsStorageUnwraped = projectsStorage.unwrap();
      const boardsStorageUnwrapped = boardsStorage.unwrap();
      const tasksStorageUnwrapped = tasksStorage.unwrap();

      eventsStorageSome.on("add", ({ result: output }) => {
        if (output.isOk()) {
          const eventCreated = output.unwrap();
          eventCreated.notifications.forEach((notification) => {
            notificationManager.push(notification, eventCreated);
          });
        }
      });

      eventsStorageSome.on(
        "update",
        ({ args: input, result: output, opsSpecific: found }) => {
          const [_id, eventPreUpdate] = input;
          if (output.isOk() && found.isSome() && eventPreUpdate.notifications) {
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

      eventsStorageSome.on("removeWithFilter", ({ result: output }) => {
        const deletedEvents = output;
        if (deletedEvents) {
          deletedEvents.forEach((event) => {
            event.notifications.forEach((notification) => {
              notificationManager.remove(notification.id);
            });
          });
        }
      });

      calendarStorageUnwraped.on("remove", ({ result }) => {
        result.map(({ id: deletedCalendar }) => {
          eventsStorageSome.removeWithFilter(
            (event) => event.calendar_id === deletedCalendar,
          );
        });
      });

      calendarStorageUnwraped.on("removeAll", ({ result }) => {
        result.map(([id]) =>
          eventsStorageSome.removeWithFilter(
            ({ calendar_id }) => id === calendar_id,
          ),
        );
      });

      calendarStorageUnwraped.on("removeWithFilter", ({ result }) => {
        result.map(({ id }) =>
          eventsStorageSome.removeWithFilter(
            ({ calendar_id }) => id === calendar_id,
          ),
        );
      });

      calendarStorageUnwraped.on("update", () => {
        // TODO: When using the timezones
      });

      projectsStorageUnwraped.on("update", ({ result, opsSpecific: found }) => {
        result.map((project) => {
          const foundProject: Project = found;
          const removed = foundProject.calendars.filter(
            (calendar, index) => !project.calendars.includes(calendar, index),
          );

          if (removed.length > 0) {
            calendarStorageUnwraped.removeAll(removed);
          }
        });
        result;
      });

      projectsStorageUnwraped.on("remove", ({ result }) => {
        result.map(({ calendars }) =>
          calendarStorageUnwraped.removeAll(calendars),
        );
      });
      projectsStorageUnwraped.on("removeAll", ({ result }) => {
        result.map(([, { calendars }]) =>
          calendarStorageUnwraped.removeAll(calendars),
        );
      });

      projectsStorageUnwraped.on("removeWithFilter", ({ result }) => {
        result.map(({ calendars }) => {
          calendarStorageUnwraped.removeAll(calendars);
        });
      });

      for (const event of eventsStorageSome.values()) {
        event.notifications.forEach((notification) => {
          notificationManager.push(notification, event);
        });
      }

      setClientData(
        O.Some({
          eventsStorage: eventsStorageSome,
          calendarsStorage: calendarStorageUnwraped,
          eventsTemplateStorage: templateStorage.unwrap(),
          projectsStorage: projectsStorageUnwraped,
          boardsStorage: boardsStorageUnwrapped,
          tasksStorage: tasksStorageUnwrapped,
        }),
      );
    }
  }, [isDataReady]);

  const memoized: StorageContext = useMemo(() => {
    return {
      storages: clientData,
      listeners: {
        eventsTemplateStorageListener: templatesUpdated,
        calendarsStorageListener: calendarsUpdated,
        eventsStorageListener: eventsUpdated,
        projectsStorageListener: projectsUpdated,
        boardsStorageListener: boardsUpdated,
        tasksStorageListener: tasksUpdated,
      },
    };
  }, [
    clientData,
    calendarsUpdated,
    eventsUpdated,
    templatesUpdated,
    projectsUpdated,
    boardsUpdated,
    tasksUpdated,
  ]);

  return memoized;
}

export { StorageContext };
