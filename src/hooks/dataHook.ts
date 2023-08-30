/* eslint-disable react-hooks/exhaustive-deps */
import { CalendarEvent, EventStorage } from "@/services/events/events";
import { useMap } from "@/hooks/mapHook";
import { createContext, useEffect, useMemo, useState } from "react";
import { None, Some, Option } from "@/utils/option";
import { Calendar, CalendarStorage } from "@/services/calendar/calendar";

type Storages = {
  eventsStorage: EventStorage;
  calendarsStorage: CalendarStorage;
};

const StorageContext = createContext<Option<Storages>>(None());

export function useDataStorage(): Option<Storages> {
  const eventsHook = useMap<string, CalendarEvent>("eventsMap");
  const calendarsHook = useMap<string, Calendar>("calendars");
  const [clientData, setClientData] = useState<Option<Storages>>(None());

  const hasWindow = typeof window !== "undefined";

  useEffect(() => {
    if (eventsHook.isSome() && calendarsHook.isSome()) {
      const [eventsMap, eventsActions] = eventsHook.unwrap();
      const eventsStorage = new EventStorage(eventsMap, eventsActions);

      const [calendarsMap, calendarsActions] = calendarsHook.unwrap();
      const calendarsStorage = new CalendarStorage(
        calendarsMap,
        calendarsActions,
      );
      setClientData(Some({ eventsStorage, calendarsStorage }));
    }
  }, [hasWindow, eventsHook, calendarsHook]);

  const memoized = useMemo(() => {
    return clientData;
  }, [clientData]);

  return memoized;
}

export { StorageContext };
