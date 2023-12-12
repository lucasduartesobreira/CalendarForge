"use client";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { useContext, useEffect, useMemo, useState } from "react";
import UpdateEventForm from "@/components/event-update-form/updateEvent";
import { Actions } from "@/hooks/mapHook";
import { FlexibleView, ViewSize } from "../shared/flexible-view/flexibleView";

const CALENDAR_WEEK_CONTAINER_ID = "calendar-week-container";

const CalendarWeek = ({
  style,
  startDate,
  viewableCalendarsState,
}: {
  style: string;
  startDate: Date;
  viewableCalendarsState: O.Option<
    [
      Omit<Map<string, boolean>, "set" | "clear" | "delete">,
      Actions<string, boolean>,
    ]
  >;
}) => {
  const { storages: storages, listeners } = useContext(StorageContext);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<O.Option<CalendarEvent>>(
    O.None(),
  );
  useEffect(() => {
    if (storages.isSome() && viewableCalendarsState.isSome()) {
      const { eventsStorage } = storages.unwrap();
      const lastDayOfTheWeek = new Date(
        startDate.getTime() + 6 * 24 * 60 * 60 * 1000,
      );
      lastDayOfTheWeek.setHours(23, 59, 59, 999);
      eventsStorage
        .filteredValues(
          (event) =>
            (viewableCalendarsState.unwrap()[0].get(event.calendar_id) ??
              true) &&
            event.startDate >= startDate.getTime() &&
            event.endDate >= startDate.getTime() &&
            event.startDate <= lastDayOfTheWeek.getTime() &&
            event.endDate <= lastDayOfTheWeek.getTime(),
        )
        .then((filteredValue) => {
          setEvents(filteredValue);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    storages,
    listeners.eventsStorageListener,
    startDate,
    viewableCalendarsState,
  ]);

  const weekEventsByDay = useMemo(() => {
    const initial: CalendarEvent[][] = [[], [], [], [], [], [], []];
    return events.reduce((acc, event) => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      if (startDate.getDay() != endDate.getDay()) {
        acc.at(startDate.getDay())?.push(event);
        acc.at(endDate.getDay())?.push(event);
        return acc;
      }

      acc.at(startDate.getDay())?.push(event);
      return acc;
    }, initial);
  }, [events]);

  const memoedRange = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((value) => {
        const date = new Date(startDate.getTime() + value * 24 * 3600 * 1000);
        const dateNow = new Date(Date.now());
        dateNow.setHours(0, 0, 0, 0);
        return {
          dayOfWeek: (date.getDay() + 1) as ViewSize,
          day: date.getDate(),
          isToday: date.getTime() === dateNow.getTime(),
          dateAtMidNight: date,
        };
      }),
    [startDate],
  );

  return (
    <>
      <FlexibleView
        selectEvent={setSelectedEvent}
        style={style}
        days={memoedRange.map(({ dayOfWeek, ...rest }) => ({
          ...rest,
          dayOfWeek,
          events: weekEventsByDay
            ? weekEventsByDay.at(dayOfWeek - 1) ?? []
            : [],
        }))}
        id={CALENDAR_WEEK_CONTAINER_ID}
      />
      {selectedEvent.mapOrElse(
        () => null,
        (selectedEvent) => (
          <UpdateEventForm
            setOpen={() => setSelectedEvent(O.None())}
            initialForm={selectedEvent}
          />
        ),
      )}
    </>
  );
};

export default CalendarWeek;
