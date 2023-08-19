import CalendarWeek from "./components/calendar/calendarWeek";
import CreateEventButton, {
  CreateEventForm,
} from "./components/createEvent/createEvent";

const Home = () => {
  return (
    <main className="h-screen max-h-screen overflow-hidden">
      <div className="h-[48px] bg-red-500">Navbar</div>
      <div className="max-h-full flex">
        <div className="w-[15%]">Side Bar</div>
        <div className="flex-none w-[85%] ">
          <CalendarWeek style={"flex-none w-[100%] h-[100%]"} />
        </div>
      </div>
      <CreateEventButton />
    </main>
  );
};

export default Home;
