import { StorageContext } from "@/hooks/dataHook";
import { Project } from "@/services/projects/projectsStorage";
import { Option } from "@/utils/option";
import { PropsWithChildren, useContext } from "react";

export default function Container({ children }: PropsWithChildren) {
  return <div className="flex">{children}</div>;
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
          return boards.map((board, index) => (
            <div key={index} className="bg-white w-[360px] h-full">
              {board.title}
            </div>
          ));
        },
      );
    },
  );
}

function Board({}) {
  return <div className="bg-white">project</div>;
}

export const Boards = {
  Board,
  ProjectBoards,
};
