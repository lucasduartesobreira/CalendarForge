import {
  ActionSelected,
  SelectedEvents,
  SelectedRefs,
} from "@/components/calendar-editor-week-view/contexts";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent, EventColors } from "@/services/events/events";
import * as O from "@/utils/option";
import { HTMLDivExtended } from "@/utils/types";
import {
  JSXElementConstructor,
  MutableRefObject,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

export const DAY_HEADER_HEIGHT = 48;
export const HOUR_BLOCK_HEIGHT = 64;
export const HOUR_DIVISION = 4;
export const MINUTES_OF_A_DIVISION = 60 / HOUR_DIVISION;

const calcOffset = (
  hour: number,
  minute: number,
  rounder: (arg0: number) => number,
) =>
  DAY_HEADER_HEIGHT +
  hour * HOUR_BLOCK_HEIGHT +
  rounder(minute / MINUTES_OF_A_DIVISION) * (HOUR_BLOCK_HEIGHT / HOUR_DIVISION);

export const startAndHeight = (startDate: Date, endDate: Date, day: number) => {
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

export const FakeEvents = ({
  day,
  events,
}: {
  day: number;
  events: CalendarEvent[];
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
            setSelectedEvent={() => {}}
            key={event.id}
          />
        );
      })}
    </>
  );
};

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
  blockedRef,
}: {
  onDrag: () => void;
  onDragEnd: () => void;
  blockedRef: O.Option<MutableRefObject<any>>;
}) => {
  const [timeout, setTout] = useState<O.Option<number>>(O.None());
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown: DivType["onMouseDown"] = (e) => {
    const isChild = blockedRef.map(
      (ref) => ref.current != null && !ref.current.contains(e.target),
    );
    if (isChild.unwrapOrElse(() => true)) {
      document.body.style.cursor = "move";
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
          document.body.style.cursor = "";
        },
        { once: true },
      );
      setTout(
        O.Some(
          window.setTimeout(() => {
            setTout(O.None());
            setIsDragging(true);
            onDrag();
          }, 400),
        ),
      );
    }
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

export const computeMousePosition = (
  y: number,
  container?: HTMLElement | null,
  offset: number = -DAY_HEADER_HEIGHT,
) => {
  const scrolled = container?.scrollTop ?? 0;
  const toTop = container?.getBoundingClientRect().top ?? 0;
  return y + scrolled - toTop + offset;
};

const relativePositionToHour = (
  position: number,
  withDayHeader: boolean = true,
) => {
  const hoursAndMinutes =
    (position - (withDayHeader ? DAY_HEADER_HEIGHT : 0)) / HOUR_BLOCK_HEIGHT;
  const hours = Math.floor(hoursAndMinutes);
  const minutes = Math.round((hoursAndMinutes - hours) * 60);

  return [hours, minutes];
};

const useResetSelection = () => {
  const selectedEventsCtx = useContext(SelectedEvents);
  const selectedEventsRef = useContext(SelectedRefs);

  const removeSelected = useMemo(
    () => () => {
      selectedEventsCtx
        .map(([, setSelectedEvents]) =>
          selectedEventsRef.map(([, setSelectedRefs]) => ({
            setSelectedRefs,
            setSelectedEvents,
          })),
        )
        .flatten()
        .map(({ setSelectedRefs, setSelectedEvents }) => {
          setSelectedEvents(() => {
            return new Map();
          });
          setSelectedRefs(() => {
            return new Map();
          });
        });
    },
    [selectedEventsRef, selectedEventsCtx],
  );

  return removeSelected;
};

const useResize = ({ event, day }: { event: CalendarEvent; day: number }) => {
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
        document.body.style.cursor = "grabbing";
        const container = document.getElementById("calendar-week-container");
        const pointerPosition = computeMousePosition(e.clientY, container, 0);
        const minBottom = Math.max(
          top + HOUR_BLOCK_HEIGHT / HOUR_DIVISION,
          pointerPosition,
        );
        const [hours, minutes] = relativePositionToHour(minBottom);

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
        const [hours, minutes] = relativePositionToHour(bottom);

        const newEndDate = new Date(endDate);
        newEndDate.setHours(hours);
        newEndDate.setMinutes(minutes);
        eventsStorage.update(event.id, { endDate: newEndDate.getTime() });
      });
      setResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      document.body.style.cursor = "";
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

  const cursorMode = useMemo(
    () =>
      twMerge(
        "absolute h-[8px] bottom-0 w-full left-1/2 -translate-x-1/2",
        isResizing ? "focus:cursor-grabbing" : "cursor-grab",
      ),
    [isResizing],
  );

  const removeSelected = useResetSelection();

  const ResizeDiv = useMemo(() => {
    const Component = () => {
      return (
        <div
          className={cursorMode}
          onMouseDown={() => {
            setResizing(true);
            removeSelected();
          }}
        />
      );
    };
    return Component;
  }, [cursorMode]);

  return [
    isResizing,
    Math.abs(top - bottom),
    ...[endDate.getDate() === day ? ResizeDiv : undefined],
  ] as const;
};

