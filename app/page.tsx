"use client";
import { useContext, useEffect, useState } from "react";
import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton from "./components/createEvent/createEvent";
import SideBar from "./components/sideBar/SideBar";
import { StorageContext, useDataStorage } from "@/hooks/dataHook";
import { useMap } from "@/hooks/mapHook";
import { WeekNavigation } from "./components/calendar/navBar";

const NavBarContainer = ({ children }: { children: any }) => {
  return (
    <div className="flex-none rounded-b-md grid grid-cols-[auto_15%] grid-rows-[100%] relative h-[42px] bg-primary-500 items-center">
      {children}
    </div>
  );
};

const FlexContent = ({ children }: { children: any }) => {
  return <div className="flex relative overflow-hidden h-full">{children}</div>;
};

const CalendarContent = ({ startDate }: { startDate: Date }) => {
  const { storages, listeners } = useContext(StorageContext);

  const viewableCalendarsState = useMap<string, boolean>("viewableCalendars");

  useEffect(() => {
    if (storages.isSome() && viewableCalendarsState.isSome()) {
      async () => {
        const { calendarsStorage } = storages.unwrap();
        const calendars = await calendarsStorage.all();
        const [viewableCalendars, actions] = viewableCalendarsState.unwrap();
        const fixedCalendars = calendars.reduce((acc, calendar) => {
          acc.get(calendar.id) ?? acc.set(calendar.id, true);
          return acc;
        }, new Map(viewableCalendars));
        actions.setAll(fixedCalendars);
      };
    }
  }, [storages, listeners.calendarsStorageListener]);

  return (
    <>
      <SideBar viewableCalendarsState={viewableCalendarsState} />
      <div className="ml-auto w-[85%] max-h-[100%] bg-white">
        <CalendarWeek
          style={
            "h-[100%] max-h-[100%] m-[4px] rounded-b-md shadow-md bg-white"
          }
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
  const [menuType, setMenuType] = useState<"calendar" | "projects">("calendar");

  return (
    <StorageContext.Provider value={data}>
      <main className="h-full flex flex-col bg-white">
        <NavBarContainer>
          <nav className="mx-6 col-start-1 flex gap-2 text-text-inverse items-center">
            <button
              onClick={() => setMenuType("calendar")}
              className={`font-semibold py-1 px-2 my-2 ${
                menuType === "calendar"
                  ? "border-text-inverse bg-primary-300 rounded-md border-[1px] border-primary-100"
                  : ""
              }`}
            >
              Calendar
            </button>
          </nav>
          {menuType === "calendar" && (
            <WeekNavigation startDate={startDate} setStartDate={setStartDate} />
          )}
        </NavBarContainer>
        <FlexContent>
          {menuType === "calendar" && <CalendarContent startDate={startDate} />}
        </FlexContent>
      </main>
    </StorageContext.Provider>
  );
};

export default Home;
