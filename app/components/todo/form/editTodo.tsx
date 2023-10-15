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
        <div onClick={() => setExpanded(true)} className="px-2 py-1">
          {todo.title}
        </div>
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
      <div className="flex flex-col px-2 py-1 border-[1px] border-text-primary rounded-md ">
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
          className="bg-neutral-200 text-center"
        />
        <label className="flex flex-nowrap gap-1 justify-start">
          <a>Start</a>
          <input
            type="datetime-local"
            className="ml-auto bg-neutral-200"
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
        </label>
        <label className="flex flex-nowrap gap-1 justify-start">
          <a>End</a>
          <input
            type="datetime-local"
            className="ml-auto bg-neutral-200"
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
        </label>
      </div>
    </OutsideClick>
  );
}
