import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton from "./components/createEvent/createEvent";

const Home = () => {
  return (
    <main className="h-full flex flex-col">
      <div className="flex-none h-[48px] bg-red-500">Navbar</div>
      <div className="flex overflow-hidden">
        <div className="w-[15%]">Side Bar</div>
        <div className="w-[85%] max-h-[100%]">
          <CalendarWeek style={"h-[100%]"} />
        </div>
      </div>
      <CreateEventButton />
    </main>
  );
};

export default Home;
