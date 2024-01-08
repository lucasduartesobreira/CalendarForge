import { Shortcut } from "@/utils/shortcuts";
import { useEffect } from "react";

export const useShortcut = (shortcut: Shortcut) => {
  useEffect(() => {
    const { handler } = shortcut;
    addEventListener("keypress", handler);

    return () => removeEventListener("keypress", handler);
  }, [shortcut]);
};
