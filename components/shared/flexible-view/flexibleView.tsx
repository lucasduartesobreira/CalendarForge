import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { useEffect, useState } from "react";
import { DayBackground, HoursBackground } from "./dayBackground";
import { DayContainer } from "./dayContainer";
import { DayEvents } from "./dayEventsContent";

export const AcceptedDaysValue = [1, 2, 3, 4, 5, 6, 7] as const;
export type ViewSize = (typeof AcceptedDaysValue)[number];

const weekGridClasses = [
  "grid-cols-[50px_repeat(1,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(2,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(3,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(4,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(5,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(6,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(7,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(8,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(9,minmax(128px,1fr))]",
] as const;

export const FlexibleView = ({
  days,
  selectEvent: setSelectedEvent,
  style,
  id,
}: {
  style: string;
  days: {
    events: CalendarEvent[];
    dayOfWeek: ViewSize;
    day: number;
    isToday: boolean;
  }[];
  selectEvent: (value: O.Option<CalendarEvent>) => void;
  id: string;
}) => {
  useEffect(() => {
    const calendarWeekContainer = document.getElementById(id);
    if (calendarWeekContainer) {
      calendarWeekContainer.scrollTop = 512;
    }
  }, [id]);

  const [clientSide, setClientSide] = useState(false);

  useEffect(() => {
    setClientSide(true);
    return () => setClientSide(false);
  }, []);

  return (
    <div
      className={`${style} grid ${
        weekGridClasses[days.length - 1]
      } grid-row-1 overflow-scroll`}
      id={id}
    >
      <HoursBackground />
      {days.map(({ dayOfWeek, day, isToday, events }, index) => (
        <DayContainer column={index} key={`${index}${dayOfWeek}${day}`}>
          <DayBackground
            key={index}
            dayOfWeek={dayOfWeek}
            day={day}
            isToday={isToday}
          />
          {clientSide && (
            <DayEvents
              day={day}
              setSelectedEvent={setSelectedEvent}
              events={events}
            ></DayEvents>
          )}
        </DayContainer>
      ))}
    </div>
  );
};
