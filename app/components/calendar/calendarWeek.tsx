"use client";
import { ReactNode, useEffect } from "react";
import { Event } from "../createEvent/createEventControl";

const range24 = Array.from(new Array(24));

const DayBackground = ({ day, events }: { day: number; events: Event[] }) => {
  return (
    <div className={`grid grid-rows-[repeat(24,64px)] bg-white text-gray-300`}>
      {range24.map((_value, index) => {
        return (
          <SquareBG
            key={index}
            style={`row-start-${index + 1} col-start-[1] row-span-1`}
          />
        );
      })}
      {events
        .filter((_value, index) => index <= 24)
        .map((event, index) => {
          return (
            <div
              key={event.id}
              className={`row-start-${
                index + 1
              } col-start-1 sticky z-[100] bottom-0 bg-purple-500`}
            >
              {event.title}
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
            style={`row-start-[${index + 1}] col-start-[1] row-span-[${
              index + 1
            }]`}
            childrens={
              <p key={index}>{`${index < 10 ? `0${index}` : index}:00`}</p>
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
  state: events,
}: {
  style: string;
  state: Event[];
}) => {
  const dateToday = new Date();
  const firstDayOfTheWeek = new Date(dateToday.getDate() - dateToday.getDay());

  const weekEvents = events?.filter(
    (event) => event.startDate > firstDayOfTheWeek.getTime(),
  );

  const initial: Event[][] = [[], [], [], [], [], [], []];

  let weekEventsByDay = weekEvents?.reduce((acc, event) => {
    acc.at(new Date(event.startDate).getDay())?.push(event);
    return acc;
  }, initial);

  return (
    <div
      className={`${style} grid grid-cols-[50px_repeat(7,1fr)] grid-row-1 overflow-scroll`}
    >
      <HoursBackground />
      <DayBackground
        events={weekEventsByDay ? weekEventsByDay[0] : []}
        day={1 + 1}
      />
      <DayBackground
        events={weekEventsByDay ? weekEventsByDay[1] : []}
        day={2 + 1}
      />
      <DayBackground
        events={weekEventsByDay ? weekEventsByDay[2] : []}
        day={3 + 1}
      />
      <DayBackground
        events={weekEventsByDay ? weekEventsByDay[3] : []}
        day={4 + 1}
      />
      <DayBackground
        events={weekEventsByDay ? weekEventsByDay[4] : []}
        day={5 + 1}
      />
      <DayBackground
        events={weekEventsByDay ? weekEventsByDay[5] : []}
        day={6 + 1}
      />
      <DayBackground
        events={weekEventsByDay ? weekEventsByDay[6] : []}
        day={7 + 1}
      />
    </div>
  );
};

export default CalendarWeek;
