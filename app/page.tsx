import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton, {
  CreateEventForm,
} from "./components/createEvent/createEvent";

const Home = () => {
  return (
    <main className="flex flex-col gap-y-px min-h-screen items-center justify-between border-4 bg-black">
      <div className="min-w-full flex-none w-12 h-12 border-2 border-red-500">
        Navbar
      </div>
      <div className="flex flex-auto row h-full w-full">
        <div className="flex-initial border-2 border-red-400 h-11/12 w-[15%]">
          Side Bar
        </div>
        <div className="flex-none w-[85%]  overflow-clip">
          <CalendarWeek style={"flex-none w-[100%] h-[100%]"} />
        </div>
      </div>
      <CreateEventButton />
    </main>
  );
};

export default Home;
