import { JSXElementConstructor, useContext } from "react";
import {
  ActionSelected,
  ActionSelectedTypes,
  SelectedEvents,
} from "../calendar-editor-week-view/contexts";
import { CalendarEvent } from "@/services/events/events";
import { twMerge } from "tailwind-merge";

export const ActionHeader = () => {
  const actionHeader = useContext(ActionSelected);
  const selectedEvents = useContext(SelectedEvents);
  return actionHeader[0]
    .flatMap((header) =>
      selectedEvents.map(
        ([selectedEvents]) => [header, selectedEvents] as const,
      ),
    )
    .mapOrElse(
      () => null,
      ([header, selectedEvents]) => {
        const ActionComponent = actionsComponent[header];
        return (
          <div className="text-text-primary rounded-xl shadow-xl h-[48px] absolute top-[80px] left-1/2 -translate-y-1/2 -translate-x-1/2 z-[40000] bg-white flex items-center text-center justify-center">
            {/*
             *<a className="h-full px-2 py-1 text-center inline-flex items-center align-middle">
             *  Something
             *</a>
             */}
            <ActionComponent
              className="px-2 py-1"
              selectedEvents={selectedEvents}
            />
          </div>
        );
      },
    );
};

type ActionsComponent = {
  [Key in (typeof ActionSelectedTypes)[number]]: JSXElementConstructor<{
    className: string;
    selectedEvents: Map<CalendarEvent["id"], CalendarEvent>;
  }>;
};

const RecurringActionHeader: ActionsComponent["recurring"] = ({
  className,
  selectedEvents,
}) => {
  if (selectedEvents.size !== 1) {
    return <div>Recurring</div>;
  }
  const [[eventId, event]] = selectedEvents.entries();
  return <div className={twMerge("text-sm", className)}>{event.title}</div>;
};

const actionsComponent = {
  spacing: ({ className }) => {
    return <div>Spacing</div>;
  },
  recurring: RecurringActionHeader,
} satisfies ActionsComponent;
