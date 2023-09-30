import OutsideClick from "@/components/utils/outsideClick";
import { CalendarEvent } from "@/services/events/events";
import { Todo } from "@/services/todo/todo";
import { getHTMLDateTime } from "@/utils/date";
import { idGenerator } from "@/utils/idGenerator";
import { None, Option, Some } from "@/utils/option";
import { AddValue } from "@/utils/storage";
import { useEffect, useState } from "react";
type Props<A = {}> = {
  todo: AddValue<Todo>;
  onSubmit: (value: AddValue<Todo>, event: Option<CalendarEvent>) => void;
  event: Option<CalendarEvent>;
} & A;

export function TodoForm({
  todo: initialTodo,
  onSubmit,
  event: initialEvent,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [todo, setTodo] = useState(initialTodo);
  const eventState = useState(initialEvent);
  useEffect(() => console.log(eventState[0]), [eventState[0]]);

  return (
    <>
      {expanded ? (
        <ExpandedTodo
          todoState={[todo, setTodo]}
          eventState={eventState}
          colapse={() => setExpanded(false)}
          onSubmit={onSubmit}
        />
      ) : (
        <div onClick={() => setExpanded(true)}>{todo.title}</div>
      )}
    </>
  );
}

function ExpandedTodo({
  colapse,
  todoState: [todo, setTodo],
  eventState: [event, setEvent],
  onSubmit,
}: {
  colapse: () => void;
  todoState: [
    AddValue<Todo>,
    React.Dispatch<React.SetStateAction<AddValue<Todo>>>,
  ];
  eventState: [
    Option<CalendarEvent>,
    React.Dispatch<React.SetStateAction<Option<CalendarEvent>>>,
  ];
  onSubmit: (todo: AddValue<Todo>, event: Option<CalendarEvent>) => void;
}) {
  return (
    <OutsideClick
      refs={None()}
      doSomething={() => {
        onSubmit(todo, event);
        colapse();
      }}
    >
      <div className="flex flex-col">
        <input
          value={todo.title}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setTodo((todo) => {
              return { ...todo, title: value };
            });
            setEvent((event) =>
              event.map((event) => ({ ...event, title: value })),
            );
          }}
        />
        <input
          type="datetime-local"
          value={event
            .map<string | undefined>(({ startDate }) =>
              getHTMLDateTime(new Date(startDate)),
            )
            .unwrapOrElse(() => undefined)}
          onChange={(e) => {
            const date = new Date(e.currentTarget.value);
            if (date != null) {
              const updatedEvent = event
                .map((event) => Some({ ...event, startDate: date.getTime() }))
                .unwrapOrElse(() =>
                  Some({
                    title: todo.title,
                    calendar_id: todo.calendar_id,
                    color: "#7a5195",
                    description: "",
                    notifications: [],
                    id: idGenerator(),
                    endDate: Date.now(),
                    startDate: date.getTime(),
                  }),
                );
              setEvent(updatedEvent);
            }
          }}
        />
        <input
          type="datetime-local"
          value={event
            .map<string | undefined>(({ endDate }) =>
              getHTMLDateTime(new Date(endDate)),
            )
            .unwrapOrElse(() => undefined)}
          onChange={(e) => {
            const date = new Date(e.currentTarget.value);
            if (date != null) {
              const updatedEvent = event
                .map((event) => Some({ ...event, endDate: date.getTime() }))
                .unwrapOrElse(() =>
                  Some({
                    title: todo.title,
                    calendar_id: todo.calendar_id,
                    color: "#7a5195",
                    description: "",
                    notifications: [],
                    id: "",
                    startDate: Date.now(),
                    endDate: date.getTime(),
                  }),
                );
              setEvent(updatedEvent);
            }
          }}
        />
      </div>
    </OutsideClick>
  );
}
