import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import {
  PropsWithChildren,
  RefObject,
  useContext,
  useEffect,
  useState,
} from "react";
import { DayViewContent } from "../day-view/dayContent";
import { DayDropZone } from "../day-view/dayBackground";
import { DraggedEvent } from "../day-view/dayEventsContent";
import {
  SelectedEvents,
  SelectedRefs,
} from "@/components/calendar-editor-week-view/contexts";
import { Button } from "../button-view/buttons";
import { StorageContext } from "@/hooks/dataHook";

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
    isToday: boolean;
    dateAtMidNight: Date;
  }[];
  selectEvent: (value: O.Option<CalendarEvent>) => void;
  id: string;
}>) => {
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

  return (
    <div
      className={`${style} grid ${weekGridClass} grid-row-1 overflow-scroll relative`}
      id={id}
    >
      {children}
      <DayViewContent.HoursBackground column={0 + hasChildren} />
      {days.map(
        ({ dayOfWeek, day, isToday, events, dateAtMidNight }, index) => (
          <DayViewContent.DayContainer
            column={index + hasChildren}
            key={`${index}${dayOfWeek}${day}`}
          >
            <DayViewContent.DayBackground
              key={`${index + hasChildren}-background`}
              dayOfWeek={dayOfWeek}
              day={day}
              isToday={isToday}
            />
            {clientSide && (
              <DayViewContent.DayEvents
                day={day}
                setSelectedEvent={setSelectedEvent}
                events={events}
              />
            )}
            {dragged.isSome() && (
              <DayDropZone
                date={dateAtMidNight}
                day={day}
                dayOfWeek={dayOfWeek}
              />
            )}
          </DayViewContent.DayContainer>
        ),
      )}
      <Selection />
    </div>
  );
};

const Selection = () => {
  const selectedRefs = useContext(SelectedRefs);
  const [dimensions, setDimensions] = useState({
    x_start: Number.MAX_SAFE_INTEGER,
    x_end: Number.MIN_SAFE_INTEGER,
    y_start: Number.MAX_SAFE_INTEGER,
    y_end: Number.MIN_SAFE_INTEGER,
  });

  useEffect(() => {
    selectedRefs.map(([refs]) => {
      const container = document.getElementById("calendar-week-container");
      const containerBound = container?.getBoundingClientRect();
      if (containerBound == null) {
        return;
      }

      const containerLeftPadding = containerBound.left;
      const containerTopPadding = containerBound.top;
      const containerScroll = container?.scrollTop ?? 0;

      const { x_start, x_end, y_start, y_end } = Array.from(
        refs.values(),
      ).reduce(
        (acc, div) => {
          const currentBound = div.current?.getBoundingClientRect();
          if (currentBound == null) return acc;

          return {
            x_start:
              currentBound.left < acc.x_start ? currentBound.left : acc.x_start,
            x_end:
              currentBound.right > acc.x_end ? currentBound.right : acc.x_end,
            y_start:
              currentBound.top < acc.y_start ? currentBound.top : acc.y_start,
            y_end:
              currentBound.bottom > acc.y_end ? currentBound.bottom : acc.y_end,
          };
        },
        {
          x_start: Number.MAX_SAFE_INTEGER,
          x_end: Number.MIN_SAFE_INTEGER,
          y_start: Number.MAX_SAFE_INTEGER,
          y_end: Number.MIN_SAFE_INTEGER,
        },
      );

      setDimensions({
        x_start: x_start - containerLeftPadding,
        x_end: x_end - containerLeftPadding,
        y_start: y_start + containerScroll - containerTopPadding,
        y_end: y_end + containerScroll - containerTopPadding,
      });
    });
  }, [selectedRefs]);

  const DuplicateActionComponent = DuplicateAction();
  const DeleteActionComponent = DeleteAction();
  const SwapActionComponent = SwapAction();
  const MakeTemplateActionComponent = MakeTemplateAction();
  const ToggleTaskEventActionComponent = ToggleTaskEventAction();

  if (
    dimensions.x_start < Number.MAX_SAFE_INTEGER &&
    dimensions.x_end > Number.MIN_SAFE_INTEGER &&
    dimensions.y_start < Number.MAX_SAFE_INTEGER &&
    dimensions.y_end > Number.MIN_SAFE_INTEGER
  )
    return (
      <div
        className="bg-transparent border-2 border-dashed border-primary-400 absolute pointer-events-none rounded-lg"
        style={{
          top: dimensions.y_start - 4,
          left: dimensions.x_start - 4,
          width: Math.abs(dimensions.x_end - dimensions.x_start) + 4 + 4,
          height: Math.abs(dimensions.y_start - dimensions.y_end) + 4 + 4,
        }}
      >
        <div className="absolute -translate-y-[42px] min-h-fit flex gap-2">
          <DuplicateActionComponent />
          <DeleteActionComponent />
          <SwapActionComponent />
          <MakeTemplateActionComponent />
          <ToggleTaskEventActionComponent />
        </div>
      </div>
    );

  return null;
};

