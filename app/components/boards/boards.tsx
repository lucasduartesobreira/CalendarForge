import { StorageContext } from "@/hooks/dataHook";
import { Project } from "@/services/projects/projectsStorage";
import { None, Option, Some } from "@/utils/option";
import {
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { Board, BoardStorage } from "@/services/boards/boards";
import { Task, TaskStorage } from "@/services/task/task";

export default function Container({ children }: PropsWithChildren) {
  return (
    <div className="flex gap-[4px] h-full w-full bg-gray-100 relative overflow-auto">
      {children}
    </div>
  );
}

function ProjectBoards({ project }: { project: Option<Project> }) {
  const { storages } = useContext(StorageContext);
  return storages.mapOrElse(
    () => null,
    ({ boardsStorage, tasksStorage }) => {
      return project.mapOrElse(
        () => null,
        (project) => {
          const boards = boardsStorage
            .allBoardsFromProject(project.id)
            .sort((a, b) => {
              return a.position - b.position;
            });

          return (
            <>
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
            </>
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
        className="h-[32px] w-[32px] rounded-full bg-blue-500 text-white"
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

function Board({
  initialBoard,
  boardsStorage,
  neighbours,
}: {
  initialBoard: Board;
  boardsStorage: BoardStorage;
  neighbours: [prev: Option<Board>, next: Option<Board>];
}) {
  const { storages, listeners } = useContext(StorageContext);
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

  useEffect(() => {
    // TODO: Add index
    storages.map(({ tasksStorage }) => {
      const tasks = tasksStorage.filteredValues(
        (task) => task.board_id === initialBoard.id,
      );
      setTasks(tasks);
    });
  }, [listeners.tasksStorageListener]);

  useEffect(() => {
    boardsStorage.update(initialBoard.id, board).mapOrElse(
      () => board,
      (ok) => ok,
    );
  }, [board]);

  return (
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

      <div className="bg-gray-200 min-h-[6%] m-2 p-[4px]">
        {tasks.map((task, index) => (
          <div key={index}>{task.title}</div>
        ))}
      </div>

      <div className="flex gap-2 absolute right-0 top-0 align-middle p-2 flex-row-reverse">
        <button
          className="bg-red-500 rounded-md text-white p-[4px]"
          onClick={(e) => {
            boardsStorage.remove(board.id);
          }}
        >
          -
        </button>
        <button
          className="bg-yellow-400 text-white rounded-md p-[4px]"
          onClick={(e) => {
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
  );
}

export const Boards = {
  Board,
  ProjectBoards,
};
