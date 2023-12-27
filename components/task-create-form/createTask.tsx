import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import { Task } from "@/services/task/task";
import { Option, Some } from "@/utils/option";
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
  onSubmit: (
    task: A,
    todos: Array<{
      event: Option<LocalValue<CalendarEvent>>;
    }>,
  ) => void;
  refs: Option<RefObject<null>[]>;
};

export function TaskForm<Props extends PropsFullPage<Task>>({
  refs,
  closeForm,
  initialForm,
}: Props) {
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

  useEffect(() => {
    async () => {};
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
        <div className="flex flex-nowrap gap-1 w-full justify-center" />
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
