import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { HTMLDivExtended } from "@/utils/types";
import {
  JSXElementConstructor,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const DAY_HEADER_HEIGHT = 48;
const HOUR_BLOCK_HEIGHT = 64;
const HOUR_DIVISION = 4;
const MINUTES_OF_A_DIVISION = 60 / HOUR_DIVISION;

const calcOffset = (
  hour: number,
  minute: number,
  rounder: (arg0: number) => number,
) =>
  DAY_HEADER_HEIGHT +
  hour * HOUR_BLOCK_HEIGHT +
  rounder(minute / MINUTES_OF_A_DIVISION) * (HOUR_BLOCK_HEIGHT / HOUR_DIVISION);

const startAndHeight = (startDate: Date, endDate: Date, day: number) => {
  const startsSameDay = startDate.getDate() === day;

  const [startHour, startMinute] = startsSameDay
    ? [startDate.getHours(), startDate.getMinutes()]
    : [0, 0];

  const [endHour, endMinute] =
    startDate.getDate() - endDate.getDate() === 0
      ? [endDate.getHours(), endDate.getMinutes()]
      : startsSameDay
      ? [23, 59]
      : [endDate.getHours(), endDate.getMinutes()];

  const startPosition = calcOffset(startHour, startMinute, Math.floor);
  const endPosition = calcOffset(endHour, endMinute, Math.ceil);
  const diff = endPosition - startPosition;

  const height = diff;

  return { top: startPosition, height };
};

export const DraggedEvent = createContext<
  [O.Option<CalendarEvent>, (value: O.Option<CalendarEvent>) => void]
>([O.None(), () => {}]);

export const DayEvents = ({
  day,
  events,
  setSelectedEvent,
}: {
  day: number;
  events: CalendarEvent[];
  setSelectedEvent: (event: O.Option<CalendarEvent>) => void;
}) => {
  const eventsMap = events.sort((a, b) => a.startDate - b.startDate);
  const conflicts = events.reduce((acc, event, index, array) => {
    const toSearch = array.slice(index + 1);
    toSearch.forEach((possibleConflict) => {
      if (possibleConflict.startDate < event.endDate) {
        const zIndex = acc.get(possibleConflict.id);
        if (!zIndex) {
          acc.set(possibleConflict.id, 1);
        } else {
          acc.set(possibleConflict.id, zIndex + 1);
        }
      }
    });

    return acc;
  }, new Map<string, number>());

  return (
    <>
      {eventsMap.map((event, index) => {
        return (
          <DraggableCalendarEvent
            event={event}
            conflicts={conflicts}
            day={day}
            index={index}
            setSelectedEvent={setSelectedEvent}
            key={event.id}
          />
        );
      })}
    </>
  );
};

type DivType = HTMLDivExtended<HTMLDivElement>;
const useDragAndDrop = ({
  onDrag,
  onDragEnd,
}: {
  onDrag: () => void;
  onDragEnd: () => void;
}) => {
  const [timeout, setTout] = useState<O.Option<number>>(O.None());
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown: DivType["onMouseDown"] = () => {
    window.addEventListener(
      "mouseup",
      () => {
        timeout.map((id) => {
          window.clearTimeout(id);
        });
        if (isDragging) onDragEnd();
        setTout(O.None());
        setIsDragging(false);
        onDragEnd();
      },
      { once: true },
    );
    setTout(
      O.Some(
        window.setTimeout(() => {
          console.log("automatic dragging");
          setTout(O.None());
          setIsDragging(true);
          onDrag();
        }, 400),
      ),
    );
  };

  const _onMouseLeave: DivType["onMouseLeave"] = () => {
    timeout.map((id) => {
      window.clearTimeout(id);
      setTout(O.None());
      setIsDragging(true);
      onDrag();
    });
  };

  const onMouseUp: DivType["onMouseUp"] = () => {
    timeout.map((id) => {
      window.clearTimeout(id);
      if (isDragging) onDragEnd();
      setTout(O.None());
      setIsDragging(false);
    });
  };

  return {
    onMouseDown,
    onMouseLeave: _onMouseLeave,
    onMouseUp,
    isDragging,
  };
};

const computeMousePosition = (
  y: number,
  container?: HTMLElement | null,
  offset: number = -DAY_HEADER_HEIGHT,
) => {
  const scrolled = container?.scrollTop ?? 0;
  const toTop = container?.getBoundingClientRect().top ?? 0;
  return y + scrolled - toTop + offset;
};

const DraggableCalendarEvent = ({
  event,
  conflicts,
  day,
  index,
  setSelectedEvent,
}: {
  event: CalendarEvent;
  conflicts: Map<string, number>;
  day: number;
  index: number;
  setSelectedEvent: (value: O.Option<CalendarEvent>) => void;
}) => {
  const [, setDragged] = useContext(DraggedEvent);
  const { isDragging, ...dragAndDropHandlers } = useDragAndDrop({
    onDrag: () => {
      setDragged(O.Some(event));
    },
    onDragEnd: () => {
      setDragged(O.None());
    },
  });

  const startDate = useMemo(() => new Date(event.startDate), [event]);

  const endDate = useMemo(() => new Date(event.endDate), [event]);
  const { top } = useMemo(
    () => startAndHeight(startDate, endDate, day),
    [startDate, endDate, day],
  );

  const [isResizing, setResizing] = useState(false);
  const [bottom, setBottom] = useState(
    calcOffset(endDate.getHours(), endDate.getMinutes(), Math.ceil),
  );

  const onMouseMove = useMemo(
    () => (e: { clientY: number }) => {
      if (isResizing) {
        const container = document.getElementById("calendar-week-container");
        const pointerPosition = computeMousePosition(e.clientY, container, 0);
        const minBottom = Math.max(
          top + HOUR_BLOCK_HEIGHT / HOUR_DIVISION,
          pointerPosition,
        );
        const hoursAndMinutes =
          (minBottom - DAY_HEADER_HEIGHT) / HOUR_BLOCK_HEIGHT;
        const hours = Math.floor(hoursAndMinutes);
        const minutes = (hoursAndMinutes - hours) * 60;

        const newBottom = calcOffset(hours, minutes, Math.ceil);
        setBottom(newBottom);
      }
    },
    [isResizing, top],
  );

  const { storages } = useContext(StorageContext);

  const onMouseUp = useMemo(
    () => () => {
      storages.map(({ eventsStorage }) => {
        const hoursAndMinutes =
          (bottom - DAY_HEADER_HEIGHT) / HOUR_BLOCK_HEIGHT;
        const hours = Math.floor(hoursAndMinutes);
        const minutes = (hoursAndMinutes - hours) * 60;

        const newEndDate = new Date(endDate);
        newEndDate.setHours(hours);
        newEndDate.setMinutes(minutes);
        eventsStorage.update(event.id, { endDate: newEndDate.getTime() });
      });
      setResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
    },
    [onMouseMove, bottom, endDate, event.id, storages],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mouseup", onMouseUp, { once: true });
      window.addEventListener("mousemove", onMouseMove);
    }

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [onMouseUp, onMouseMove, isResizing]);

  return (
    <ShowCalendarEvent
      event={event}
      conflicts={conflicts}
      day={day}
      index={index}
      setSelectedEvent={setSelectedEvent}
      key={event.id}
      style={{
        opacity: isDragging ? 0.3 : 1,
        ...(isResizing ? { height: Math.abs(top - bottom) } : {}),
      }}
      ResizeDiv={
        startDate.getDay() - endDate.getDay() === 0
          ? () => (
              <div
                className="absolute h-[8px] bottom-0 w-full left-1/2 -translate-x-1/2"
                onMouseDown={() => {
                  console.log("mousedown");
                  setResizing(true);
                }}
              />
            )
          : () => null
      }
      {...dragAndDropHandlers}
    />
  );
};

