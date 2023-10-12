import { StorageContext } from "@/hooks/dataHook";
import { Project } from "@/services/projects/projectsStorage";
import { None, Option, Some } from "@/utils/option";
import {
  DetailedHTMLProps,
  Dispatch,
  DragEvent,
  HTMLAttributes,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { Board, BoardStorage } from "@/services/boards/boards";
import { Task, TaskStorage } from "@/services/task/task";
import { LocalValue, MiniatureTask, TaskForm } from "../tasks/forms/createTask";
import { AddValue, UpdateValue } from "@/utils/storage";
import { Todo } from "@/services/todo/todo";
import { Ok, Result } from "@/utils/result";
import { CalendarEvent } from "@/services/events/events";
import { BetterEventEmitter } from "@/utils/eventEmitter";

export default function Container({ children }: PropsWithChildren) {
  return (
    <div className="flex gap-[4px] h-full w-full bg-neutral-100 relative overflow-auto">
      {children}
    </div>
  );
}

const TaskDragContext = createContext<
  [state: Option<Task>, dispatcher: Dispatch<SetStateAction<Option<Task>>>]
>([None(), () => {}]);

function ProjectBoards({ project }: { project: Option<Project> }) {
  const { storages } = useContext(StorageContext);
  const taskDragState = useState<Option<Task>>(None());
  return storages.mapOrElse(
    () => null,
    ({ boardsStorage }) => {
      return project.mapOrElse(
        () => null,
        (project) => {
          const boards = boardsStorage
            .allBoardsFromProject(project.id)
            .sort((a, b) => {
              return a.position - b.position;
            });

          return (
            <TaskDragContext.Provider value={taskDragState}>
              {boards.map((board, index, array) => {
                return (
                  <Board
                    key={board.id}
                    boardsStorage={boardsStorage}
                    initialBoard={board}
                    neighbours={[
                      index - 1 >= 0 ? Some(array[index - 1]) : None(),
                      index + 1 < array.length
                        ? Some(array[index + 1])
                        : None(),
                    ]}
                  ></Board>
                );
              })}
              <AddBoard
                project={project}
                boardsNumber={boards.length}
              ></AddBoard>
            </TaskDragContext.Provider>
          );
        },
      );
    },
  );
}

function AddBoard({
  project,
  boardsNumber,
}: {
  project: Project;
  boardsNumber: number;
}) {
  const { storages } = useContext(StorageContext);
  return (
    <div className="flex h-full w-[32px] sticky right-0 items-center">
      <button
        className="h-[32px] w-[32px] rounded-full bg-primary-400 text-white"
        onClick={() => {
          storages.map(({ boardsStorage }) => {
            boardsStorage.add({
              title: "New Board",
              project_id: project.id,
              position: boardsNumber,
            });
          });
        }}
      >
        +
      </button>
    </div>
  );
}

const internalReduceTodo =
  <
    A extends BetterEventEmitter<Type["id"], Type>,
    Type extends Record<string, unknown> & { id: string },
  >(
    todosStorage: A,
  ) =>
  (
    acc: Result<
      {
        value: Type;
        operation: "REMOVE" | "UPDATE" | "CREATE";
      }[],
      {
        value: Type;
        operation: "REMOVE" | "UPDATE" | "CREATE";
      }[]
    >,
    {
      todo: { id, TYPE_OPERATION: todoTypeOperation, ...todo },
    }: { todo: LocalValue<Type> },
  ) => {
    return acc
      .map((toRestore) => {
        const todoReduced =
          todoTypeOperation === "UPDATE"
            ? todosStorage
                .findById(id)
                .map((todoFound) => {
                  return todosStorage
                    .update(id, todo as UpdateValue<Type>)
                    .map(() => [
                      ...toRestore,
                      {
                        value: todoFound,
                        operation: "UPDATE" as "REMOVE" | "UPDATE" | "CREATE",
                      },
                    ])
                    .mapErr(() => toRestore);
                })
                .ok(toRestore)
                .flatten()
            : todoTypeOperation === "CREATE"
            ? todosStorage
                .add(todo as AddValue<Type>)
                .map((created) => [
                  ...toRestore,
                  {
                    value: created,
                    operation: "REMOVE" as "REMOVE" | "UPDATE" | "CREATE",
                  },
                ])
                .mapErr(() => toRestore)
            : todosStorage
                .remove(id)
                .map((deleted) => [
                  ...toRestore,
                  {
                    value: deleted,
                    operation: "CREATE" as "REMOVE" | "UPDATE" | "CREATE",
                  },
                ])
                .mapErr(() => toRestore);

        return todoReduced;
      })
      .flatten();
  };

const onDropHandler =
  (
    newPosition: number,
    tasks: Task[],
    boardId: Board["id"],
    taskDragged: Option<Task>,
    taskStorage: TaskStorage,
  ) =>
  (e: DragEvent<HTMLDivElement>): Task[] => {
    e.preventDefault();

    return taskDragged.mapOrElse(
      () => tasks,
      (taskData) => {
        const oldPosition = tasks.findIndex(({ id }) => id === taskData.id);

        if (oldPosition >= 0) {
          const startRange = Math.min(oldPosition, newPosition);
          const endRange = Math.max(oldPosition, newPosition);
          const offset = Math.sign(oldPosition - newPosition);

          const updatedTasks = tasks
            .map(({ id, position, ...rest }) => {
              const result =
                id === taskData.id
                  ? { ...taskData, position: newPosition }
                  : position >= startRange && position <= endRange
                  ? {
                      id,
                      ...rest,
                      position: position + offset,
                    }
                  : { id, position, ...rest };

              if (result.position !== position) {
                taskStorage.update(result.id, { position: result.position });
              }

              return result;
            })
            .sort(({ position: pA }, { position: pB }) => pA - pB);

          e.currentTarget.style.height = "8px";
          return updatedTasks;
        } else {
          const newTasks = tasks.map(({ position, ...task }) => {
            const result =
              position >= newPosition
                ? { ...task, position: position + 1 }
                : { ...task, position };

            if (position !== result.position) {
              taskStorage.update(result.id, { position: result.position });
            }

            return result;
          });

          newTasks.splice(newPosition, 0, {
            ...taskData,
            position: newPosition,
            board_id: boardId,
          });

          taskStorage.update(taskData.id, {
            position: newPosition,
            board_id: boardId,
          });

          e.currentTarget.style.height = "8px";
          return newTasks;
        }
      },
    );
  };

function Board({
  initialBoard,
  boardsStorage,
  neighbours,
}: {
  initialBoard: Board;
  boardsStorage: BoardStorage;
  neighbours: [prev: Option<Board>, next: Option<Board>];
}) {
  const { storages } = useContext(StorageContext);
  const [board, setBoard] = useReducer(
    (state: Board, action: { type: "change_title"; title: Board["title"] }) => {
      if (action.type === "change_title") {
        return { ...state, title: action.title };
      }

      return state;
    },
    initialBoard,
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [seletectedTask, setSelectedTask] = useState<Option<Task>>(None());
  const [taskDragging, setTaskDragging] = useContext(TaskDragContext);

  useEffect(() => {
    // TODO: Add index
    storages.map(({ tasksStorage }) => {
      const tasks = tasksStorage
        .filteredValues((task) => task.board_id === initialBoard.id)
        .sort((taskA, taskB) => taskA.position - taskB.position);

      setTasks(tasks);
    });
  }, [taskDragging]);

  useEffect(() => {
    boardsStorage.update(initialBoard.id, board).mapOrElse(
      () => board,
      (ok) => ok,
    );
  }, [board]);

  return (
    <>
      <div className="bg-white h-full relative text-black overflow-auto">
        <input
          onChange={(e) => {
            const newTitle = e.currentTarget.value;
            if (newTitle.length !== board.title.length) {
              setBoard({ type: "change_title", title: newTitle });
            }
          }}
          className="m-2"
          value={board.title}
        />

        <div className="bg-neutral-200 relative min-h-[6%] m-2 p-[4px] flex flex-col">
          <DummyDrop
            startHeight="4px"
            newPosition={0}
            boardId={board.id}
            tasks={tasks}
            key={0}
            className="absolute top-0"
            setTasks={setTasks}
          ></DummyDrop>
          {tasks.map((task, taskIndex) => (
            <>
              <MiniatureTask
                setSelectedTask={setSelectedTask}
                initialTask={task}
                key={task.id}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDragStart={(e) => {
                  e.currentTarget.classList.add("dragging");
                  e.dataTransfer.clearData();
                  setTaskDragging(Some(task));
                }}
                draggable
              ></MiniatureTask>
              <DummyDrop
                tasks={tasks}
                boardId={board.id}
                newPosition={taskIndex + 1}
                startHeight="8px"
                setTasks={setTasks}
              ></DummyDrop>
            </>
          ))}
          <button
            className="sticky bottom-0 w-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              storages.map(({ tasksStorage }) => {
                tasksStorage
                  .add({
                    board_id: board.id,
                    title: "New task",
                    endDate: undefined,
                    startDate: undefined,
                    project_id: board.project_id,
                    description: "",
                    position: tasks.length,
                  })
                  .map((task) => tasks.push(task) > 0 && setTasks(tasks));
              });
            }}
          >
            Add Task
          </button>
        </div>

        <div className="flex gap-2 absolute right-0 top-0 align-middle p-2 flex-row-reverse">
          <button
            className="bg-red-500 rounded-md text-white p-[4px]"
            onClick={() => {
              boardsStorage.remove(board.id);
            }}
          >
            -
          </button>
          <button
            className="bg-yellow-400 text-white rounded-md p-[4px]"
            onClick={() => {
              const [, next] = neighbours;
              next.map(({ id: nextBoardId, position: nextBoardPosition }) => {
                boardsStorage
                  .update(nextBoardId, { position: board.position })
                  .map(() =>
                    boardsStorage.update(board.id, {
                      position: nextBoardPosition,
                    }),
                  );
              });
            }}
          >
            &gt;
          </button>
          <button
            className="bg-yellow-400 text-white rounded-md p-[4px]"
            onClick={(e) => {
              e.preventDefault();
              const [prev] = neighbours;
              prev.map(({ id: prevBoardId, position: prevBoardPosition }) => {
                boardsStorage
                  .update(prevBoardId, { position: board.position })
                  .map(() =>
                    boardsStorage.update(board.id, {
                      position: prevBoardPosition,
                    }),
                  );
              });
            }}
          >
            &lt;
          </button>
        </div>
      </div>
      {seletectedTask.mapOrElse(
        () => null,
        (task) => {
          return (
            <TaskForm
              onSubmit={(task, todosAndEvents) => {
                storages.map(({ tasksStorage, todosStorage, eventsStorage }) =>
                  tasksStorage.findById(task.id).map((taskFound) =>
                    tasksStorage.update(task.id, task).map((updatedTask) => {
                      todosAndEvents
                        .reduce(
                          internalReduceTodo(todosStorage),
                          Ok([]) as Result<
                            {
                              value: Todo;
                              operation: "REMOVE" | "UPDATE" | "CREATE";
                            }[],
                            {
                              value: Todo;
                              operation: "REMOVE" | "UPDATE" | "CREATE";
                            }[]
                          >,
                        )
                        .mapErr((toRestore) => {
                          toRestore.map(({ value, operation }) =>
                            operation === "REMOVE"
                              ? todosStorage.remove(value.id)
                              : operation === "UPDATE"
                              ? todosStorage.update(value.id, value)
                              : todosStorage.add(value),
                          );
                          tasksStorage.update(task.id, taskFound);
                        })
                        .map((todos) =>
                          todos.map((todo, index) =>
                            todosAndEvents[index].event.map((event) => ({
                              ...event,
                              todo_id: todo.value.id,
                            })),
                          ),
                        )
                        .map((events) => {
                          events
                            .reduce(
                              (acc, event) =>
                                event.mapOrElse(
                                  () => acc,
                                  (event) => [
                                    ...acc,
                                    { todo: event, event: None() },
                                  ],
                                ),
                              [] as {
                                todo: LocalValue<CalendarEvent>;
                                event: Option<LocalValue<CalendarEvent>>;
                              }[],
                            )
                            .reduce(
                              internalReduceTodo(eventsStorage),
                              Ok([]) as Result<
                                {
                                  value: CalendarEvent;
                                  operation: "REMOVE" | "UPDATE" | "CREATE";
                                }[],
                                {
                                  value: CalendarEvent;
                                  operation: "REMOVE" | "UPDATE" | "CREATE";
                                }[]
                              >,
                            )
                            .mapErr((toRestore) => {
                              toRestore.map(({ value, operation }) =>
                                operation === "REMOVE"
                                  ? eventsStorage.remove(value.id)
                                  : operation === "UPDATE"
                                  ? eventsStorage.update(value.id, value)
                                  : eventsStorage.add(value),
                              );
                              tasksStorage.update(task.id, taskFound);
                            })
                            .map(() => {
                              const taskIndex = tasks.findIndex(
                                ({ id }) => id === updatedTask.id,
                              );
                              const newTasks =
                                taskIndex > 0
                                  ? tasks.splice(taskIndex, 1, updatedTask)
                                  : tasks.push(updatedTask) > 0
                                  ? tasks
                                  : tasks;
                              setTasks([...newTasks]);
                            });
                        });
                    }),
                  ),
                );
              }}
              initialForm={task}
              closeForm={() => setSelectedTask(None())}
              refs={None()}
              initialTodoList={storages.mapOrElse(
                () => [],
                ({ todosStorage }) => {
                  const result = todosStorage.filteredValues(
                    ({ task_id }) => task_id === task.id,
                  );
                  return result;
                },
              )}
            ></TaskForm>
          );
        },
      )}
    </>
  );
}

