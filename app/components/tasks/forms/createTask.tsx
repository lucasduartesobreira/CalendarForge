import { TodoForm } from "@/components/todo/form/editTodo";
import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import { Task } from "@/services/task/task";
import { Todo } from "@/services/todo/todo";
import { getHTMLDateTime } from "@/utils/date";
import { None, Option, Some } from "@/utils/option";
import { AddValue } from "@/utils/storage";
import { RefObject, useContext, useReducer, useState } from "react";

type PropsFullPage<A> = {
  closeForm: () => void;
  initialForm: A;
  initialTodoList: Todo[];
  onSubmit: (task: A, todos: Array<AddValue<Todo> & { id?: string }>) => void;
  refs: Option<RefObject<null>[]>;
};

export function TaskForm<Props extends PropsFullPage<Task>>({
  refs,
  closeForm,
  onSubmit,
  initialForm,
  initialTodoList = [],
}: Props) {
  const { storages } = useContext(StorageContext);
  const [todos, setTodos] = useReducer(
    (
      state: (AddValue<Todo> & { id?: string })[],
      action:
        | { type: "add"; value: AddValue<Todo> & { id?: string } }
        | {
            type: "update";
            value: AddValue<Todo> & { id?: string };
            index: number;
          },
    ) => {
      if (action.type === "add") {
        return [...state, action.value];
      } else if (action.type === "update") {
        state[action.index] = { ...state[action.index], ...action.value };
        return state;
      }
      return state;
    },
    initialTodoList,
  );

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

  return (
    <OutsideClick
      refs={refs}
      doSomething={() => closeForm()}
      className="fixed top-1/2 w-full z-[3000] justify-center flex"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(task, todos);
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
          {todos.map(({ id, ...rest }, index) => {
            return (
              <TodoForm
                todo={rest}
                onSubmit={(todo, event) => {
                  setTodos({ type: "update", value: todo, index: index });
                }}
                key={Date.now() + index}
                event={storages.flatMap(({ eventsStorage }) =>
                  eventsStorage.find(
                    ({ todo_id }) =>
                      todo_id != null && id != null && todo_id === id,
                  ),
                )}
              ></TodoForm>
            );
          })}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              storages.map(({ projectsStorage }) => {
                projectsStorage
                  .findById(initialForm.project_id)
                  .map(({ calendars }) => {
                    setTodos({
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
        onDoubleClick={(e) => {
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