const useSelected = (
  event: CalendarEvent,
  onMouseUp: DivType["onMouseUp"],
  state: "dragging" | "resizing" | "normal",
) => {
  const selectedEventsCtx = useContext(SelectedEvents);
  const selectedRefsCtx = useContext(SelectedRefs);
  const [, setSelectedAction] = useContext(ActionSelected);

  const compRef: DivType["ref"] = useRef(null);
  const dragAndSelectHandler: DivType["onMouseUp"] = (mouseEvent) => {
    if (state !== "normal") {
      return;
    }

    selectedEventsCtx
      .flatMap((selectedEvents) =>
        selectedRefsCtx.map(
          (selectedRefs) => [selectedEvents, selectedRefs] as const,
        ),
      )
      .map(
        ([[selectedEvents, setSelected], [selectedRefs, setSelectedRefs]]) => {
          if (mouseEvent.ctrlKey) {
            if (selectedEvents.has(event.id)) {
              selectedEvents.delete(event.id);
              selectedRefs.delete(event.id);
            } else {
              selectedEvents.set(event.id, event);
              selectedRefs.set(event.id, compRef);
            }

            setSelected(selectedEvents);
            setSelectedRefs(selectedRefs);
            setSelectedAction(O.None());
          } else {
            selectedEvents.clear();
            selectedRefs.clear();
            setSelected(selectedEvents.set(event.id, event));
            setSelectedRefs(selectedRefs.set(event.id, compRef));
            setSelectedAction(O.None());
          }

          return selectedEvents;
        },
      );

    onMouseUp?.(mouseEvent);
  };

  return { dragAndSelectHandler, compRef };
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

  const [Checkbox, completedTask, ref] = TaskCompleteCheckboxFactory(
    false,
    event.task_id,
  );

  const { isDragging, onMouseUp, ...dragAndDropHandlers } = useDragAndDrop({
    onDrag: () => {
      setDragged(O.Some(event));
    },
    onDragEnd: () => {
      setDragged(O.None());
    },
    blockedRef: ref != null ? O.Some(ref) : O.None(),
  });

  const [isResizing, newHeight, ResizeDiv] = useResize({ event, day });
  const { dragAndSelectHandler, compRef } = useSelected(
    event,
    onMouseUp,
    isResizing ? "resizing" : isDragging ? "dragging" : "normal",
  );

  return (
    <ShowCalendarEvent
      event={event}
      conflicts={conflicts}
      day={day}
      index={index}
      setSelectedEvent={setSelectedEvent}
      key={event.id}
      style={{
        opacity: isDragging ? 0.3 : undefined,
        ...(isResizing ? { height: newHeight } : {}),
      }}
      TaskCompleteCheckbox={Checkbox}
      ResizeDiv={ResizeDiv}
      completed={completedTask}
      onMouseUp={dragAndSelectHandler}
      componentRef={compRef}
      {...dragAndDropHandlers}
    />
  );
};

