"use client";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { ReactNode, useContext, useEffect, useState } from "react";
import UpdateEventForm from "../events/updateEvent/updateEvent";
import { Actions } from "@/hooks/mapHook";

const range24 = Array.from(new Array(24));

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
];

const startAndHeight = (startDate: Date, endDate: Date) => {
  const [startHour, startMinute] = [
    startDate.getHours(),
    startDate.getMinutes(),
  ];

  const startPosition =
    startHour * 64 + Math.floor(startMinute / 15) * (64 / 4);

  const timeDiffInMinutes =
    (endDate.getTime() - startDate.getTime()) / (60 * 1000);
  const blockSizeInFifteenMinutes = Math.floor(timeDiffInMinutes / 15);
  const fixForMinimal = Math.max(blockSizeInFifteenMinutes, 1);
  const height = fixForMinimal * (64 / 4);

  return { top: startPosition, height };
};

const DayBackground = ({
  day,
  events,
  setSelectedEvent,
}: {
  day: number;
  events: CalendarEvent[];
  setSelectedEvent: (event: O.Option<CalendarEvent>) => void;
}) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    <div
      className={`grid grid-rows-[auto,repeat(24,64px)] relative bg-white text-gray-300`}
    >
      <div className="flex flex-wrap row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-gray-700 justify-center content-center top-0 rounded-lg shadow-lg border-[1px] border-gray-200">
        <a className="p-2 rounded-full border-[1px] border-blue-600 bg-white text-blue-500 shadow-md">
          {day}
        </a>
      </div>
      {range24.map((_value, index) => {
        return (
          <SquareBG
            key={index}
            style={`${rowStartClass[index + 1]} col-start-[1] row-span-1`}
          />
        );
      })}
      {isClient &&
        eventsMap.map((event, index) => {
          const conflictNumber = conflicts.get(event.id);
          const left = 10 * (conflicts.get(event.id) ?? 0);
          const width = 100 / (conflictNumber ?? 1) - left;
          return (
            <div key={`day${day}${index}`} className={`static`}>
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEvent(O.Some(event));
                }}
                className="flex absolute bottom-0 justify-start"
                style={{
                  ...startAndHeight(
                    new Date(event.startDate),
                    new Date(event.endDate),
                  ),
                  width: `${width}%`,
                  left: `${left}%`,
                  zIndex: `${index}`,
                  backgroundColor: event.color ?? "#7a5195",
                }}
              >
                {event.title}
              </button>
            </div>
          );
        })}
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
      className={`${style} border-[1px] border-t-0 border-l-0 border-gray-300 h-[64px]`}
    >
      {childrens}
    </div>
  );
};

const HoursBackground = () => {
  return (
    <div
      className={`grid grid-rows-[auto,repeat(24,64px)] bg-white text-gray-300`}
    >
      {range24.map((_value, index) => {
        return (
          <SquareBG
            style={`${
              rowStartClass[index + 1]
            } col-start-[1] flex flex-wrap justify-end content-end`}
            childrens={
              <p key={index} className="text-gray-700">{`${
                index < 10 ? `0${index}` : index
              }:00`}</p>
            }
            key={index}
          />
        );
      })}
    </div>
  );
};

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
      setEvents(
        eventsStorage
          .filter(
            (event) =>
              (viewableCalendarsState.unwrap()[0].get(event.calendar_id) ??
                true) &&
              event.startDate >= startDate.getTime() &&
              event.endDate >= startDate.getTime() &&
              event.startDate <= lastDayOfTheWeek.getTime() &&
              event.endDate <= lastDayOfTheWeek.getTime(),
          )
          .map(([, value]) => value),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeners.eventsStorageListener, startDate, viewableCalendarsState]);

  const initial: CalendarEvent[][] = [[], [], [], [], [], [], []];

  let weekEventsByDay = events.reduce((acc, event) => {
    acc.at(new Date(event.startDate).getDay())?.push(event);
    return acc;
  }, initial);

  useEffect(() => {
    const calendarWeekContainer = document.getElementById(
      "calendar-week-container",
    );
    if (calendarWeekContainer) {
      calendarWeekContainer.scrollTop = 512;
    }
  }, []);

  return (
    <div
      className={`${style} grid grid-cols-[50px_repeat(7,1fr)] grid-row-1 overflow-scroll`}
      id="calendar-week-container"
    >
      <HoursBackground />
      <DayBackground
        day={1}
        events={weekEventsByDay ? weekEventsByDay[0] : []}
        setSelectedEvent={setSelectedEvent}
      />
      <DayBackground
        day={2}
        events={weekEventsByDay ? weekEventsByDay[1] : []}
        setSelectedEvent={setSelectedEvent}
      />
      <DayBackground
        day={3}
        events={weekEventsByDay ? weekEventsByDay[2] : []}
        setSelectedEvent={setSelectedEvent}
      />
      <DayBackground
        day={4}
        events={weekEventsByDay ? weekEventsByDay[3] : []}
        setSelectedEvent={setSelectedEvent}
      />
      <DayBackground
        day={5}
        events={weekEventsByDay ? weekEventsByDay[4] : []}
        setSelectedEvent={setSelectedEvent}
      />
      <DayBackground
        day={6}
        events={weekEventsByDay ? weekEventsByDay[5] : []}
        setSelectedEvent={setSelectedEvent}
      />
      <DayBackground
        day={7}
        events={weekEventsByDay ? weekEventsByDay[6] : []}
        setSelectedEvent={setSelectedEvent}
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
    </div>
  );
};

export default CalendarWeek;
