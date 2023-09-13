import { StorageContext, Storages } from "@/hooks/dataHook";
import { PropsWithChildren, useContext, useRef, useState } from "react";
import { CreateProjectForm } from "../forms/createProject";
import { Some } from "@/utils/option";

const SideBar = ({ children }: PropsWithChildren) => {
  return <div className="flex-none relative w-[15%] h-[100%]">{children}</div>;
};

const Content = () => {
  const { storages } = useContext(StorageContext);

  return (
    <div>
      {storages.isSome() &&
        storages
          .unwrap()
          .projectsStorage.all()
          .map((project) => {
            return <div key={project.id}>{project.title}</div>;
          })}
    </div>
  );
};

const AddNew = () => {
  const [openForm, setOpenForm] = useState(false);
  const { storages } = useContext(StorageContext);
  const ref = useRef(null);
  if (storages.isSome()) {
    return (
      <>
        <button
          ref={ref}
          className="absolute bottom-0 m-4 p-2 rounded-md bg-blue-500"
          onClick={() => {
            setOpenForm((open) => !open);
          }}
        >
          New Project
        </button>
        {openForm && (
          <CreateProjectForm setOpenForm={setOpenForm} refs={Some([ref])} />
        )}
      </>
    );
  }
};

const ProjectsSideBar = {
  SideBar,
  Content,
  AddNew,
};

export default ProjectsSideBar;
