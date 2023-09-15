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
import { ProjectStorage } from "@/services/projects/projectsStorage";

type Storages = {
  eventsStorage: EventStorage;
  calendarsStorage: CalendarStorage;
  eventsTemplateStorage: EventTemplateStorage;
  projectsStorage: ProjectStorage;
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

  const [clientData, setClientData] = useState<O.Option<Storages>>(O.None());

  const eventsStorage = EventStorage.new(forceEventsUpdate);
  const calendarStorage = CalendarStorage.new(forceCalendarUpdate);
  const templateStorage = EventTemplateStorage.new(forceTemplatesUpdate);
  const projectsStorage = ProjectStorage.new(forceProjectsUpdate);

  const isDataReady =
    eventsStorage.isOk() &&
    calendarStorage.isOk() &&
    templateStorage.isOk() &&
    projectsStorage.isOk();

  useEffect(() => {
    if (isDataReady) {
      const notificationManager = new NotificationManager();
      const eventsStorageSome = eventsStorage.unwrap();
      eventsStorageSome.subscribe("add", ({ output }) => {
        if (output.isOk()) {
          const eventCreated = output.unwrap();
          eventCreated.notifications.forEach((notification) => {
            notificationManager.push(notification, eventCreated);
          });
        }
      });

      eventsStorageSome.subscribe("update", ({ input, output, found }) => {
        const [_id, eventPreUpdate] = input;
        if (output.isOk() && found.isSome() && eventPreUpdate.notifications) {
          const updatedEvent = output.unwrap();
          const foundEvent = found.unwrap();
          foundEvent.notifications.forEach(({ id: idNotification }) => {
            notificationManager.remove(idNotification);
          });

          updatedEvent.notifications.forEach((notification) => {
            notificationManager.push(notification, updatedEvent);
          });
        }
      });

      eventsStorageSome.subscribe("removeAll", ({ output }) => {
        const deletedEvents = output;
        if (deletedEvents) {
          deletedEvents.forEach((event) => {
            event.notifications.forEach((notification) => {
              notificationManager.remove(notification.id);
            });
          });
        }
      });

      for (const event of eventsStorageSome.values()) {
        event.notifications.forEach((notification) => {
          notificationManager.push(notification, event);
        });
      }

      setClientData(
        O.Some({
          eventsStorage: eventsStorageSome,
          calendarsStorage: calendarStorage.unwrap(),
          eventsTemplateStorage: templateStorage.unwrap(),
          projectsStorage: projectsStorage.unwrap(),
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
      },
    };
  }, [
    clientData,
    calendarsUpdated,
    eventsUpdated,
    templatesUpdated,
    projectsUpdated,
  ]);

  return memoized;
}

export { StorageContext };
