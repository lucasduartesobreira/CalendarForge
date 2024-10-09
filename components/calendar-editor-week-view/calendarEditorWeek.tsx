"use client";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Actions } from "@/hooks/mapHook";
import { FlexibleView, ViewSize } from "../shared/flexible-view/flexibleView";
import { DayViewContent } from "../shared/day-view/dayContent";
import { Selection } from "../editor-selection-view/editorSelection";
import { ActionHeader } from "../editor-actions-header/actionsHeader";
import { SelectedEvents, SelectedRefs } from "./contexts";
import { useFormHandler } from "../form-handler/formHandler";
import { ChartNoAxesCombined, CircleHelp } from "lucide-react";

const CALENDAR_WEEK_CONTAINER_ID = "calendar-week-container";

export const EventsDisplayedContext = createContext<
  O.Option<
    [
      displayedEvents: CalendarEvent[],
      setEvents: Dispatch<SetStateAction<CalendarEvent[]>>,
    ]
  >
>(O.None());

const CalendarEditorWeek = ({
  style,
  startDate,
  viewableCalendarsState,
}: {
  style: string;
  startDate: Date;
  viewableCalendarsState: O.Option<
    [
      Omit<Map<string, boolean>, "set" | "clear" | "delete">,
      Actions<string, boolean>,
    ]
  >;
}) => {
  const { storages: storages, listeners } = useContext(StorageContext);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const displayedEventsCtx = useContext(EventsDisplayedContext);
  useEffect(() => {
    if (storages.isSome() && viewableCalendarsState.isSome()) {
      const { eventsStorage } = storages.unwrap();
      const lastDayOfTheWeek = new Date(
        startDate.getTime() + 6 * 24 * 60 * 60 * 1000,
      );
      lastDayOfTheWeek.setHours(23, 59, 59, 999);
      eventsStorage
        .filteredValues(
          (event) =>
            (viewableCalendarsState.unwrap()[0].get(event.calendar_id) ??
              true) &&
            event.startDate >= startDate.getTime() &&
            event.endDate >= startDate.getTime() &&
            event.startDate <= lastDayOfTheWeek.getTime() &&
            event.endDate <= lastDayOfTheWeek.getTime(),
        )
        .then((filteredValue) => {
          setEvents(filteredValue);
          displayedEventsCtx.map(([, setEvents]) => setEvents(filteredValue));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    storages,
    listeners.eventsStorageListener,
    startDate,
    viewableCalendarsState,
  ]);

  const [hourlyCalendarPredominance, setHourlyPredominance] = useState<
    Map<number, string>
  >(new Map());
  useEffect(() => {
    const initial = new Map(
      Array.from(new Array(24)).map(
        (_, index) => [index, new Map<string, number>()] as const,
      ),
    );
    events.forEach((event) => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      const startDateHour = startDate.getHours();
      const endDateHour = endDate.getHours();

      for (let hour = startDateHour; hour <= endDateHour; hour++) {
        const hourCalendarsMap = initial.get(hour);
        const eventsInTheCalendar =
          hourCalendarsMap?.get(event.calendar_id) ?? 0;
        hourCalendarsMap?.set(event.calendar_id, eventsInTheCalendar + 1);

        initial.set(hour, hourCalendarsMap ?? new Map());
      }
    });

    (async () => {
      const hourlyPredominance = new Map<number, string>();
      for (const [key, value] of initial.entries()) {
        if (value.size === 0) continue;
        const [predominantCalendarId] = Array.from(value.entries()).reduce(
          (acc, value) => (value[1] > acc[1] ? value : acc),
        );
        const calendarName = await storages
          .map(({ calendarsStorage }) =>
            calendarsStorage.findById(predominantCalendarId),
          )

          .map(async (value) => (await value).map((calendar) => calendar.name))
          .asyncFlatten();

        calendarName.map((calendarName) =>
          hourlyPredominance.set(key, calendarName),
        );
      }

      setHourlyPredominance(hourlyPredominance);
    })();
  }, [events]);

  const weekEventsByDay = useMemo(() => {
    const initial: CalendarEvent[][] = [[], [], [], [], [], [], []];
    return events.reduce((acc, event) => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      if (startDate.getDay() != endDate.getDay()) {
        acc.at(startDate.getDay())?.push(event);
        acc.at(endDate.getDay())?.push(event);
        return acc;
      }

      acc.at(startDate.getDay())?.push(event);
      return acc;
    }, initial);
  }, [events]);

  const memoedRange = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((value) => {
        const date = new Date(startDate.getTime() + value * 24 * 3600 * 1000);
        const dateNow = new Date(Date.now());
        dateNow.setHours(0, 0, 0, 0);
        return {
          dayOfWeek: (date.getDay() + 1) as ViewSize,
          day: date.getDate(),
          dayInMilliseconds: date.getTime(),
          isToday: date.getTime() === dateNow.getTime(),
          dateAtMidNight: date,
        };
      }),
    [startDate],
  );

  const allSelectedEvents = useContext(SelectedEvents);
  const allSelectedEventsRefs = useContext(SelectedRefs);
  const { setActiveForm: setForm } = useFormHandler();

  return (
    <>
      <FlexibleView
        selectEvent={(a) => {
          a.map((calendarEvent) => {
            allSelectedEvents.map((eventsSelected) =>
              eventsSelected[1](new Map()),
            );
            allSelectedEventsRefs.map((refs) => refs[1](new Map()));
            setForm("updateEvent", calendarEvent);
          });
        }}
        style={style}
        days={memoedRange.map(({ dayOfWeek, ...rest }) => ({
          ...rest,
          dayOfWeek,
          events: weekEventsByDay
            ? weekEventsByDay.at(dayOfWeek - 1) ?? []
            : [],
        }))}
        id={CALENDAR_WEEK_CONTAINER_ID}
      >
        <div className="col-start-1 relative w-[4rem] h-full z-[5000]">
          <DayViewContent.Background
            hourContent={({ hour }) => (
              <div className="px-1 py-1 max-w-[4rem] h-full text-text-primary truncate">
                {hourlyCalendarPredominance.get(hour - 1)}
              </div>
            )}
            header={
              <div className="inline-flex row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-neutral-600 justify-center items-center top-0 shadow-lg border-[1px] border-neutral-200 group">
                <span className="font-semibold bg-background text-xs invisible group-hover:visible absolute top-full left-[10%] z-[5000] inline-block rounded-md border border-primary-500 text-text-inverse bg-primary-500 p-2 flex flex-col gap-1">
                  <CircleHelp size={16}></CircleHelp>
                  Calendarios com mais eventos em cada hora
                </span>
                <ChartNoAxesCombined size={24} />
              </div>
            }
          />
        </div>
        <Selection />
      </FlexibleView>
      <ActionHeader />
    </>
  );
};

export default CalendarEditorWeek;
