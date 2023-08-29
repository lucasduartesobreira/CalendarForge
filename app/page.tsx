"use client";
import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton from "./components/createEvent/createEvent";
import SideBar from "./components/sideBar/SideBar";
import { StorageContext, useDataStorage } from "@/hooks/dataHook";

const Home = () => {
  const data = useDataStorage();

  return (
    <StorageContext.Provider value={data}>
      <main className="h-full flex flex-col">
        <div className="flex-none h-[48px] bg-red-500">Navbar</div>
        <div className="flex overflow-hidden">
          <SideBar className="w-[15%]" />
          <div className="w-[85%] max-h-[100%]">
            <CalendarWeek style={"h-[100%] max-h-[100%]"} />
          </div>
        </div>
        <CreateEventButton />
      </main>
    </StorageContext.Provider>
  );
};

export default Home;
