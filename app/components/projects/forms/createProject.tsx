import { CreateCalendarForm } from "@/components/calendar/forms/createCalendar";
import OutsideClick from "@/components/utils/outsideClick";
import { CreateCalendar } from "@/services/calendar/calendar";
import { Project } from "@/services/projects/projectsStorage";
import { idGenerator } from "@/utils/idGenerator";
import { None, Option, Some } from "@/utils/option";
import { AddValue } from "@/utils/storage";
import React, {
  FormEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

export const CreateProjectForm = ({
  setOpenForm,
  refs,
  onSubmit,
  initialForm,
  initialCalendars,
  fixProjectCalendar,
  initialProjectCalendar,
}: {
  setOpenForm: (value: boolean) => void;
  onSubmit: (
    e: FormEvent<HTMLFormElement>,
    form: AddValue<Project>,
    localCalendars: CreateCalendar[],
  ) => void;
  refs: Option<RefObject<any>[]>;
  fixProjectCalendar: (
    form: AddValue<Project>,
    localCalendars: CreateCalendar,
  ) => CreateCalendar;
  initialForm: AddValue<Project>;
  initialCalendars: CreateCalendar[];
  initialProjectCalendar: CreateCalendar;
}) => {
  const [form, setForm] = useState<AddValue<Project>>(initialForm);

  const [localCalendars, setLocalCalendars] =
    useState<CreateCalendar[]>(initialCalendars);

  const [projectCalendar, setProjectCalendar] = useState<CreateCalendar>(
    initialProjectCalendar,
  );

  const [openAddCalendar, setOpenAddCalendar] = useState(false);

  const ref = useRef(null);

  return (
    <OutsideClick
      refs={refs}
      doSomething={() => {
        setOpenForm(false);
      }}
      className="fixed top-1/2 flex w-full justify-center"
    >
      <form
        className="flex-auto max-w-[30%] bg-white p-2 text-gray-400 flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit(e, form, localCalendars);
          setOpenForm(false);
        }}
        ref={ref}
      >
        <label>
          Title
          <input
            value={form.title}
            className="bg-gray-200 m-2 text-black"
            onChange={(ev) => {
              const title = ev.currentTarget.value;
              const updatedForm = { ...form, title };
              setForm(updatedForm);
              setProjectCalendar((calendar) =>
                fixProjectCalendar(updatedForm, calendar),
              );
            }}
          />
        </label>
        <label>
          Calendars
          {projectCalendar.name.length != 0 ? (
            <div>{projectCalendar.name}</div>
          ) : null}
          <div>
            {localCalendars.map((calendar, index) => {
              return <div key={index}>{calendar.name}</div>;
            })}
          </div>
        </label>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpenAddCalendar(!openAddCalendar);
          }}
          className="text-blue-500"
        >
          +
        </button>
        <input
          value={"Save"}
          type="submit"
          className="rounded-md text-white bg-blue-500"
        />
      </form>
      {openAddCalendar && (
        <CreateCalendarForm
          onSubmit={(e, calendar) => {
            e.preventDefault();
            e.stopPropagation();
            setLocalCalendars((calendars) => [...calendars, calendar]);
            setOpenAddCalendar(!openAddCalendar);
          }}
          refs={refs.isSome() ? Some([...refs.unwrap(), ref]) : Some([ref])}
          outsideClickHandler={() => {
            setOpenForm(false);
          }}
        />
      )}
    </OutsideClick>
  );
};
