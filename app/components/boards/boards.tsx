import { StorageContext } from "@/hooks/dataHook";
import { Project } from "@/services/projects/projectsStorage";
import { Option } from "@/utils/option";
import { PropsWithChildren, useContext, useEffect, useReducer } from "react";
import { Board, BoardStorage } from "@/services/boards/boards";

export default function Container({ children }: PropsWithChildren) {
  return (
    <div className="flex h-full w-full bg-gray-100 relative">{children}</div>
  );
}

function ProjectBoards({ project }: { project: Option<Project> }) {
  const { storages } = useContext(StorageContext);
  return storages.mapOrElse(
    () => null,
    ({ boardsStorage }) => {
      return project.mapOrElse(
        () => null,
        (project) => {
          const boards = boardsStorage.allBoardsFromProject(project.id);
          return (
            <>
              {boards.map((board, index) => (
                <Board
                  key={index}
                  boardsStorages={boardsStorage}
                  initialBoard={board}
                ></Board>
              ))}
              <AddBoard project={project}></AddBoard>
            </>
          );
        },
      );
    },
  );
}

function AddBoard({ project }: { project: Project }) {
  const { storages } = useContext(StorageContext);
  return (
    <div className="h-full w-[32px] absolute right-0">
      <div className="relative h-full">
        <button
          className="absolute top-1/2 h-[32px] w-[32px] rounded-full bg-blue-500 text-white"
          onClick={() => {
            storages.map(({ boardsStorage }) => {
              boardsStorage.add({ title: "New Board", project_id: project.id });
            });
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Board({
  initialBoard,
  boardsStorages,
}: {
  initialBoard: Board;
  boardsStorages: BoardStorage;
}) {
  const [board, setBoard] = useReducer(
    (state: Board, action: { type: "change_title"; title: Board["title"] }) => {
      if (action.type === "change_title") {
        return { ...state, title: action.title };
      }

      return state;
    },
    initialBoard,
  );

  useEffect(() => {
    boardsStorages.update(initialBoard.id, { ...board }).mapOrElse(
      () => board,
      (ok) => ok,
    );
  }, [board]);

  return (
    <div className="bg-white h-full text-black">
      <input
        onChange={(e) => {
          const newTitle = e.currentTarget.value;
          if (newTitle.length !== board.title.length) {
            setBoard({ type: "change_title", title: newTitle });
          }
        }}
        value={board.title}
      />
    </div>
  );
}

export const Boards = {
  Board,
  ProjectBoards,
};
