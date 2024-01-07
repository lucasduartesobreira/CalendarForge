"use client";
import { createContext, useContext, useEffect, useState } from "react";
import CalendarWeek from "@/components/calendar-week-view/calendarWeek";
import CreateEventButton from "@/components/event-create-form/createEvent";
import SideBar from "@/components/sidebar/sideBar";
import {
  RecurringEventsHandler,
  StorageContext,
  useDataStorage,
} from "@/hooks/dataHook";
import { useMap } from "@/hooks/mapHook";
import { WeekNavigation } from "@/components/calendar-navbar/navBar";
import * as O from "@/utils/option";
import {
  CalendarEvent,
  RecurringEventsManager,
} from "@/services/events/events";
import { DraggedEvent } from "@/components/shared/day-view/dayEventsContent";
import CalendarEditorWeek, {
  EventsDisplayedContext,
} from "@/components/calendar-editor-week-view/calendarEditorWeek";
import { EditorSideBar } from "@/components/calendar-editor-sidebar/sideBar";

const NavBarContainer = ({
  children,
  className,
}: {
  children: any;
  className?: string;
}) => {
  return (
    <div
      className={`flex-none rounded-b-md flex w-full relative h-[42px] bg-primary-500 items-center ${className}`}
    >
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

  const calendarMode = useContext(CalendarModeContext);

  return calendarMode
    .map((mode) =>
      mode === "normal" ? (
        <>
          <SideBar
            viewableCalendarsState={viewableCalendarsState}
            className="p-1 w-[15%]"
          />
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
      ) : mode === "editor" ? (
        <>
          <EditorSideBar
            viewableCalendarsState={viewableCalendarsState}
            className="p-1 w-[20%]"
          />
          <div className="ml-auto w-[85%] max-h-[100%] bg-white">
            <CalendarEditorWeek
              style={
                "h-[100%] max-h-[100%] m-[4px] rounded-b-md shadow-md bg-white"
              }
              startDate={startDate}
              viewableCalendarsState={viewableCalendarsState}
            />
          </div>
          <CreateEventButton />
        </>
      ) : null,
    )
    .unwrapOrElse(() => null);
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

const CalendarModeContext = createContext<O.Option<"editor" | "normal">>(
  O.None(),
);

const Home = () => {
  const data = useDataStorage();
  const [startDate, setStartDate] = useDate();
  const draggedHook = useState<O.Option<CalendarEvent>>(O.None());
  const [menuType, setMenuType] = useState<"calendar" | "projects">("calendar");
  const [recurringEventsManager, setManager] = useState<
    O.Option<RecurringEventsManager>
  >(O.None());

  useEffect(() => {
    data.storages.map(({ eventsStorage }) =>
      setManager(O.Some(new RecurringEventsManager(eventsStorage))),
    );
  }, [data.storages]);

  const [calendarMode, setChecked] = useState(false);
  const displayedEventsContext = useState<CalendarEvent[]>([]);

  return (
    <StorageContext.Provider value={data}>
      <RecurringEventsHandler.Provider value={recurringEventsManager}>
        <CalendarModeContext.Provider
          value={O.Some(calendarMode ? "editor" : "normal")}
        >
          <EventsDisplayedContext.Provider
            value={O.Some(displayedEventsContext)}
          >
            <DraggedEvent.Provider value={draggedHook}>
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
                    <label className="relative inline-flex items-center cursor-pointer ml-auto mr-auto">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={calendarMode}
                        onChange={() => setChecked(!calendarMode)}
                      />
                      <div className="w-11 h-6 bg-white peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-primary-400 peer-checked:after:bg-primary-400 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-primary-200 after:border-primary-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-200" />
                      <span className="ms-3 text-sm font-semibold text-text-inverse select-none">
                        {calendarMode ? "Editor" : "Normal"}
                      </span>
                    </label>
                  )}
                  {menuType === "calendar" && (
                    <WeekNavigation
                      startDate={startDate}
                      setStartDate={setStartDate}
                    />
                  )}
                </NavBarContainer>
                <FlexContent>
                  {menuType === "calendar" && (
                    <CalendarContent startDate={startDate} />
                  )}
                </FlexContent>
              </main>
            </DraggedEvent.Provider>
          </EventsDisplayedContext.Provider>
        </CalendarModeContext.Provider>
      </RecurringEventsHandler.Provider>
    </StorageContext.Provider>
  );
};

export default Home;
