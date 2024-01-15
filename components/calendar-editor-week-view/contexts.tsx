import { CalendarEvent } from "@/services/events/events";
import { None, Option } from "@/utils/option";
import { UseStateReturn } from "@/utils/types";
import { RefObject, createContext } from "react";

export const CalendarModeContext = createContext<Option<"editor" | "normal">>(
  None(),
);

export const SelectedEvents = createContext<
  Option<UseStateReturn<Map<CalendarEvent["id"], CalendarEvent>>>
>(None());

export const SelectedRefs = createContext<
  Option<UseStateReturn<Map<CalendarEvent["id"], RefObject<HTMLDivElement>>>>
>(None());

export const ActionSelectedTypes = ["recurring", "spacing"] as const;

export const ActionSelected = createContext<
  UseStateReturn<Option<(typeof ActionSelectedTypes)[number]>>
>([None(), () => {}]);
