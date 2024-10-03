import { CalendarEvent, CreateEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { useEffect, useReducer, useState } from "react";
import {
  DAY_HEADER_HEIGHT,
  HOUR_BLOCK_HEIGHT,
  HOUR_DIVISION,
  computeMousePosition,
  startAndHeight,
} from "../day-view/dayEventsContent";
import { useResetSelection } from "@/components/calendar-editor-week-view/hooks";
import { useFormHandler } from "@/components/form-handler/formHandler";

export const useSelectHours = () => {
  const { setActiveForm: setForm } = useFormHandler();

  const [createNewEventData, setCreatingNewEvent] = useState<
    O.Option<
      Pick<CreateEvent, "startDate" | "endDate"> & {
        day: number;
        title?: string;
        color?: CalendarEvent["color"];
      }
    >
  >(O.None());

  type EventListenerFN<K extends keyof WindowEventMap> = Parameters<
    typeof window.addEventListener<K>
  >[1];

  type Events =
    | { type: "mousedown"; startDate: number; endDate: number; day: number }
    | { type: "mousemove"; clientY: number }
    | { type: "mouseup" }
    | { type: "finish" };
  type States = {
    state: "notSelecting" | "selecting" | "pushing";
    startDate?: number;
    endDate?: number;
    day?: number;
  };

  const [selectingState, dispatch] = useReducer(
    (actualState: States, event: Events) => {
      const { state, startDate, endDate, day } = actualState;
      const { type: eventType } = event;
      if (eventType === "mousedown") {
        if (state === "notSelecting") {
          const { startDate, endDate, day: dayEvent } = event;
          return {
            state: "selecting",
            startDate,
            endDate,
            day: dayEvent,
          } as const;
        }

        if (state === "pushing") {
          return { state, startDate, endDate, day };
        }
        return { state: "notSelecting" } as const;
      }
      if (eventType === "mouseup") {
        if (state === "selecting") {
          return { state: "pushing", startDate, endDate, day } as const;
        }
        return actualState;
      }
      if (eventType === "mousemove") {
        if (state === "selecting" && startDate && endDate && day) {
          const { clientY } = event;
          return {
            state,
            startDate,
            endDate: someCalculation(startDate, endDate, day, clientY),
            day,
          } as const;
        }
        return actualState;
      }
      if (eventType === "finish") {
        return {
          state: "notSelecting",
        } as const;
      }

      return actualState;
    },
    { state: "notSelecting" },
  );

  useEffect(() => {
    const { state, startDate, endDate } = selectingState;
    if (state === "pushing") {
      if (startDate != null && endDate != null) {
        setForm(
          "createEvent",
          {
            startDate: selectingState.startDate,
            endDate: selectingState.endDate,
          },
          O.None(),
          (form) => {
            setCreatingNewEvent((oldDates) =>
              oldDates.map(({ day }) => ({
                startDate: form.startDate,
                endDate: form.endDate,
                title: form.title,
                color: form.color,
                day,
              })),
            );
          },
          () => {
            dispatch({ type: "finish" });
            setCreatingNewEvent(O.None());
          },
        );
        window.removeEventListener("mouseup", mouseUp);
        window.removeEventListener("mousemove", mouseMove);
      }
    } else if (state === "selecting") {
      const { startDate, endDate, day } = selectingState;
      if (startDate != null && endDate != null && day != null)
        setCreatingNewEvent((oldDates) =>
          oldDates.mapOrElse(
            () => O.Some({ startDate, endDate, day }),
            (oldData) => O.Some({ ...oldData, startDate, endDate }),
          ),
        );
    }
  }, [
    setCreatingNewEvent,
    selectingState.endDate,
    selectingState.startDate,
    selectingState.state,
    selectingState,
  ]);

  const mouseUp: EventListenerFN<"mouseup"> = () => {
    dispatch({ type: "mouseup" });
  };

  const mouseMove: EventListenerFN<"mousemove"> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch({ type: "mousemove", clientY: e.clientY });
  };

  const resetSelection = useResetSelection();
  const onMouseDown = (
    hour: number,
    quarter: number,
    day: number,
    dayInMilliseconds: number,
  ) => {
    resetSelection();

    const start =
      dayInMilliseconds + hour * 60 * 60 * 1000 + quarter * 15 * 60 * 1000;

    const end = start + 3600 * 1000;

    dispatch({ type: "mousedown", startDate: start, endDate: end, day });
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
  };

  return {
    onMouseDownFactory: onMouseDown,
    createNewEventData,
  };
};

const someCalculation = (
  start: number,
  end: number,
  day: number,
  clientY: number,
) => {
  const container = document.getElementById("calendar-week-container");
  if (container == null) return;

  const relativePositionToHour = (
    position: number,
    withDayHeader: boolean = true,
  ) => {
    const hoursAndMinutes =
      (position - (withDayHeader ? DAY_HEADER_HEIGHT : 0)) / HOUR_BLOCK_HEIGHT;
    const hours = Math.floor(hoursAndMinutes);
    const minutes = Math.ceil(
      ((hoursAndMinutes - hours) * 60) / (60 / HOUR_DIVISION),
    );

    return [hours, minutes];
  };

  const { top } = startAndHeight(new Date(start), new Date(end), day);
  const pointerPosition = computeMousePosition(clientY, container, 0);

  const minBottom = Math.max(
    top + HOUR_BLOCK_HEIGHT / HOUR_DIVISION,
    pointerPosition,
  );
  const [hours, minutes] = relativePositionToHour(minBottom);

  const newEnd = new Date(end).setHours(hours, minutes * 15, 0, 0);

  return newEnd;
};
