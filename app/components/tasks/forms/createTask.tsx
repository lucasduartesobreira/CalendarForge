import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import { Task } from "@/services/task/task";
import { Todo } from "@/services/todo/todo";
import { getHTMLDateTime } from "@/utils/date";
import { idGenerator } from "@/utils/idGenerator";
import { None, Option, Some } from "@/utils/option";
import { AddValue } from "@/utils/storage";
import {
  DetailedHTMLProps,
  HTMLAttributes,
  RefObject,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

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
          }
        | {
            type: "populate";
            value: Array<
              [
                Todo["id"],
                {
                  event: Option<LocalValue<CalendarEvent>>;
                  todo: LocalValue<Todo>;
                },
              ]
            >;
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
    new Map(),
  );

  const changeList = (todos: Todo[]) => {
    const final = storages
      .map(({ eventsStorage }) => {
        return todos.map((todo) => {
          const event = eventsStorage
            .find({ todo_id: todo.id })
            .then((found) => {
              const event = found.map<LocalValue<CalendarEvent>>((event) => ({
                ...event,
                TYPE_OPERATION: "UPDATE",
              }));

              return [
                todo.id,
                { todo: { ...todo, TYPE_OPERATION: "UPDATE" }, event },
              ] as const;
            });

          return event;
        });
      })
      .unwrapOrElse(() => [] as Promise<any>[]);

    return final;
  };

  useEffect(() => {
    async () => {
      const result: Array<
        [
          Todo["id"],
          {
            event: Option<LocalValue<CalendarEvent>>;
            todo: LocalValue<Todo>;
          },
        ]
      > = [];

      let what: Todo[];

      if (initialTodoList.length == 0) {
        storages.map(async ({ todosStorage }) => {
          what = await todosStorage.filteredValues(
            ({ task_id }) => task_id === task.id,
          );
        });
      } else {
        what = initialTodoList;
      }
      for await (const listItem of changeList(initialTodoList)) {
        result.push(
          listItem as unknown as [
            Todo["id"],
            {
              event: Option<LocalValue<CalendarEvent>>;
              todo: LocalValue<Todo>;
            },
          ],
        );
      }

      setTodosAndEvents({ type: "populate", value: result });
    };
  }, []);

  return (
    <OutsideClick
      refs={refs}
      doSomething={() => closeForm()}
      className="z-[1000] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(task, Array.from(todosAndEvents.values()));
          closeForm();
        }}
        className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden text-text-primary"
        id="form"
      >
        <div className="w-full absolute top-0 h-[16px] text-xs left-0 bg-neutral-300 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              closeForm();
            }}
            className="ml-auto mr-3 text-neutral-500 text-xs"
          >
            X
          </button>
        </div>
        <label className="flex flex-nowrap gap-1 items-center mt-2">
          <p className="text-neutral-500">Title</p>
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
            className="px-2 py-1 bg-neutral-200 rounded-md"
          />
        </label>
        <div className="flex flex-nowrap gap-1 w-full justify-center">
          <label className="px-2 py-1 text-sm flex flex-col flex-nowrap justify-center rounded-md bg-neutral-200 w-full">
            <a className="text-neutral-500">Inital Date</a>
            <input
              type="date"
              value={
                task.startDate != null
                  ? getHTMLDateTime(new Date(task.startDate)).slice(0, 10)
                  : undefined
              }
              className="bg-neutral-200 w-full"
              onChange={(e) => {
                if (e.currentTarget.valueAsDate) {
                  setTask({
                    type: "changeStartDate",
                    value: e.currentTarget.valueAsDate,
                  });
                }
              }}
            />
          </label>
          <label className="px-2 py-1 text-sm flex flex-col flex-nowrap justify-center rounded-md bg-neutral-200 w-full">
            <a className="text-neutral-500">End Date</a>
            <input
              type="date"
              value={
                task.endDate != null
                  ? getHTMLDateTime(new Date(task.endDate)).slice(0, 10)
                  : undefined
              }
              className="bg-neutral-200"
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
        </div>
        <label className="flex flex-col flex-nowrap justify-center">
          <p className="text-neutral-500">Description</p>
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
            className="bg-neutral-200 px-2 py-1 w-full rounded-md"
          />
        </label>
        <div className="flex flex-col flex-nowrap justify-center">
          <p className="text-neutral-500">To-Do</p>
          <div className="bg-neutral-200 px-2 py-2 mb-4 w-full gap-1 flex flex-col rounded-md">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                storages.map(({ projectsStorage }) => {
                  projectsStorage
                    .findById(initialForm.project_id)
                    .then((found) => {
                      found.map(({ calendars }) => {
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
                });
              }}
              className="text-primary-500 border-[1px] border-primary-500 rounded-md px-2 py-1"
            >
              Add todo
            </button>
          </div>
        </div>
        <input
          type="submit"
          value={"Save"}
          form="form"
          className="absolute bottom-0 w-full left-0 font-semibold text-white bg-primary-500 rounded-md"
        />
      </form>
    </OutsideClick>
  );
}

export function MiniatureTask({
  setSelectedTask,
  initialTask: task,
  ...props
}: {
  initialTask: Task;
  setSelectedTask: (value: Option<Task>) => void;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
  const [title, setTitle] = useState(task.title);
  const [editable, setEditable] = useState(false);

  const { storages } = useContext(StorageContext);

  return (
    <div className="px-2">
      <div
        {...props}
        className="relative items-center flex w-full min-h-0 px-3 py-1 text-sm rounded-xl border-[1px] border-black bg-white"
      >
        <input
          value={title}
          className="w-full"
          onDoubleClick={() => {
            setEditable(true);
          }}
          onBlur={() => {
            storages.map(({ tasksStorage }) => {
              if (title.length > 0) {
                if (task.title !== title) {
                  tasksStorage.update(task.id, { title });
                }
              } else {
                setTitle(task.title);
              }
            });
          }}
          readOnly={!editable}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
        <button
          className="text-amber-600 rounded-md ml-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedTask(Some(task));
          }}
        >
          edit
        </button>
      </div>
    </div>
  );
}
