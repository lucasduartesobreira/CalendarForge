/* eslint-disable react-hooks/exhaustive-deps */
import { CalendarEvent, EventStorage } from "@/services/events/events";
import { useMap } from "@/hooks/mapHook";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { None, Some, Option } from "@/utils/option";
import { Calendar, CalendarStorage } from "@/services/calendar/calendar";
import { NotificationManager } from "@/services/notifications/notificationPermission";
import { EventTemplateStorage } from "@/services/events/eventTemplates";

type Storages = {
  eventsStorage: EventStorage;
  calendarsStorage: CalendarStorage;
  eventsTemplateStorage: EventTemplateStorage;
};

const StorageContext = createContext<Option<Storages>>(None());

export function useDataStorage(): Option<Storages> {
  const eventsHook = useMap<string, CalendarEvent>("eventsMap", new Map());

  const [, updateState] = useState<{}>();
  const forceUpdate = useCallback(() => updateState({}), []);

  const [templateStorage, setTemplateStorage] = useState<
    Option<EventTemplateStorage>
  >(None());

  const [calendarStorage, setCalendarStorage] = useState<
    Option<CalendarStorage>
  >(None());

  useEffect(() => {
    const newTemplateStorage = EventTemplateStorage.new(forceUpdate);
    if (newTemplateStorage.isOk()) {
      setTemplateStorage(Some(newTemplateStorage.unwrap()));
    }

    const newCalendarStorage = CalendarStorage.new(forceUpdate);
    if (newCalendarStorage.isOk()) {
      setCalendarStorage(Some(newCalendarStorage.unwrap()));
    }
  }, [forceUpdate]);

  const [clientData, setClientData] = useState<Option<Storages>>(None());

  const hasWindow = typeof window !== "undefined";
  const update =
    eventsHook.isSome() && calendarStorage.isSome() && templateStorage.isSome();

  useEffect(() => {
    if (
      eventsHook.isSome() &&
      calendarStorage.isSome() &&
      templateStorage.isSome()
    ) {
      const notificationManager = new NotificationManager();
      const [eventsMap, eventsActions] = eventsHook.unwrap();
      const eventsStorage = new EventStorage(eventsMap, eventsActions);
      eventsStorage.subscribe("add", ({ output }) => {
        if (output.isOk()) {
          const eventCreated = output.unwrap();
          eventCreated.notifications.forEach((notification) => {
            notificationManager.push(notification, eventCreated);
          });
        }
      });

      eventsStorage.subscribe("update", ({ input, output, found }) => {
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

      eventsStorage.subscribe("removeAll", ({ output }) => {
        const [deletedEvents] = output;
        if (deletedEvents.isOk()) {
          deletedEvents.unwrap().forEach((event) => {
            event.notifications.forEach((notification) => {
              notificationManager.remove(notification.id);
            });
          });
        }
      });

      for (const event of eventsMap.values()) {
        event.notifications.forEach((notification) => {
          notificationManager.push(notification, event);
        });
      }

      setClientData(
        Some({
          eventsStorage,
          calendarsStorage: calendarStorage.unwrap(),
          eventsTemplateStorage: templateStorage.unwrap(),
        }),
      );
    }
  }, [update]);

  useEffect(() => {
    if (clientData.isSome() && eventsHook.isSome()) {
      const { eventsStorage } = clientData.unwrap();
      eventsStorage.sync(eventsHook.unwrap()[0]);
      setClientData(Some({ ...clientData.unwrap() }));
    }
  }, [hasWindow, eventsHook]);

  const memoized = useMemo(() => {
    return clientData;
  }, [clientData]);

  return memoized;
}

export { StorageContext };
