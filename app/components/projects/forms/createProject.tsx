import OutsideClick from "@/components/utils/outsideClick";
import { Project } from "@/services/projects/projectsStorage";
import { Option } from "@/utils/option";
import React, { RefObject, useState } from "react";

export const CreateProjectForm = ({
  setOpenForm,
  refs,
}: {
  setOpenForm: (value: boolean) => void;
  refs: Option<RefObject<any>[]>;
}) => {
  const [form, setForm] = useState<Project>({
    id: "",
    title: "",
    calendars: [],
  });

  return (
    <OutsideClick
      refs={refs}
      doSomething={() => {
        setOpenForm(false);
      }}
    >
      <form className="fixed top-1/2 left-1/2 max-w-[30%] bg-white p-2 text-gray-400 flex flex-col">
        <label>
          Title <input value={form.title} className="bg-gray-300 text-black" />{" "}
        </label>
        <label>
          Calendars
          <div className="bg-white-600">Calendar example</div>
        </label>
      </form>
    </OutsideClick>
  );
};
