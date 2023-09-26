import OutsideClick from "@/components/utils/outsideClick";
import { Task } from "@/services/task/task";
import { getHTMLDateTime } from "@/utils/date";
import { Option } from "@/utils/option";
import { AddValue, UpdateValue } from "@/utils/storage";
import { RefObject, useReducer } from "react";

type PropsFullPage<A> = {
  closeForm: () => void;
  initialForm: A;
  onSubmit: (task: A) => void;
  refs: Option<RefObject<null>[]>;
};

export function TaskForm<
  A extends UpdateValue<Task> | AddValue<Task>,
  Props extends PropsFullPage<A>,
>({ refs, closeForm, onSubmit, initialForm }: Props) {
  const [task, setTask] = useReducer(
    (
      state: A,
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
          onSubmit(task);
          closeForm();
        }}
        className="p-2 bg-white rounded-md border-2 border-gray-200 max-w-[50%] text-black flex flex-col "
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
        <label>
          <a>To-Do list</a>
          {/* 
          // TODO: Add to-do list
          */}
          <div className="bg-gray-200 p-2 w-full">Lista</div>
        </label>
        <input type="submit" value={"Save"} />
      </form>
    </OutsideClick>
  );
}
