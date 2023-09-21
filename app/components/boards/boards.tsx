import { Project } from "@/services/projects/projectsStorage";
import { Option } from "@/utils/option";
import { PropsWithChildren } from "react";

export default function Container({ children }: PropsWithChildren) {
  return <div className="flex">{children}</div>;
}

function ProjectBoards({ project }: { project: Option<Project> }) {
  return project.mapOrElse(
    () => null,
    (project) => {
      const boards = [1];
      return boards.map((board, index) => (
        <div key={index}>{project.title} board</div>
      ));
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
