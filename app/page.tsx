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
import {
  ActionSelected,
  CalendarModeContext,
  SelectedEvents,
  SelectedRefs,
} from "@/components/calendar-editor-week-view/contexts";
import { useShortcut } from "@/hooks/useShortcut";
import { ShortcutBuilder } from "@/utils/shortcuts";
import { SelectedDateContext } from "@/components/calendar-navbar/selectedDateContext";
import { FormHandler } from "@/components/form-handler/formHandler";

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

  const [calendarMode] = useContext(CalendarModeContext);
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

  return (
    <>
      <SelectedEvents.Provider value={O.Some(selectedEvents)}>
        <SelectedRefs.Provider value={O.Some(selectedRefs)}>
          <ActionSelected.Provider value={selectedAction}>
            <CreateEventFormOpenCtx.Provider value={openCreateFormState}>
              <SideBar
                viewableCalendarsState={viewableCalendarsState}
                className="p-1 max-w-min"
              />
              <div className="ml-1 w-full max-h-[100%] bg-white relative">
                {calendarMode
                  .map((mode) =>
                    mode === "normal" ? (
                      <CalendarWeek
                        key={"calendarweek"}
                        style={
                          "h-[100%] max-h-[100%] m-[4px] rounded-b-md shadow-md bg-white"
                        }
                        startDate={startDate}
                        viewableCalendarsState={viewableCalendarsState}
                      />
                    ) : mode === "editor" ? (
                      <CalendarEditorWeek
                        key={"calendarweekeditor"}
                        style={
                          "h-[100%] max-h-[100%] m-[4px] rounded-b-md shadow-md bg-white"
                        }
                        startDate={startDate}
                        viewableCalendarsState={viewableCalendarsState}
                      />
                    ) : null,
                  )
                  .unwrapOrElse(() => null)}
              </div>
              <CreateEventButton />
            </CreateEventFormOpenCtx.Provider>
          </ActionSelected.Provider>
        </SelectedRefs.Provider>
      </SelectedEvents.Provider>
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
  const draggedHook = useState<O.Option<CalendarEvent>>(O.None());
  const [recurringEventsManager, setManager] = useState<
    O.Option<RecurringEventsManager>
  >(O.None());

  useEffect(() => {
    data.storages.map(({ eventsStorage }) =>
      setManager(O.Some(new RecurringEventsManager(eventsStorage))),
    );
  }, [data.storages]);

  const [calendarMode, setChecked] = useState<O.Option<"editor" | "normal">>(
    O.Some("editor"),
  );
  const displayedEventsContext = useState<CalendarEvent[]>([]);

  return (
    <SelectedDateContext.Provider value={[startDate, setStartDate]}>
      <StorageContext.Provider value={data}>
        <RecurringEventsHandler.Provider value={recurringEventsManager}>
          <CalendarModeContext.Provider value={[calendarMode, setChecked]}>
            <EventsDisplayedContext.Provider
              value={O.Some(displayedEventsContext)}
            >
              <DraggedEvent.Provider value={draggedHook}>
                <main className="h-full flex flex-col bg-white">
                  <FlexContent>
                    <FormHandler>
                      <CalendarContent startDate={startDate} />
                    </FormHandler>
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