export const ShowCalendarEvent = ({
  event,
  conflicts,
  day,
  index,
  setSelectedEvent,
  className,
  style,
  ResizeDiv,
  onMouseDown,
  onMouseLeave,
  onMouseUp,
  ...props
}: HTMLDivExtended<
  HTMLDivElement,
  {
    event: CalendarEvent;
    conflicts: Map<string, number>;
    day: number;
    index: number;
    setSelectedEvent: (value: O.Option<CalendarEvent>) => void;
    ResizeDiv?: JSXElementConstructor<{}>;
  }
>) => {
  const conflictNumber = conflicts.get(event.id);
  const left = 10 * (conflictNumber ?? 0);
  const width = 100 / (conflictNumber ?? 1) - left;

  return (
    <div
      {...props}
      className={`${className} absolute w-full flex p-1 rounded-md absolute bottom-0 justify-start items-start`}
      style={{
        ...startAndHeight(
          new Date(event.startDate),
          new Date(event.endDate),
          day,
        ),
        width: `${width}%`,
        left: `${left}%`,
        zIndex: `${index}`,
        backgroundColor: event.color ?? "#7a5195",
        borderWidth: conflictNumber ? 1 : 0,
        ...style,
      }}
    >
      <div
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        className="w-full h-full"
      >
        <button
          key={event.id}
          onClick={() => {
            setSelectedEvent(O.Some(event));
          }}
          className="text-xs align-top select-none"
        >
          {event.title}
        </button>
      </div>
      {ResizeDiv && <ResizeDiv />}
    </div>
  );
};
