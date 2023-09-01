"use client";
import { useCallback, useEffect, useState } from "react";
import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton from "./components/createEvent/createEvent";
import SideBar from "./components/sideBar/SideBar";
import { StorageContext, useDataStorage } from "@/hooks/dataHook";

const Home = () => {
  const data = useDataStorage();

  const [startDate, setStartDate] = useState(new Date());

  useEffect(() => {
    const dateToday = new Date(Date.now());
    const firstDayOfTheWeek = new Date(
      dateToday.getTime() + -dateToday.getDay() * 24 * 60 * 60 * 1000,
    );
    firstDayOfTheWeek.setHours(0, 0, 0, 0);

    setStartDate(firstDayOfTheWeek);
  }, []);

  return (
    <StorageContext.Provider value={data}>
      <main className="h-full flex flex-col">
        <div className="flex-none h-[48px] bg-red-500">Navbar</div>
        <div className="flex overflow-hidden">
          <SideBar className="w-[15%]" />
          <div className="w-[85%] max-h-[100%]">
            <CalendarWeek
              style={"h-[100%] max-h-[100%]"}
              startDate={startDate}
            />
          </div>
        </div>
        <CreateEventButton />
      </main>
    </StorageContext.Provider>
  );
};

export default Home;
