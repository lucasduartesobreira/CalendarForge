import { None, Option } from "@/utils/option";
import { createContext } from "react";

export const CalendarModeContext = createContext<Option<"editor" | "normal">>(
  None(),
);
