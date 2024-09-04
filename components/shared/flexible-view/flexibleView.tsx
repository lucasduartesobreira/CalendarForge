import { CalendarEvent, CreateEvent } from "@/services/events/events";
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
import {
  DAY_HEADER_HEIGHT,
  DraggedEvent,
  HOUR_BLOCK_HEIGHT,
  HOUR_DIVISION,
  ShowCalendarEvent,
  computeMousePosition,
  startAndHeight,
} from "../day-view/dayEventsContent";
import { CreateEventFormOpenCtx } from "@/components/event-create-form/createEvent";

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

  if (!weekGridClasses.at(days.length - 1)) {
    days.splice(weekGridClasses.length, days.length - weekGridClasses.length);
  }

  const hasChildren = children != null ? 1 : 0;

  const weekGridClass = weekGridClasses.at(days.length + hasChildren - 1);
  const [dragged] = useContext(DraggedEvent);

  const [creatingEventForm, setCreateEventFormOpen] = useContext(
    CreateEventFormOpenCtx,
  );

  const [createNewEventData, setCreatingNewEvent] = useState<
    O.Option<Pick<CreateEvent, "startDate" | "endDate"> & { day: number }>
  >(O.None());
  const [push, setPush] = useState(false);

  useEffect(() => {
    if (push) {
      setCreateEventFormOpen(createNewEventData);
      setPush(false);
    }
  }, [push]);

  useEffect(() => {
    setCreatingNewEvent(
      creatingEventForm.map((form) => ({
        startDate: form.startDate ?? -1,
        endDate: form.endDate ?? -1,
        day: new Date(form.startDate ?? -1).getTime(),
      })),
    );
  }, [creatingEventForm]);

  type EventListenerFN<K extends keyof WindowEventMap> = Parameters<
    typeof window.addEventListener<K>
  >[1];

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
              onMouseDown={(hour, quarter) => {
                if (creatingEventForm.isSome()) return;

                const start =
                  dayInMilliseconds +
                  hour * 60 * 60 * 1000 +
                  quarter * 15 * 60 * 1000;

                const end = start + 3600 * 1000;
                setCreatingNewEvent(
                  O.Some({ startDate: start, endDate: end, day: day }),
                );

                const mouseMove: EventListenerFN<"mousemove"> = (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const container = document.getElementById(
                    "calendar-week-container",
                  );
                  if (container == null) return;

                  const relativePositionToHour = (
                    position: number,
                    withDayHeader: boolean = true,
                  ) => {
                    const hoursAndMinutes =
                      (position - (withDayHeader ? DAY_HEADER_HEIGHT : 0)) /
                      HOUR_BLOCK_HEIGHT;
                    const hours = Math.floor(hoursAndMinutes);
                    const minutes = Math.ceil(
                      ((hoursAndMinutes - hours) * 60) / (60 / HOUR_DIVISION),
                    );

                    return [hours, minutes];
                  };

                  const { top } = startAndHeight(
                    new Date(start),
                    new Date(end),
                    day,
                  );
                  const pointerPosition = computeMousePosition(
                    e.clientY,
                    container,
                    0,
                  );

                  const minBottom = Math.max(
                    top + HOUR_BLOCK_HEIGHT / HOUR_DIVISION,
                    pointerPosition,
                  );
                  const [hours, minutes] = relativePositionToHour(minBottom);

                  const newEnd = new Date(end).setHours(
                    hours,
                    minutes * 15,
                    0,
                    0,
                  );

                  setCreatingNewEvent((eventData) =>
                    eventData.mapOrElse(
                      () => O.Some({ startDate: start, endDate: newEnd, day }),
                      ({ startDate, day }) =>
                        O.Some({
                          startDate: startDate,
                          endDate: newEnd,
                          day,
                        }),
                    ),
                  );
                };
                const mouseUp: EventListenerFN<"mouseup"> = () => {
                  window.removeEventListener("mousemove", mouseMove);
                  window.removeEventListener("mouseup", mouseUp);

                  setPush(true);
                };

                window.addEventListener("mousemove", mouseMove);
                window.addEventListener("mouseup", mouseUp);
              }}
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
              ({ startDate, endDate }) => {
                if (new Date(startDate).getDay() === dayOfWeek - 1)
                  return (
                    <ShowCalendarEvent
                      event={{
                        title: "",
                        id: "",
                        color: "#7a5195",
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
