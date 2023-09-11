/* eslint-disable react-hooks/exhaustive-deps */
import { EventStorage } from "@/services/events/events";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { None, Some, Option } from "@/utils/option";
import { CalendarStorage } from "@/services/calendar/calendar";
import { NotificationManager } from "@/services/notifications/notificationPermission";
import { EventTemplateStorage } from "@/services/events/eventTemplates";

type Storages = {
  eventsStorage: EventStorage;
  calendarsStorage: CalendarStorage;
  eventsTemplateStorage: EventTemplateStorage;
};

type StorageContext = {
  storages: Option<Storages>;
  listeners: StorageListeners;
};

type StorageListeners = {
  [Key in keyof Storages as `${Key}Listener`]: StateUpdate;
};

const StorageContext = createContext<StorageContext>({
  storages: None(),
  listeners: {
    eventsStorageListener: undefined,
    calendarsStorageListener: undefined,
    eventsTemplateStorageListener: undefined,
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

  const [clientData, setClientData] = useState<Option<Storages>>(None());

  const eventsStorage = EventStorage.new(forceEventsUpdate);
  const calendarStorage = CalendarStorage.new(forceCalendarUpdate);
  const templateStorage = EventTemplateStorage.new(forceTemplatesUpdate);

  const isDataReady =
    eventsStorage.isOk() && calendarStorage.isOk() && templateStorage.isOk();

  useEffect(() => {
    if (
      eventsStorage.isOk() &&
      calendarStorage.isOk() &&
      templateStorage.isOk()
    ) {
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
        const [deletedEvents] = output;
        if (deletedEvents.isOk()) {
          deletedEvents.unwrap().forEach((event) => {
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
        Some({
          eventsStorage: eventsStorageSome,
          calendarsStorage: calendarStorage.unwrap(),
          eventsTemplateStorage: templateStorage.unwrap(),
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
      },
    };
  }, [clientData, calendarsUpdated, eventsUpdated, templatesUpdated]);

  return memoized;
}

export { StorageContext };
