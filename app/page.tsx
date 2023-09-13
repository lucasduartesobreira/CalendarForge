"use client";
import { useContext, useEffect, useState } from "react";
import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton from "./components/createEvent/createEvent";
import SideBar from "./components/sideBar/SideBar";
import { StorageContext, useDataStorage } from "@/hooks/dataHook";
import { useMap } from "@/hooks/mapHook";
import { WeekNavigation } from "./components/calendar/navBar";

const NavBar = ({ children }: { children: any }) => {
  return (
    <div className="flex-none grid grid-cols-[auto_15%] grid-rows-[100%] relative h-[48px] bg-red-500">
      {children}
    </div>
  );
};

const Content = ({ children }: { children: any }) => {
  return <div className="flex relative overflow-hidden">{children}</div>;
};

const CalendarContent = ({ startDate }: { startDate: Date }) => {
  const { storages, listeners } = useContext(StorageContext);

  const viewableCalendarsState = useMap<string, boolean>("viewableCalendars");

  useEffect(() => {
    if (storages.isSome() && viewableCalendarsState.isSome()) {
      const { calendarsStorage } = storages.unwrap();
      const calendars = calendarsStorage.getCalendars();
      const [viewableCalendars, actions] = viewableCalendarsState.unwrap();
      const fixedCalendars = calendars.reduce((acc, calendar) => {
        acc.get(calendar.id) ?? acc.set(calendar.id, true);
        return acc;
      }, new Map(viewableCalendars));
      actions.setAll(fixedCalendars);
    }
  }, [listeners.calendarsStorageListener]);

  return (
    <>
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
      <CreateEventButton />
    </>
  );
};

const useDate = () => {
  const [startDate, setStartDate] = useState(new Date());

  useEffect(() => {
    const dateToday = new Date(Date.now());
    const firstDayOfTheWeek = new Date(
      dateToday.getTime() + -dateToday.getDay() * 24 * 60 * 60 * 1000,
    );
    firstDayOfTheWeek.setHours(0, 0, 0, 0);

    setStartDate(firstDayOfTheWeek);
  }, []);

  return [startDate, setStartDate] as const;
};

const Home = () => {
  const data = useDataStorage();
  const [startDate, setStartDate] = useDate();

  return (
    <StorageContext.Provider value={data}>
      <main className="h-full flex flex-col">
        <NavBar>
          <nav className="col-start-1">Navbar</nav>
          <WeekNavigation startDate={startDate} setStartDate={setStartDate} />
        </NavBar>
        <Content>
          <CalendarContent startDate={startDate} />
        </Content>
      </main>
    </StorageContext.Provider>
  );
};

export default Home;
