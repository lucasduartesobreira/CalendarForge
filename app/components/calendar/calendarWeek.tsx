"use client";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import { None, Option, Some } from "@/utils/option";
import { ReactNode, useContext, useEffect, useState } from "react";
import UpdateEventForm from "../events/updateEvent/updateEvent";

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
];

const DayBackground = ({
  day,
  events,
  setSelectedEvent,
}: {
  day: number;
  events: CalendarEvent[];
  setSelectedEvent: (event: Option<CalendarEvent>) => void;
}) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  let eventsMap = events
    .filter((_value, index) => index <= 24)
    .reduce((acc, event) => {
      let eventDate = new Date(event.startDate);
      let hourEvent = acc.get(eventDate.getHours());
      if (hourEvent == undefined) {
        acc.set(eventDate.getHours(), [event]);
        return acc;
      }

      hourEvent.push(event);
      return acc;
    }, new Map<number, CalendarEvent[]>())
    .entries();
  let eventsPerHour = Array.from(eventsMap);
  return (
    <div className={`grid grid-rows-[repeat(24,64px)] bg-white text-gray-300`}>
      {range24.map((_value, index) => {
        return (
          <SquareBG
            key={index}
            style={`${rowStartClass[index]} col-start-[1] row-span-1`}
          />
        );
      })}
      {isClient &&
        eventsPerHour.map(([hours, events], index) => {
          return (
            <div
              key={`day${day}${index}`}
              className={`col-start-1 col-span-1 ${
                rowStartClass[hours]
              } relative z-[100] bottom-0 bg-purple-500  row-start-${
                hours + 1
              }`}
            >
              {events.map((event) => {
                return (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(Some(event));
                    }}
                  >
                    {event.title}
                  </div>
                );
              })}
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
    <div className={`${style} border-[0.5px] border-gray-300 h-[64px]`}>
      {childrens}
    </div>
  );
};

const HoursBackground = () => {
  return (
    <div className={`grid grid-rows-[repeat(24,64px)] bg-white text-gray-300`}>
      {range24.map((_value, index) => {
        return (
          <SquareBG
            style={`${rowStartClass[index]} col-start-[1] row-span-[${
              index + 1
            }]`}
            childrens={
              <p key={index} className="text-black">{`${
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

const CalendarWeek = ({ style }: { style: string }) => {
  const dateToday = new Date();
  const firstDayOfTheWeek = new Date(dateToday.getDate() - dateToday.getDay());
  firstDayOfTheWeek.setHours(0, 0, 0, 0);

  const storageContext = useContext(StorageContext);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Option<CalendarEvent>>(
    None(),
  );
  useEffect(() => {
    if (storageContext.isSome()) {
      const { eventsStorage } = storageContext.unwrap();
      setEvents(
        eventsStorage.filter(
          (event) => event.startDate > firstDayOfTheWeek.getTime(),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageContext]);

  const initial: CalendarEvent[][] = [[], [], [], [], [], [], []];

  let weekEventsByDay = events.reduce((acc, event) => {
    acc.at(new Date(event.startDate).getDay())?.push(event);
    return acc;
  }, initial);

  return (
    <div
      className={`${style} grid grid-cols-[50px_repeat(7,1fr)] grid-row-1 overflow-scroll`}
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
      {selectedEvent.isSome() && (
        <UpdateEventForm
          setOpen={() => setSelectedEvent(None())}
          initialForm={selectedEvent.unwrap()}
        ></UpdateEventForm>
      )}
    </div>
  );
};

export default CalendarWeek;
