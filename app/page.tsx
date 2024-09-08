"use client";
import { RefObject, useContext, useEffect, useState } from "react";
import CalendarWeek from "@/components/calendar-week-view/calendarWeek";
import CreateEventButton, {
  CreateEventFormOpenCtx,
} from "@/components/event-create-form/createEvent";
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
  CreateEvent,
  RecurringEventsManager,
} from "@/services/events/events";
import { DraggedEvent } from "@/components/shared/day-view/dayEventsContent";
import CalendarEditorWeek, {
  EventsDisplayedContext,
} from "@/components/calendar-editor-week-view/calendarEditorWeek";
import { EditorSideBar } from "@/components/calendar-editor-sidebar/sideBar";
import {
  ActionSelected,
  CalendarModeContext,
  SelectedEvents,
  SelectedRefs,
} from "@/components/calendar-editor-week-view/contexts";
import { useShortcut } from "@/hooks/useShortcut";
import { ShortcutBuilder } from "@/utils/shortcuts";
import { SelectedDateContext } from "@/components/calendar-navbar/selectedDateContext";

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
  const selectedEvents = useState<Map<CalendarEvent["id"], CalendarEvent>>(
    new Map(),
  );

  const selectedRefs = useState<
    Map<CalendarEvent["id"], RefObject<HTMLDivElement>>
  >(new Map());

  useShortcut(
    ShortcutBuilder.new().build("Escape", () => {
      selectedEvents[1](new Map());
      selectedRefs[1](new Map());
      selectedAction[1](O.None());
    }),
    "editor",
  );

  useShortcut(
    ShortcutBuilder.new().build("d", () => {
      const selected = selectedEvents[0];
      if (selected.size === 1) {
        const [
          [
            ,
            { id: _, task_id: _task_id, recurring_id: _recurring_id, ...event },
          ],
        ] = selected.entries();
        storages.map(({ eventsStorage }) => eventsStorage.add(event));
      }
    }),
    "editor",
  );

  useShortcut(
    ShortcutBuilder.new().build("Delete", () => {
      const selected = selectedEvents[0];
      if (selected.size === 1) {
        const [[eventId]] = selected.entries();
        storages.map(({ eventsStorage }) => eventsStorage.remove(eventId));
      }
    }),
    "editor",
  );

  useShortcut(
    ShortcutBuilder.new().build("t", () => {
      const selected = selectedEvents[0];
      if (selected.size === 1) {
        const [[eventId, event]] = selected.entries();
        storages.map(({ eventsStorage, tasksStorage }) =>
          event.task_id != null
            ? eventsStorage.update(eventId, { task_id: undefined })
            : tasksStorage
                .add({
                  title: event.title,
                  description: event.description,
                  completed: false,
                })
                .then((result) =>
                  result
                    .map((task) =>
                      eventsStorage.update(eventId, { task_id: task.id }),
                    )
                    .asyncFlatten(),
                ),
        );
      }
    }),
    "editor",
  );

  const selectedAction = useState<O.Option<ActionSelected>>(O.None());
  const openCreateFormState = useState<O.Option<Partial<CreateEvent>>>(
    O.None(),
  );

  return calendarMode
    .map((mode) =>
      mode === "normal" ? (
        <>
          <CreateEventFormOpenCtx.Provider value={openCreateFormState}>
            <SideBar
              viewableCalendarsState={viewableCalendarsState}
              startDate={startDate}
              className="p-1 max-w-min"
            />
            <div className="ml-1 w-full max-h-[100%] bg-white">
              <CalendarWeek
                style={
                  "h-[100%] max-h-[100%] m-[4px] rounded-b-md shadow-md bg-white"
                }
                startDate={startDate}
                viewableCalendarsState={viewableCalendarsState}
              />
            </div>
            <CreateEventButton />
          </CreateEventFormOpenCtx.Provider>
        </>
      ) : mode === "editor" ? (
        <SelectedEvents.Provider value={O.Some(selectedEvents)}>
          <SelectedRefs.Provider value={O.Some(selectedRefs)}>
            <ActionSelected.Provider value={selectedAction}>
              <CreateEventFormOpenCtx.Provider value={openCreateFormState}>
                <EditorSideBar
                  viewableCalendarsState={viewableCalendarsState}
                  className="p-1 w-[20%]"
                />
                <div className="ml-auto w-[85%] max-h-[100%] bg-white relative">
                  <CalendarEditorWeek
                    style={
                      "h-[100%] max-h-[100%] m-[4px] rounded-b-md shadow-md bg-white"
                    }
                    startDate={startDate}
                    viewableCalendarsState={viewableCalendarsState}
                  />
                </div>
                <CreateEventButton />
              </CreateEventFormOpenCtx.Provider>
            </ActionSelected.Provider>
          </SelectedRefs.Provider>
        </SelectedEvents.Provider>
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
    <SelectedDateContext.Provider value={[startDate, setStartDate]}>
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
    </SelectedDateContext.Provider>
  );
};

export default Home;
