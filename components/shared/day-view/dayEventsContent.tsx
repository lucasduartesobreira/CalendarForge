import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";

const DAY_HEADER_HEIGHT = 48;
const HOUR_BLOCK_HEIGHT = 64;
const HOUR_DIVISION = 4;
const MINUTES_OF_A_DIVISION = 60 / HOUR_DIVISION;

const calcOffset = (
  hour: number,
  minute: number,
  rounder: (arg0: number) => number,
) =>
  DAY_HEADER_HEIGHT +
  hour * HOUR_BLOCK_HEIGHT +
  rounder(minute / MINUTES_OF_A_DIVISION) * (HOUR_BLOCK_HEIGHT / HOUR_DIVISION);

const startAndHeight = (startDate: Date, endDate: Date, day: number) => {
  const startsSameDay = startDate.getDate() === day;

  const [startHour, startMinute] = startsSameDay
    ? [startDate.getHours(), startDate.getMinutes()]
    : [0, 0];

  const [endHour, endMinute] =
    startDate.getDate() - endDate.getDate() === 0
      ? [endDate.getHours(), endDate.getMinutes()]
      : startsSameDay
      ? [23, 59]
      : [endDate.getHours(), endDate.getMinutes()];

  const startPosition = calcOffset(startHour, startMinute, Math.floor);
  const endPosition = calcOffset(endHour, endMinute, Math.ceil);
  const diff = endPosition - startPosition;

  const height = diff;

  return { top: startPosition, height };
};

export const DayEvents = ({
  day,
  events,
  setSelectedEvent,
}: {
  day: number;
  events: CalendarEvent[];
  setSelectedEvent: (event: O.Option<CalendarEvent>) => void;
}) => {
  const eventsMap = events.sort((a, b) => a.startDate - b.startDate);
  const conflicts = events.reduce((acc, event, index, array) => {
    const toSearch = array.slice(index + 1);
    toSearch.forEach((possibleConflict) => {
      if (possibleConflict.startDate < event.endDate) {
        const zIndex = acc.get(possibleConflict.id);
        if (!zIndex) {
          acc.set(possibleConflict.id, 1);
        } else {
          acc.set(possibleConflict.id, zIndex + 1);
        }
      }
    });

    return acc;
  }, new Map<string, number>());

  return (
    <>
      {eventsMap.map((event, index) => {
        return (
          <ShowCalendarEvent
            event={event}
            conflicts={conflicts}
            day={day}
            index={index}
            setSelectedEvent={setSelectedEvent}
            key={event.id}
          />
        );
      })}
    </>
  );
};

const ShowCalendarEvent = ({
  event,
  conflicts,
  day,
  index,
  setSelectedEvent,
}: {
  event: CalendarEvent;
  conflicts: Map<string, number>;
  day: number;
  index: number;
  setSelectedEvent: (value: O.Option<CalendarEvent>) => void;
}) => {
  const conflictNumber = conflicts.get(event.id);
  const left = 10 * (conflictNumber ?? 0);
  const width = 100 / (conflictNumber ?? 1) - left;
  return (
    <div
      className={`absolute w-full flex p-1 rounded-md absolute bottom-0 justify-start items-start`}
      style={{
        ...startAndHeight(
          new Date(event.startDate),
          new Date(event.endDate),
          day,
        ),
        width: `${width}%`,
        left: `${left}%`,
        zIndex: `${index}`,
        backgroundColor: event.color ?? "#7a5195",
        borderWidth: conflictNumber ? 1 : 0,
      }}
    >
      <button
        key={event.id}
        onClick={() => {
          setSelectedEvent(O.Some(event));
        }}
        className="text-xs"
      >
        {event.title}
      </button>
    </div>
  );
};
