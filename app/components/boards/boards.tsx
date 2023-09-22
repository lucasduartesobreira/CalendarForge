import { StorageContext } from "@/hooks/dataHook";
import { Project } from "@/services/projects/projectsStorage";
import { Option } from "@/utils/option";
import { PropsWithChildren, useContext } from "react";
import { Board } from "@/services/boards/boards";

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
                <Board key={index} board={board}></Board>
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

function Board({ board }: { board: Board }) {
  return (
    <div className="bg-white h-full text-black">
      <input value={board.title} />
    </div>
  );
}

export const Boards = {
  Board,
  ProjectBoards,
};
