import { PropsWithChildren } from "react";

const SideBar = ({ children }: PropsWithChildren) => {
  return <div className="flex-initial w-[15%]">{children}</div>;
};

const ProjectsSideBar = {
  SideBar,
};

export default ProjectsSideBar;
