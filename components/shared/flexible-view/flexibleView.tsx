import { CalendarEvent, EventColors } from "@/services/events/events";
import * as O from "@/utils/option";
import {
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DayViewContent } from "../day-view/dayContent";
import { DayDropZone } from "../day-view/dayBackground";
import { DraggedEvent, ShowCalendarEvent } from "../day-view/dayEventsContent";
import { useSelectHours } from "./useSelectHourHook";
import { useEventRecorder } from "@/components/calendar-header-view/useEventRecorder";
import { useFormHandler } from "@/components/form-handler/formHandler";

export const AcceptedDaysValue = [1, 2, 3, 4, 5, 6, 7] as const;
export type ViewSize = (typeof AcceptedDaysValue)[number];

const weekGridClasses = [
  "grid-cols-[50px_repeat(1,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(2,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(3,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(4,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(5,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(6,minmax(128px,1fr))]",
  "grid-cols-[50px_repeat(7,minmax(128px,1fr))]",
  "grid-cols-[auto_50px_repeat(7,minmax(128px,1fr))]",
] as const;

export const FlexibleView = ({
  days,
  selectEvent: setSelectedEvent,
  style,
  id,
  children,
}: PropsWithChildren<{
  style: string;
  days: {
    events: CalendarEvent[];
    dayOfWeek: ViewSize;
    day: number;
    dayInMilliseconds: number;
    isToday: boolean;
    dateAtMidNight: Date;
    fakeEvents?: CalendarEvent[];
  }[];
  selectEvent: (value: O.Option<CalendarEvent>) => void;
  id: string;
}> & { children?: ReactNode | ReactNode[] }) => {
  useEffect(() => {
    const calendarWeekContainer = document.getElementById(id);
    if (calendarWeekContainer) {
      calendarWeekContainer.scrollTop = 512;
    }
  }, [id]);

  const [clientSide, setClientSide] = useState(false);

  useEffect(() => {
    setClientSide(true);
    return () => setClientSide(false);
  }, []);

  const { onMouseDownFactory, createNewEventData } = useSelectHours();

  if (!weekGridClasses.at(days.length - 1)) {
    days.splice(weekGridClasses.length, days.length - weekGridClasses.length);
  }

  const hasChildren = children != null ? 1 : 0;

  const weekGridClass = weekGridClasses.at(days.length + hasChildren - 1);
  const [dragged] = useContext(DraggedEvent);

  const [recordingEvent, setEventRecordingData] = useState<
    O.Option<{
      startDate: number;
      endDate: number;
      day: number;
      title?: string;
      color?: (typeof EventColors)[number];
    }>
  >(O.None());

  const { setActiveForm: setForm } = useFormHandler();

  useEventRecorder({
    onRecording: (recordingState) => {
      const { spentTimeInMilliseconds, startDate } = recordingState;

      recordingEvent.mapOrElse(
        () => {
          setEventRecordingData(
            O.Some({
              startDate,
              endDate: startDate + 60 * 1000,
              day: new Date().getDate(),
            }),
          );
        },
        ({ day }) => {
          if ((spentTimeInMilliseconds % 15) * 60 * 1000 === 0) {
            setEventRecordingData(
              O.Some({
                startDate,
                endDate: startDate + spentTimeInMilliseconds,
                day,
              }),
            );
          }
        },
      );
    },
    onSaving: (recordingState, dispatch) => {
      const { startDate, endDate } = recordingState;

      setForm(
        "createEvent",
        { startDate, endDate },
        O.None(),
        (event) => {
          setEventRecordingData((old) =>
            old.map((state) => ({ ...state, ...event })),
          );
        },
        () => {
          setEventRecordingData(O.None());
          dispatch({ type: "finish" });
        },
      );
    },
  });

  return (
    <div
      className={`${style} grid ${weekGridClass} grid-row-1 overflow-scroll relative`}
      id={id}
    >
      {children}
      <DayViewContent.HoursBackground column={0 + hasChildren} />
      {days.map(
        (
          {
            dayOfWeek,
            day,
            dayInMilliseconds,
            isToday,
            events,
            dateAtMidNight,
            fakeEvents,
          },
          index,
        ) => (
          <DayViewContent.DayContainer
            column={index + hasChildren}
            key={`${index}${dayOfWeek}${day}`}
          >
            <DayViewContent.DayBackground
              key={`${index + hasChildren}-background`}
              dayOfWeek={dayOfWeek}
              day={day}
              isToday={isToday}
              onMouseDown={(hour, quarter) =>
                onMouseDownFactory(hour, quarter, day, dayInMilliseconds)
              }
            />
            {clientSide && (
              <DayViewContent.DayEvents
                day={day}
                setSelectedEvent={setSelectedEvent}
                events={events}
              />
            )}
            {fakeEvents != null && (
              <DayViewContent.FakeEvents day={day} events={fakeEvents} />
            )}
            {dragged.isSome() && (
              <DayDropZone
                date={dateAtMidNight}
                day={day}
                dayOfWeek={dayOfWeek}
              />
            )}
            {createNewEventData.mapOrElse(
              () => null,
              ({ startDate, endDate, title, color }) => {
                if (new Date(startDate).getDay() === dayOfWeek - 1)
                  return (
                    <ShowCalendarEvent
                      event={{
                        title: title ?? "",
                        id: "",
                        color: color ?? "#7a5195",
                        startDate: startDate,
                        endDate: endDate,
                        description: "",
                        calendar_id: "",
                        notifications: [],
                      }}
                      conflicts={new Map()}
                      day={day}
                      index={0}
                      setSelectedEvent={() => {}}
                    />
                  );

                return null;
              },
            )}
            {recordingEvent.mapOrElse(
              () => null,
              ({ startDate, endDate, title, color }) => {
                if (new Date(startDate).getDay() === dayOfWeek - 1)
                  return (
                    <ShowCalendarEvent
                      event={{
                        title: title ?? "",
                        id: "",
                        color: color ?? "#7a5195",
                        startDate: startDate,
                        endDate: endDate,
                        description: "",
                        calendar_id: "",
                        notifications: [],
                      }}
                      conflicts={new Map()}
                      day={day}
                      index={0}
                      setSelectedEvent={() => {}}
                    />
                  );

                return null;
              },
            )}
          </DayViewContent.DayContainer>
        ),
      )}
    </div>
  );
};
