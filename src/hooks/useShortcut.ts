import { CalendarModeContext } from "@/components/calendar-editor-week-view/contexts";
import { Shortcut } from "@/utils/shortcuts";
import { useContext, useEffect } from "react";

export const useShortcut = (
  shortcut: Shortcut,
  mode: "editor" | "normal" | "all",
) => {
  const [calendarMode] = useContext(CalendarModeContext);
  useEffect(() => {
    return calendarMode
      .map((calendarMode) => {
        if (mode === "all" || calendarMode === mode) {
          const { handler } = shortcut;
          addEventListener("keyup", handler, { passive: true });

          return () => removeEventListener("keyup", handler);
        }

        return () => {};
      })
      .unwrapOrElse(() => () => {});
  }, [shortcut, calendarMode, mode]);
};
