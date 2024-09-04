import { CreateEventFormOpenCtx } from "@/components/event-create-form/createEvent";
import { CreateEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { useContext, useEffect, useState } from "react";
import {
  DAY_HEADER_HEIGHT,
  HOUR_BLOCK_HEIGHT,
  HOUR_DIVISION,
  computeMousePosition,
  startAndHeight,
} from "../day-view/dayEventsContent";

export const useSelectHours = () => {
  const [creatingEventForm, setCreateEventFormOpen] = useContext(
    CreateEventFormOpenCtx,
  );

  const [createNewEventData, setCreatingNewEvent] = useState<
    O.Option<Pick<CreateEvent, "startDate" | "endDate"> & { day: number }>
  >(O.None());
  const [push, setPush] = useState(false);

  useEffect(() => {
    if (push) {
      setCreateEventFormOpen(createNewEventData);
      setPush(false);
    }
  }, [push]);

  useEffect(() => {
    setCreatingNewEvent(
      creatingEventForm.map((form) => ({
        startDate: form.startDate ?? -1,
        endDate: form.endDate ?? -1,
        day: new Date(form.startDate ?? -1).getTime(),
      })),
    );
  }, [creatingEventForm]);

  type EventListenerFN<K extends keyof WindowEventMap> = Parameters<
    typeof window.addEventListener<K>
  >[1];
  const mouseDownFactory =
    (dayInMilliseconds: number, day: number) =>
    (hour: number, quarter: number) => {
      if (creatingEventForm.isSome()) return;

      const start =
        dayInMilliseconds + hour * 60 * 60 * 1000 + quarter * 15 * 60 * 1000;

      const end = start + 3600 * 1000;
      setCreatingNewEvent(O.Some({ startDate: start, endDate: end, day: day }));

      const mouseMove: EventListenerFN<"mousemove"> = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const container = document.getElementById("calendar-week-container");
        if (container == null) return;

        const relativePositionToHour = (
          position: number,
          withDayHeader: boolean = true,
        ) => {
          const hoursAndMinutes =
            (position - (withDayHeader ? DAY_HEADER_HEIGHT : 0)) /
            HOUR_BLOCK_HEIGHT;
          const hours = Math.floor(hoursAndMinutes);
          const minutes = Math.ceil(
            ((hoursAndMinutes - hours) * 60) / (60 / HOUR_DIVISION),
          );

          return [hours, minutes];
        };

        const { top } = startAndHeight(new Date(start), new Date(end), day);
        const pointerPosition = computeMousePosition(e.clientY, container, 0);

        const minBottom = Math.max(
          top + HOUR_BLOCK_HEIGHT / HOUR_DIVISION,
          pointerPosition,
        );
        const [hours, minutes] = relativePositionToHour(minBottom);

        const newEnd = new Date(end).setHours(hours, minutes * 15, 0, 0);

        setCreatingNewEvent((eventData) =>
          eventData.mapOrElse(
            () => O.Some({ startDate: start, endDate: newEnd, day }),
            ({ startDate, day }) =>
              O.Some({
                startDate: startDate,
                endDate: newEnd,
                day,
              }),
          ),
        );
      };
      const mouseUp: EventListenerFN<"mouseup"> = () => {
        window.removeEventListener("mousemove", mouseMove);
        window.removeEventListener("mouseup", mouseUp);

        setPush(true);
      };

      window.addEventListener("mousemove", mouseMove);
      window.addEventListener("mouseup", mouseUp);
    };

  return { onMouseDownFactory: mouseDownFactory, createNewEventData };
};
