"use client";
import useLocalStorage from "@/hooks/localStorageHook";
import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton from "./components/createEvent/createEvent";
import SideBar from "./components/sideBar/SideBar";
import { CalendarEvent } from "@/services/events/events";
import { StorageContext, useDataStorage } from "@/hooks/dataHook";

const Home = () => {
  const [state] = useLocalStorage("events", [] as CalendarEvent[]);
  const data = useDataStorage();

  return (
    <StorageContext.Provider value={data}>
      <main className="h-full flex flex-col">
        <div className="flex-none h-[48px] bg-red-500">Navbar</div>
        <div className="flex overflow-hidden">
          <div className="w-[15%]">Side Bar</div>
          <div className="w-[85%] max-h-[100%]">
            <CalendarWeek style={"h-[100%] max-h-[100%]"} state={state} />
          </div>
        </div>
        <CreateEventButton />
        <SideBar />
      </main>
    </StorageContext.Provider>
  );
};

export default Home;
