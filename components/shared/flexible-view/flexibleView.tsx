import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import {
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DayViewContent } from "../day-view/dayContent";
import { DayDropZone } from "../day-view/dayBackground";
import { DraggedEvent } from "../day-view/dayEventsContent";
import { CreateEventFormOpenCtx } from "@/components/event-create-form/createEvent";

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
  "grid-cols-[auto_50px_repeat(7,minmax(128px,1fr))]",
] as const;

export const FlexibleView = ({
  days,
  selectEvent: setSelectedEvent,
  style,
  id,
  children,
}: PropsWithChildren<{
  style: string;
  days: {
    events: CalendarEvent[];
    dayOfWeek: ViewSize;
    day: number;
    dayInMilliseconds: number;
    isToday: boolean;
    dateAtMidNight: Date;
    fakeEvents?: CalendarEvent[];
  }[];
  selectEvent: (value: O.Option<CalendarEvent>) => void;
  id: string;
}> & { children?: ReactNode | ReactNode[] }) => {
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

  if (!weekGridClasses.at(days.length - 1)) {
    days.splice(weekGridClasses.length, days.length - weekGridClasses.length);
  }

  const hasChildren = children != null ? 1 : 0;

  const weekGridClass = weekGridClasses.at(days.length + hasChildren - 1);
  const [dragged] = useContext(DraggedEvent);

  const [, setCreateEventFormOpen] = useContext(CreateEventFormOpenCtx);
  return (
    <div
      className={`${style} grid ${weekGridClass} grid-row-1 overflow-scroll relative`}
      id={id}
    >
      {children}
      <DayViewContent.HoursBackground column={0 + hasChildren} />
      {days.map(
        (
          {
            dayOfWeek,
            day,
            dayInMilliseconds,
            isToday,
            events,
            dateAtMidNight,
            fakeEvents,
          },
          index,
        ) => (
          <DayViewContent.DayContainer
            column={index + hasChildren}
            key={`${index}${dayOfWeek}${day}`}
          >
            <DayViewContent.DayBackground
              key={`${index + hasChildren}-background`}
              dayOfWeek={dayOfWeek}
              day={day}
              isToday={isToday}
              onMouseDown={(hour, quarter) => {
                const start =
                  dayInMilliseconds +
                  hour * 60 * 60 * 1000 +
                  quarter * 15 * 60 * 1000;

                const end = start + 3600 * 1000;
                setCreateEventFormOpen(
                  O.Some({ startDate: start, endDate: end }),
                );
              }}
            />
            {clientSide && (
              <DayViewContent.DayEvents
                day={day}
                setSelectedEvent={setSelectedEvent}
                events={events}
              />
            )}
            {fakeEvents != null && (
              <DayViewContent.FakeEvents day={day} events={fakeEvents} />
            )}
            {dragged.isSome() && (
              <DayDropZone
                date={dateAtMidNight}
                day={day}
                dayOfWeek={dayOfWeek}
              />
            )}
          </DayViewContent.DayContainer>
        ),
      )}
    </div>
  );
};
