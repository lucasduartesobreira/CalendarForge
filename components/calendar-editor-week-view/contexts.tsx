import { CalendarEvent } from "@/services/events/events";
import { None, Option } from "@/utils/option";
import { Dispatch, SetStateAction, createContext } from "react";

export const CalendarModeContext = createContext<Option<"editor" | "normal">>(
  None(),
);

export const SelectedEvents = createContext<
  Option<
    [
      Map<CalendarEvent["id"], CalendarEvent>,
      Dispatch<SetStateAction<Map<CalendarEvent["id"], CalendarEvent>>>,
    ]
  >
>(None());