const DummyDrop = ({
  newPosition,
  tasks,
  boardId,
  startHeight,
  setTasks,
}: {
  newPosition: number;
  tasks: Task[];
  boardId: Board["id"];
  startHeight: string;
  setTasks: (tasks: Task[]) => void;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => {
  const [taskDragging, setTaskDragging] = useContext(TaskDragContext);
  const { storages } = useContext(StorageContext);
  const onDrop = useMemo(
    () =>
      storages.mapOrElse(
        () => () => tasks,
        ({ tasksStorage }) =>
          onDropHandler(
            newPosition,
            tasks,
            boardId,
            taskDragging,
            tasksStorage,
          ),
      ),
    [storages, tasks, newPosition, boardId, startHeight],
  );
  return (
    <div
      onDrop={(e) => {
        const result = onDrop(e);
        setTasks(result);
        setTaskDragging(None());
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        taskDragging.map((task) => {
          if (
            task.board_id === boardId &&
            (task.position === newPosition || task.position === newPosition - 1)
          )
            return;

          e.currentTarget.style.height = "32px";
        });
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        taskDragging.map(() => {
          e.currentTarget.style.height = startHeight;
        });
      }}
      style={{ height: startHeight }}
    ></div>
  );
};

export const Boards = {
  Board,
  ProjectBoards,
};