class ButtonBuilder {
  private _action: (
    selectedEvents: Map<CalendarEvent["id"], CalendarEvent>,
    selectedRefs: Map<CalendarEvent["id"], RefObject<HTMLDivElement>>,
  ) => void = () => {};
  private _text: string = "";
  private _isVisible: (
    selectedEvents: Map<CalendarEvent["id"], CalendarEvent>,
    selectedRefs: Map<CalendarEvent["id"], RefObject<HTMLDivElement>>,
  ) => boolean = () => true;

  action(
    a: (
      selectedEvents: Map<CalendarEvent["id"], CalendarEvent>,
      selectedRefs: Map<CalendarEvent["id"], RefObject<HTMLDivElement>>,
    ) => void,
  ) {
    this._action = a;

    return this;
  }

  text(text: string) {
    this._text = text;

    return this;
  }

  visible(value: boolean): ButtonBuilder;
  visible(
    value: (
      selectedEvents: Map<CalendarEvent["id"], CalendarEvent>,
      selectedRefs: Map<CalendarEvent["id"], RefObject<HTMLDivElement>>,
    ) => boolean,
  ): ButtonBuilder;
  visible(
    value:
      | ((
          selectedEvents: Map<CalendarEvent["id"], CalendarEvent>,
          selectedRefs: Map<CalendarEvent["id"], RefObject<HTMLDivElement>>,
        ) => boolean)
      | boolean,
  ) {
    this._isVisible = typeof value === "boolean" ? () => value : value;

    return this;
  }

  build() {
    const Component = () => {
      const selectedRefsCtx = useContext(SelectedRefs);
      const selectedEventsCtx = useContext(SelectedEvents);

      return selectedRefsCtx
        .flatMap(([refsState, refSet]) =>
          selectedEventsCtx.map(
            ([eventsState, eventSet]) =>
              [
                [refsState, eventsState],
                [refSet, eventSet],
              ] as const,
          ),
        )
        .mapOrElse(
          () => null,
          ([[selectedRefs, selectedEvents], [refSet, eventSet]]) => {
            if (this._isVisible(selectedEvents, selectedRefs)) {
              return (
                <Button.Tertiary
                  sizeType="md"
                  value={this._text}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    this._action(selectedEvents, selectedRefs);
                    refSet(new Map());
                    eventSet(new Map());
                  }}
                  className="pointer-events-auto px-2 py-1"
                />
              );
            }

            return null;
          },
        );
    };

    return Component;
  }
}

const DuplicateAction = () => {
  const { storages } = useContext(StorageContext);
  return new ButtonBuilder()
    .visible((selectedEvents) => selectedEvents.size === 1)
    .text("Duplicate")
    .action((events) => {
      storages.map(({ eventsStorage }) => {
        const [[, event]] = events.entries();
        const {
          id: _id,
          task_id: _task_id,
          recurring_id: _recurring_id,
          ...rest
        } = event;
        eventsStorage.add(rest);
      });
    })
    .build();
};
const DeleteAction = () => {
  const { storages } = useContext(StorageContext);
  return new ButtonBuilder()
    .visible((selectedEvents) => selectedEvents.size === 1)
    .text("Delete")
    .action((events) => {
      storages.map(({ eventsStorage }) => {
        const [[eventId]] = events.entries();
        eventsStorage.remove(eventId);
      });
    })
    .build();
};

const SwapAction = () => {
  const { storages } = useContext(StorageContext);
  return new ButtonBuilder()
    .visible((selectedEvents) => selectedEvents.size === 2)
    .text("Swap")
    .action((events) => {
      storages.map(async ({ eventsStorage }) => {
        const [[firstEventId, firstEvent], [secondEventId, secondEvent]] =
          events.entries();
        const { startDate: firstStartDate, endDate: firstEndDate } = firstEvent;
        const { startDate: secondStartDate, endDate: secondEndDate } =
          secondEvent;

        const bulk = eventsStorage.bulk([firstEvent, secondEvent]);

        bulk.update({
          id: firstEventId,
          startDate: secondStartDate,
          endDate: secondEndDate,
        });
        bulk.update({
          id: secondEventId,
          startDate: firstStartDate,
          endDate: firstEndDate,
        });

        bulk.commit();
      });
    })
    .build();
};

const MakeTemplateAction = () => {
  const { storages } = useContext(StorageContext);
  return new ButtonBuilder()
    .visible((selectedEvents) => selectedEvents.size === 1)
    .text("Template")
    .action((events) => {
      storages.map(async ({ eventsTemplateStorage }) => {
        const [[, event]] = events.entries();

        const {
          recurring_id,
          id,
          todo_id,
          task_id,
          startDate,
          endDate,
          ...rest
        } = event;

        eventsTemplateStorage.add(rest);
      });
    })
    .build();
};

const ToggleTaskEventAction = () => {
  const { storages } = useContext(StorageContext);
  return new ButtonBuilder()
    .visible((selectedEvents) => selectedEvents.size === 1)
    .text("Toggle")
    .action((events) => {
      storages.map(async ({ eventsStorage, tasksStorage }) => {
        const [[eventId, event]] = events.entries();
        if (event.task_id != null) {
          eventsStorage.update(eventId, { task_id: undefined });
        } else {
          tasksStorage
            .add({
              title: event.title,
              description: event.description,
              completed: false,
            })
            .then((addResult) =>
              addResult.map(({ id }) =>
                eventsStorage.update(eventId, { task_id: id }),
              ),
            );
        }
      });
    })
    .build();
};
