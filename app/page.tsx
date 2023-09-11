"use client";
import { useEffect, useState } from "react";
import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton from "./components/createEvent/createEvent";
import SideBar from "./components/sideBar/SideBar";
import { StorageContext, useDataStorage } from "@/hooks/dataHook";
import { useMap } from "@/hooks/mapHook";

const Home = () => {
  const data = useDataStorage();

  const [startDate, setStartDate] = useState(new Date());
  const viewableCalendarsState = useMap<string, boolean>("viewableCalendars");

  useEffect(() => {
    const dateToday = new Date(Date.now());
    const firstDayOfTheWeek = new Date(
      dateToday.getTime() + -dateToday.getDay() * 24 * 60 * 60 * 1000,
    );
    firstDayOfTheWeek.setHours(0, 0, 0, 0);

    setStartDate(firstDayOfTheWeek);
  }, []);

  useEffect(() => {
    if (data.storages.isSome() && viewableCalendarsState.isSome()) {
      const { calendarsStorage } = data.storages.unwrap();
      const calendars = calendarsStorage.getCalendars();
      const [viewableCalendars, actions] = viewableCalendarsState.unwrap();
      const fixedCalendars = calendars.reduce((acc, calendar) => {
        acc.get(calendar.id) ?? acc.set(calendar.id, true);
        return acc;
      }, new Map(viewableCalendars));
      actions.setAll(fixedCalendars);
    }
  }, [data.listeners.calendarsStorageListener]);

  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return (
    <StorageContext.Provider value={data}>
      <main className="h-full flex flex-col">
        <div className="flex-none grid grid-cols-[auto_15%] grid-rows-[100%] relative h-[48px] bg-red-500">
          <div className="col-start-1">Navbar</div>
          <div className="col-start-2 grid grid-rows-[100%] grid-cols-[auto] place-items-center gap-[4px] w-[100%] h-[100%]">
            <button
              onClick={() => {
                setStartDate(
                  new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
                );
              }}
              className="col-start-1"
            >
              &lt;
            </button>{" "}
            <div className="text-center col-start-2">{`${startDate.getDate()}/${startDate.getMonth()} - ${endDate.getDate()}/${endDate.getMonth()}`}</div>{" "}
            <button
              onClick={() => {
                setStartDate(
                  new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                );
              }}
              className="col-start-3"
            >
              &gt;
            </button>
          </div>
        </div>
        <div className="flex overflow-hidden">
          <SideBar
            className="w-[15%]"
            viewableCalendarsState={viewableCalendarsState}
          />
          <div className="w-[85%] max-h-[100%]">
            <CalendarWeek
              style={"h-[100%] max-h-[100%]"}
              startDate={startDate}
              viewableCalendarsState={viewableCalendarsState}
            />
          </div>
        </div>
        <CreateEventButton />
      </main>
    </StorageContext.Provider>
  );
};

export default Home;
