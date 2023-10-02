import { TodoForm } from "@/components/todo/form/editTodo";
import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import { Task } from "@/services/task/task";
import { Todo } from "@/services/todo/todo";
import { getHTMLDateTime } from "@/utils/date";
import { idGenerator } from "@/utils/idGenerator";
import { None, Option, Some } from "@/utils/option";
import { AddValue } from "@/utils/storage";
import { RefObject, useContext, useEffect, useReducer, useState } from "react";

export type LocalValue<A> = A & {
  TYPE_OPERATION: "CREATE" | "UPDATE" | "REMOVE";
};

type PropsFullPage<A> = {
  closeForm: () => void;
  initialForm: A;
  initialTodoList: Todo[];
  onSubmit: (
    task: A,
    todos: Array<{
      event: Option<LocalValue<CalendarEvent>>;
      todo: LocalValue<Todo>;
    }>,
  ) => void;
  refs: Option<RefObject<null>[]>;
};

const operationType = <A,>(prev: LocalValue<A>, next: LocalValue<A>) => {
  return prev.TYPE_OPERATION === "CREATE" ? "CREATE" : next.TYPE_OPERATION;
};

export function TaskForm<Props extends PropsFullPage<Task>>({
  refs,
  closeForm,
  onSubmit,
  initialForm,
  initialTodoList = [],
}: Props) {
  const { storages } = useContext(StorageContext);

  const [task, setTask] = useReducer(
    (
      state: Task,
      action:
        | { type: "changeTitle"; value: string }
        | { type: "changeDescription"; value: string }
        | { type: "changeStartDate"; value: Date }
        | { type: "changeEndDate"; value: Date },
    ) => {
      if (action.type === "changeTitle") {
        return { ...state, title: action.value };
      } else if (action.type === "changeDescription") {
        return { ...state, description: action.value };
      } else if (action.type === "changeStartDate") {
        return { ...state, startDate: action.value.getTime() };
      } else if (action.type === "changeEndDate") {
        return { ...state, endDate: action.value.getTime() };
      }
      return state;
    },
    initialForm,
  );

  const [todosAndEvents, setTodosAndEvents] = useReducer(
    (
      state: Map<
        Todo["id"],
        { event: Option<LocalValue<CalendarEvent>>; todo: LocalValue<Todo> }
      >,
      action:
        | {
            type: "add";
            value: AddValue<Todo>;
          }
        | {
            type: "update_event";
            value: {
              todoId: Todo["id"];
              event: Option<CalendarEvent>;
            };
          }
        | {
            type: "update_todo";
            value: Todo;
          }
        | {
            type: "remove";
            value: Todo["id"];
          },
    ) => {
      if (action.type === "add") {
        const todo = action.value;
        const id = idGenerator();
        state.set(id, {
          event: None(),
          todo: { ...todo, id, TYPE_OPERATION: "CREATE" },
        });
      } else if (action.type === "update_todo") {
        const todo = action.value;
        const found = state.get(todo.id);
        if (found) {
          const newOperationType = operationType(found.todo, {
            ...todo,
            TYPE_OPERATION: "UPDATE",
          });
          state.set(todo.id, {
            event: found.event,
            todo: { ...todo, TYPE_OPERATION: newOperationType },
          });
        }
      } else if (action.type === "update_event") {
        const { todoId, event } = action.value;
        const found = state.get(todoId);
        if (found) {
          const newUpdatedEvent = found.event
            .map((foundEvent) =>
              event.map((updatedEvent) => ({
                ...updatedEvent,
                TYPE_OPERATION: operationType(foundEvent, {
                  ...updatedEvent,
                  TYPE_OPERATION: "UPDATE",
                }),
              })),
            )
            .unwrapOrElse(() =>
              event.map((event) => ({ ...event, TYPE_OPERATION: "CREATE" })),
            );
          state.set(todoId, {
            event: newUpdatedEvent,
            todo: found.todo,
          });
        }
      } else if (action.type === "remove") {
        const found = state.get(action.value);
        if (found) {
          if (found.todo.TYPE_OPERATION !== "CREATE") {
            found.todo = {
              ...found.todo,
              TYPE_OPERATION: operationType(found.todo, {
                ...found.todo,
                TYPE_OPERATION: "REMOVE",
              }),
            };
            found.event = found.event.map((event) => ({
              ...event,
              TYPE_OPERATION: operationType(event, {
                ...event,
                TYPE_OPERATION: "REMOVE",
              }),
            }));
            state.set(action.value, found);
            return new Map(state);
          }

          state.delete(action.value);
        }
      }
      return new Map(state);
    },
    initialTodoList,
    (todos) => {
      return new Map(
        storages
          .map(({ eventsStorage }) => {
            return todos.map((todo) => {
              const event = eventsStorage
                .find(({ todo_id }) => todo_id != null && todo_id === todo.id)
                .map<LocalValue<CalendarEvent>>((event) => ({
                  ...event,
                  TYPE_OPERATION: "UPDATE",
                }));
              return [
                todo.id,
                { todo: { ...todo, TYPE_OPERATION: "UPDATE" }, event },
              ] as const;
            });
          })
          .unwrapOrElse(() => []),
      );
    },
  );

  return (
    <OutsideClick
      refs={refs}
      doSomething={() => closeForm()}
      className="fixed top-1/2 w-full z-[3000] justify-center flex"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(task, Array.from(todosAndEvents.values()));
          closeForm();
        }}
        className="p-2 bg-white rounded-md border-2 border-gray-200 max-w-[50%] text-black flex flex-col "
        id="form"
      >
        <label>
          Title:
          <input
            type="text"
            value={task.title}
            placeholder="Title"
            onChange={(e) => {
              setTask({
                type: "changeTitle",
                value: e.currentTarget.value,
              });
            }}
            className="m-2 bg-gray-200 min-w-fit"
          />
        </label>
        <label>
          <a>Dates: </a>
          <input
            type="date"
            value={
              task.startDate != null
                ? getHTMLDateTime(new Date(task.startDate)).slice(0, 10)
                : undefined
            }
            onChange={(e) => {
              if (e.currentTarget.valueAsDate) {
                setTask({
                  type: "changeStartDate",
                  value: e.currentTarget.valueAsDate,
                });
              }
            }}
          />
          <input
            type="date"
            value={
              task.endDate != null
                ? getHTMLDateTime(new Date(task.endDate)).slice(0, 10)
                : undefined
            }
            onChange={(e) => {
              if (e.currentTarget.valueAsDate) {
                setTask({
                  type: "changeEndDate",
                  value: e.currentTarget.valueAsDate,
                });
              }
            }}
          />
        </label>
        <label>
          <p>Description</p>
          <input
            type="text"
            value={task.description}
            placeholder="Description"
            onChange={(e) => {
              setTask({
                type: "changeDescription",
                value: e.currentTarget.value,
              });
            }}
            className="bg-gray-200 p-2 w-full"
          />
        </label>
        <a>To-Do</a>
        <div className="bg-gray-200 p-2 w-full flex flex-col">
          {Array.from(todosAndEvents.values()).map(
            ({ todo: { id, ...rest }, event }, index) => {
              return (
                <TodoForm
                  todo={rest}
                  onSubmit={(updatedTodo, updatedEvent) => {
                    setTodosAndEvents({
                      type: "update_todo",
                      value: {
                        id,
                        ...updatedTodo,
                      },
                    });
                    setTodosAndEvents({
                      type: "update_event",
                      value: {
                        todoId: id,
                        event: updatedEvent.map((value) => ({
                          ...value,
                          TYPE_OPERATION: "UPDATE",
                        })),
                      },
                    });
                  }}
                  key={id}
                  event={event}
                ></TodoForm>
              );
            },
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              storages.map(({ projectsStorage }) => {
                projectsStorage
                  .findById(initialForm.project_id)
                  .map(({ calendars }) => {
                    setTodosAndEvents({
                      type: "add",
                      value: {
                        title: "New Todo",
                        calendar_id: calendars[0],
                        board_id: initialForm.board_id,
                        task_id: initialForm.id,
                        project_id: initialForm.project_id,
                      },
                    });
                  });
              });
            }}
          >
            Add todo
          </button>
        </div>
        <input type="submit" value={"Save"} form="form" />
      </form>
    </OutsideClick>
  );
}

export function MiniatureTask({
  setSelectedTask,
  initialTask: task,
}: {
  initialTask: Task;
  setSelectedTask: (value: Option<Task>) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [editable, setEditable] = useState(false);

  const { storages } = useContext(StorageContext);

  return (
    <div className="relative">
      <input
        value={title}
        className="bg-gray-200"
        onDoubleClick={() => {
          setEditable(true);
        }}
        onBlur={() => {
          storages.map(({ tasksStorage }) => {
            if (title.length > 0) {
              tasksStorage.update(task.id, { title });
            } else {
              setTitle(task.title);
            }
          });
        }}
        readOnly={!editable}
        onChange={(e) => setTitle(e.currentTarget.value)}
      />
      <button
        className="text-yellow-500 p-[4px] rounded-md absolute right-0 -top-[20%]"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedTask(Some(task));
        }}
      >
        edit
      </button>
    </div>
  );
}