const TaskCompleteCheckboxFactory = (
  locked: boolean,
  taskId: string | undefined,
) => {
  const { storages, listeners } = useContext(StorageContext);
  const [completed, setCompleted] = useState<boolean>();
  const [controller, setController] = useReducer(
    (
      state: { stage: number; value: undefined | boolean },
      action:
        | { type: "start_fetching" }
        | { type: "finish_fetching"; value: boolean }
        | { type: "allow_update" },
    ) => {
      const { type } = action;
      const { stage, value } = state;
      if (type === "start_fetching" && stage === -1) {
        return { stage: 0, value: undefined };
      }
      if (type === "finish_fetching" && stage === 0) {
        const { value: actionValue } = action;
        return { stage: 1, value: actionValue };
      }
      if (type === "allow_update" && stage === 1) {
        return { stage: 2, value };
      }

      return state;
    },
    { stage: -1, value: undefined },
  );

  useEffect(() => {
    if (taskId == null) return;

    if (controller.stage === 2) {
      storages.map(({ tasksStorage }) => {
        tasksStorage.update(taskId, { completed: completed });
      });
    }

    if (controller.stage === 1 && completed === controller.value) {
      setController({ type: "allow_update" });
    }
  }, [taskId, completed, controller.value]);

  useEffect(() => {
    if (taskId == null) return;

    storages.map(({ tasksStorage }) =>
      tasksStorage
        .findById(taskId)
        .then((found) => found.map((task) => setCompleted(task.completed))),
    );
  }, [taskId, storages, listeners.tasksStorageListener]);

  useEffect(() => {
    if (taskId == null) return;

    storages.map(({ tasksStorage }) => {
      setController({ type: "start_fetching" });
      tasksStorage.findById(taskId).then((found) => {
        found.map((task) => {
          setCompleted(task.completed);
          setController({
            type: "finish_fetching",
            value: task.completed ?? false,
          });
        });
      });
    });
  }, [taskId, storages]);

  const ref = useRef(null);

  return useMemo(() => {
    if (taskId != null) {
      const CreateComponent = ({
        backgroundColor,
      }: {
        backgroundColor: string;
      }) => {
        return (
          <input
            ref={ref}
            className={`align-center ml-auto mr-1 appearance-none w-[16px] h-[16px] border-2 border-gray-300 rounded-full ${backgroundColor} checked:bg-blue-500 checked:border-transparent focus:outline-none`}
            type="checkbox"
            checked={completed}
            onChange={() => {
              setCompleted(!completed);
            }}
            disabled={locked}
          />
        );
      };
      return [CreateComponent, completed, ref] as const;
    }
    return [undefined, undefined, undefined];
  }, [taskId, completed, locked]);
};

const backgroundColor = {
  "#003f5c": "bg-[#003f5c]",
  "#374c80": "bg-[#374c80]",
  "#7a5195": "bg-[#7a5195]",
  "#bc5090": "bg-[#bc5090]",
  "#ef5675": "bg-[#ef5675]",
  "#ff764a": "bg-[#ff764a]",
  "#ffa600": "bg-[#ffa600]",
} satisfies {
  [Key in (typeof EventColors)[number]]: `bg-[${Key}]`;
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
  TaskCompleteCheckbox,
  completed,
  componentRef,
  ...props
}: HTMLDivExtended<
  HTMLDivElement,
  {
    event: CalendarEvent;
    conflicts: Map<string, number>;
    day: number;
    index: number;
    setSelectedEvent: (value: O.Option<CalendarEvent>) => void;
    TaskCompleteCheckbox?: JSXElementConstructor<{ backgroundColor: string }>;
    completed?: boolean;
    ResizeDiv?: JSXElementConstructor<{}>;
    componentRef?: DivType["ref"];
  }
>) => {
  const conflictNumber = conflicts.get(event.id);
  const left = 10 * (conflictNumber ?? 0);
  const width = 100 / (conflictNumber ?? 1) - left;
  const eventColor = event.color ?? "#7a5195";

  return (
    <div
      {...props}
      ref={componentRef}
      className={`${className ?? ""} ${
        backgroundColor[eventColor]
      } absolute w-full flex p-1 rounded-md absolute bottom-0 justify-start items-start`}
      style={{
        ...startAndHeight(
          new Date(event.startDate),
          new Date(event.endDate),
          day,
        ),
        width: `${width}%`,
        left: `${left}%`,
        zIndex: `${index}`,
        borderWidth: conflictNumber ? 1 : 0,
        ...style,
        opacity: completed ? 0.7 : style?.opacity,
      }}
    >
      <div
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        className="flex w-full h-full items-start"
      >
        <button
          key={event.id}
          onClick={() => {
            setSelectedEvent(O.Some(event));
          }}
          className="text-xs select-none"
        >
          {event.title}
        </button>
        {event.task_id && TaskCompleteCheckbox != null && (
          <TaskCompleteCheckbox backgroundColor={backgroundColor[eventColor]} />
        )}
      </div>
      {ResizeDiv && <ResizeDiv />}
    </div>
  );
};
