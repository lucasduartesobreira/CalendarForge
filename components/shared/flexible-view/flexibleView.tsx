import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { PropsWithChildren, useContext, useEffect, useState } from "react";
import { DayViewContent } from "../day-view/dayContent";
import { DayDropZone } from "../day-view/dayBackground";
import { DraggedEvent } from "../day-view/dayEventsContent";
import { SelectedRefs } from "@/components/calendar-editor-week-view/contexts";

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
    isToday: boolean;
    dateAtMidNight: Date;
  }[];
  selectEvent: (value: O.Option<CalendarEvent>) => void;
  id: string;
}>) => {
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

  return (
    <div
      className={`${style} grid ${weekGridClass} grid-row-1 overflow-scroll relative`}
      id={id}
    >
      {children}
      <DayViewContent.HoursBackground column={0 + hasChildren} />
      {days.map(
        ({ dayOfWeek, day, isToday, events, dateAtMidNight }, index) => (
          <DayViewContent.DayContainer
            column={index + hasChildren}
            key={`${index}${dayOfWeek}${day}`}
          >
            <DayViewContent.DayBackground
              key={`${index + hasChildren}-background`}
              dayOfWeek={dayOfWeek}
              day={day}
              isToday={isToday}
            />
            {clientSide && (
              <DayViewContent.DayEvents
                day={day}
                setSelectedEvent={setSelectedEvent}
                events={events}
              />
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
      <Selection />
    </div>
  );
};

const Selection = () => {
  const selectedRefs = useContext(SelectedRefs);
  const [dimensions, setDimensions] = useState({
    x_start: Number.MAX_SAFE_INTEGER,
    x_end: Number.MIN_SAFE_INTEGER,
    y_start: Number.MAX_SAFE_INTEGER,
    y_end: Number.MIN_SAFE_INTEGER,
  });

  useEffect(() => {
    selectedRefs.map(([refs]) => {
      const container = document.getElementById("calendar-week-container");
      const containerBound = container?.getBoundingClientRect();
      if (containerBound == null) {
        return;
      }

      const containerLeftPadding = containerBound.left;
      const containerTopPadding = containerBound.top;
      const containerScroll = container?.scrollTop ?? 0;

      const { x_start, x_end, y_start, y_end } = Array.from(
        refs.values(),
      ).reduce(
        (acc, div) => {
          const currentBound = div.current?.getBoundingClientRect();
          if (currentBound == null) return acc;

          return {
            x_start:
              currentBound.left < acc.x_start ? currentBound.left : acc.x_start,
            x_end:
              currentBound.right > acc.x_end ? currentBound.right : acc.x_end,
            y_start:
              currentBound.top < acc.y_start ? currentBound.top : acc.y_start,
            y_end:
              currentBound.bottom > acc.y_end ? currentBound.bottom : acc.y_end,
          };
        },
        {
          x_start: Number.MAX_SAFE_INTEGER,
          x_end: Number.MIN_SAFE_INTEGER,
          y_start: Number.MAX_SAFE_INTEGER,
          y_end: Number.MIN_SAFE_INTEGER,
        },
      );

      setDimensions({
        x_start: x_start - containerLeftPadding,
        x_end: x_end - containerLeftPadding,
        y_start: y_start + containerScroll - containerTopPadding,
        y_end: y_end + containerScroll - containerTopPadding,
      });
    });
  }, [selectedRefs]);

  if (
    dimensions.x_start !== Number.MAX_SAFE_INTEGER &&
    dimensions.x_end !== Number.MIN_SAFE_INTEGER &&
    dimensions.y_start !== Number.MAX_SAFE_INTEGER &&
    dimensions.y_end !== Number.MIN_SAFE_INTEGER
  )
    return (
      <div
        className="bg-transparent border-2 border-dashed border-primary-400 absolute pointer-events-none rounded-lg"
        style={{
          top: dimensions.y_start - 4,
          left: dimensions.x_start - 4,
          width: Math.abs(dimensions.x_end - dimensions.x_start) + 4 + 4,
          height: Math.abs(dimensions.y_start - dimensions.y_end) + 4 + 4,
        }}
      />
    );

  return null;
};
