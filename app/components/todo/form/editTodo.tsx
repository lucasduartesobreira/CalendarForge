import OutsideClick from "@/components/utils/outsideClick";
import { CalendarEvent } from "@/services/events/events";
import { Todo } from "@/services/todo/todo";
import { getHTMLDateTime } from "@/utils/date";
import { None, Option } from "@/utils/option";
import { AddValue } from "@/utils/storage";
import { useState } from "react";
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
  const [event, setEvent] = useState(initialEvent);

  return (
    <>
      {expanded ? (
        <ExpandedTodo
          todoState={[todo, setTodo]}
          eventState={[event, setEvent]}
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
            const date = e.currentTarget.valueAsDate;
            if (date != null) {
              setEvent((event) =>
                event.map((event) => ({ ...event, startDate: date.getTime() })),
              );
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
            const date = e.currentTarget.valueAsDate;
            if (date != null) {
              setEvent((event) =>
                event.map((event) => ({ ...event, endDate: date.getTime() })),
              );
            }
          }}
        />
      </div>
    </OutsideClick>
  );
}
