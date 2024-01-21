"use client";

import { RefObject, useContext, useEffect, useState } from "react";
import {
  ActionSelected,
  SelectedEvents,
  SelectedRefs,
} from "../calendar-editor-week-view/contexts";
import { CalendarEvent } from "@/services/events/events";
import { Button } from "../shared/button-view/buttons";
import { StorageContext } from "@/hooks/dataHook";
import { Some } from "@/utils/option";

export const Selection = () => {
  const selectedRefs = useContext(SelectedRefs);
  const [actionsSelected] = useContext(ActionSelected);
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
  const RecurringActionComponent = RecurringAction();

  if (
    dimensions.x_start < Number.MAX_SAFE_INTEGER &&
    dimensions.x_end > Number.MIN_SAFE_INTEGER &&
    dimensions.y_start < Number.MAX_SAFE_INTEGER &&
    dimensions.y_end > Number.MIN_SAFE_INTEGER
  )
    return (
      <div
        className="bg-transparent border-2 border-dashed border-primary-400 absolute pointer-events-none rounded-lg z-[30000]"
        style={{
          top: dimensions.y_start - 4,
          left: dimensions.x_start - 4,
          width: Math.abs(dimensions.x_end - dimensions.x_start) + 4 + 4,
          height: Math.abs(dimensions.y_start - dimensions.y_end) + 4 + 4,
        }}
      >
        {!actionsSelected.isSome() && (
          <div className="absolute -translate-y-[42px] min-h-fit flex gap-2">
            <DuplicateActionComponent />
            <DeleteActionComponent />
            <SwapActionComponent />
            <MakeTemplateActionComponent />
            <ToggleTaskEventActionComponent />
            <RecurringActionComponent />
          </div>
        )}
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
  private _deselect: boolean = true;

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

  deselect(value: boolean = false) {
    this._deselect = value;
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
                    if (this._deselect) {
                      refSet(new Map());
                      eventSet(new Map());
                    }
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

const RecurringAction = () => {
  const [, setSelectedAction] = useContext(ActionSelected);
  return new ButtonBuilder()
    .visible((selectedEvents) => selectedEvents.size === 1)
    .text("Recurring")
    .action((events) => {
      const [[, event]] = events.entries();

      setSelectedAction(Some({ type: "recurring", selected: event }));
    })
    .deselect()
    .build();
};
