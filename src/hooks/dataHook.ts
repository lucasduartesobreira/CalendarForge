/* eslint-disable react-hooks/exhaustive-deps */
import { CalendarEvent, EventStorage } from "@/services/events/events";
import { useMap } from "@/hooks/mapHook";
import { createContext, useEffect, useMemo, useState } from "react";
import { None, Some, Option } from "@/utils/option";
import { Calendar, CalendarStorage } from "@/services/calendar/calendar";
import { NotificationManager } from "@/services/notifications/notificationPermission";

type Storages = {
  eventsStorage: EventStorage;
  calendarsStorage: CalendarStorage;
};

const StorageContext = createContext<Option<Storages>>(None());

export function useDataStorage(): Option<Storages> {
  const notificationManager = new NotificationManager();
  const eventsHook = useMap<string, CalendarEvent>("eventsMap", new Map());

  const calendarsHook = useMap<string, Calendar>("calendars");
  const [clientData, setClientData] = useState<Option<Storages>>(None());

  const hasWindow = typeof window !== "undefined";
  const update = eventsHook.isSome() && calendarsHook.isSome();

  useEffect(() => {
    if (eventsHook.isSome() && calendarsHook.isSome()) {
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

      const [calendarsMap, calendarsActions] = calendarsHook.unwrap();
      const calendarsStorage = new CalendarStorage(
        calendarsMap,
        calendarsActions,
      );
      setClientData(Some({ eventsStorage, calendarsStorage }));
    }
  }, [update]);

  useEffect(() => {
    if (clientData.isSome() && eventsHook.isSome() && calendarsHook.isSome()) {
      const { eventsStorage, calendarsStorage } = clientData.unwrap();
      eventsStorage.sync(eventsHook.unwrap()[0]);
      calendarsStorage.sync(calendarsHook.unwrap()[0]);
      setClientData(Some({ ...clientData.unwrap() }));
    }
  }, [hasWindow, eventsHook, calendarsHook]);

  const memoized = useMemo(() => {
    return clientData;
  }, [clientData]);

  return memoized;
}

export { StorageContext };
