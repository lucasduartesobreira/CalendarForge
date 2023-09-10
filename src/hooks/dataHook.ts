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
  listeners: StateUpdate;
};

const StorageContext = createContext<StorageContext>({
  storages: None(),
  listeners: undefined,
});
type StateUpdate = {} | undefined;

export function useDataStorage(): StorageContext {
  const [stateUpdated, updateState] = useState<{}>();
  const forceUpdate = useCallback(() => updateState({}), []);

  const [templateStorage, setTemplateStorage] = useState<
    Option<EventTemplateStorage>
  >(None());

  const [calendarStorage, setCalendarStorage] = useState<
    Option<CalendarStorage>
  >(None());
  const [eventsStorage, setEventsStorage] = useState<Option<EventStorage>>(
    None(),
  );

  useEffect(() => {
    const newTemplateStorage = EventTemplateStorage.new(forceUpdate);
    if (newTemplateStorage.isOk()) {
      setTemplateStorage(Some(newTemplateStorage.unwrap()));
    }

    const newCalendarStorage = CalendarStorage.new(forceUpdate);
    if (newCalendarStorage.isOk()) {
      setCalendarStorage(Some(newCalendarStorage.unwrap()));
    }

    const newEventsStorage = EventStorage.new(forceUpdate);
    if (newEventsStorage.isOk()) {
      setEventsStorage(Some(newEventsStorage.unwrap()));
    }
  }, [forceUpdate]);

  const [clientData, setClientData] = useState<Option<Storages>>(None());

  const update =
    eventsStorage.isSome() &&
    calendarStorage.isSome() &&
    templateStorage.isSome();

  useEffect(() => {
    if (
      eventsStorage.isSome() &&
      calendarStorage.isSome() &&
      templateStorage.isSome()
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
  }, [update]);

  const memoized: StorageContext = useMemo(() => {
    return {
      storages: clientData,
      listeners: stateUpdated,
    };
  }, [clientData, stateUpdated]);

  return memoized;
}

export { StorageContext };
