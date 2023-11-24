"use client";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import {
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import UpdateEventForm from "@/components/event-update-form/updateEvent";
import { Actions } from "@/hooks/mapHook";

const range24 = Array.from(new Array(24));

const dayToString = {
  1: "sun",
  2: "mon",
  3: "tue",
  4: "wed",
  5: "thu",
  6: "fri",
  7: "sat",
};

const rowStartClass = [
  "row-start-[1]",
  "row-start-[2]",
  "row-start-[3]",
  "row-start-[4]",
  "row-start-[5]",
  "row-start-[6]",
  "row-start-[7]",
  "row-start-[8]",
  "row-start-[9]",
  "row-start-[10]",
  "row-start-[11]",
  "row-start-[12]",
  "row-start-[13]",
  "row-start-[14]",
  "row-start-[15]",
  "row-start-[16]",
  "row-start-[17]",
  "row-start-[18]",
  "row-start-[19]",
  "row-start-[20]",
  "row-start-[21]",
  "row-start-[22]",
  "row-start-[23]",
  "row-start-[24]",
  "row-start-[25]",
  "row-start-[26]",
] as const;

const colStartClass = [
  "col-start-[2]",
  "col-start-[3]",
  "col-start-[4]",
  "col-start-[5]",
  "col-start-[6]",
  "col-start-[7]",
  "col-start-[8]",
] as const;

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

const DayBackground = ({
  dayOfWeek,
  day,
  isToday,
}: {
  dayOfWeek: ViewSize;
  day: number;
  isToday: boolean;
}) => {
  const color = isToday ? "bg-primary-50" : "bg-white";

  return (
    <div
      className={`grid grid-rows-[auto,repeat(24,64px)] absolute w-full bg-white text-neutral-300`}
    >
      <DayHeader day={day} color={color} dayOfWeek={dayOfWeek} />
      {range24.map((_value, index) => {
        return (
          <SquareBG
            key={index}
            style={`${rowStartClass[index + 1]} col-start-[1] row-span-1`}
          />
        );
      })}
    </div>
  );
};
const DayHeader = ({
  color,
  day,
  dayOfWeek,
}: {
  color: string;
  day: number;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}) => {
  return (
    <div className="flex row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-neutral-600 justify-center items-center top-0 rounded-lg shadow-lg border-[1px] border-neutral-200 overflow-hidden z-[10000]">
      <div className="text-center relative px-8 py-4">
        <div
          className={`${color} flex justify-center items-center font-mono text-4x1 font-bold px-4 py-2 rounded-[1rem] border-[1px] border-primary-500 text-primary-500 shadow-md w-10 h-10`}
        >
          <span className="text-center">{day}</span>
        </div>
        <div className="absolute bottom-2 right-2">
          <a className="text-xs font-mono">{dayToString[dayOfWeek]}</a>
        </div>
      </div>
    </div>
  );
};

const DayEvents = ({
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

const SquareBG = ({
  childrens,
  style,
}: {
  childrens?: ReactNode;
  style?: string;
}) => {
  return (
    <div
      className={`${style} border-[1px] border-t-0 border-l-0 border-neutral-300 h-[64px]`}
    >
      {childrens}
    </div>
  );
};

const HoursBackground = () => {
  return (
    <div
      className={`grid grid-rows-[auto,repeat(24,64px)] col-start-1 bg-white text-neutral-300`}
    >
      <div className="flex row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-neutral-700 justify-center items-center top-0 shadow-lg border-[1px] border-neutral-200 overflow-hidden"></div>
      {range24.map((_value, index) => {
        return (
          <SquareBG
            style={`${
              rowStartClass[index + 1]
            } col-start-[1] flex flex-wrap justify-end items-start`}
            childrens={
              <p
                key={index}
                className="text-neutral-600 mr-auto ml-auto mt-1 text-sm "
              >{`${index < 10 ? `0${index}` : index}:00`}</p>
            }
            key={index}
          />
        );
      })}
    </div>
  );
};

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

  const initial: CalendarEvent[][] = [[], [], [], [], [], [], []];

  const weekEventsByDay = events.reduce((acc, event) => {
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
        };
      }),
    [startDate],
  );

  return (
    <>
      <FlexibleWeekContainer
        selectEvent={setSelectedEvent}
        style={style}
        days={memoedRange.map(({ dayOfWeek, ...rest }) => ({
          ...rest,
          dayOfWeek,
          events: weekEventsByDay ? weekEventsByDay[dayOfWeek - 1] : [],
        }))}
        id={CALENDAR_WEEK_CONTAINER_ID}
      />
      {selectedEvent.mapOrElse(
        () => null,
        (selectedEvent) => (
          <UpdateEventForm
            setOpen={() => setSelectedEvent(O.None())}
            initialForm={selectedEvent}
          ></UpdateEventForm>
        ),
      )}
    </>
  );
};

const AcceptedDaysValue = [1, 2, 3, 4, 5, 6, 7] as const;
type ViewSize = (typeof AcceptedDaysValue)[number];
type BetweenOneAndSeven<T extends number> = T extends ViewSize ? T : never;

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

const FlexibleWeekContainer = <T extends number>({
  days,
  selectEvent: setSelectedEvent,
  style,
  id,
}: {
  style: string;
  days: {
    events: CalendarEvent[];
    dayOfWeek: BetweenOneAndSeven<T>;
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

const DayContainer = ({
  children,
  column,
}: PropsWithChildren<{ column: number }>) => {
  const columnTailWind = colStartClass.at(column);
  if (columnTailWind)
    return (
      <div className={`${columnTailWind} relative w-full`}>{children}</div>
    );
};

export default CalendarWeek;
