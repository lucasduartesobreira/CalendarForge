import { CreateCalendarForm } from "@/components/calendar/forms/createCalendar";
import { UpdateProjectCalendarForm } from "@/components/calendar/forms/updateCalendar";
import OutsideClick from "@/components/utils/outsideClick";
import { CreateCalendar } from "@/services/calendar/calendar";
import { Project } from "@/services/projects/projectsStorage";
import { None, Option, Some } from "@/utils/option";
import { AddValue } from "@/utils/storage";
import React, { FormEvent, RefObject, useRef, useState } from "react";

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

  const [editCalendar, setEditCalendar] = useState<
    Option<[CreateCalendar, number]>
  >(None());

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
          onSubmit(e, form, [projectCalendar, ...localCalendars]);
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
              return (
                <div key={index} className="flex w-full gap-2">
                  <a className="w-[75%]">{calendar.name}</a>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditCalendar(
                          Some([calendar, index] satisfies [
                            CreateCalendar,
                            number,
                          ]),
                        );
                        setOpenAddCalendar(false);
                      }}
                      className="text-yellow-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLocalCalendars((calendars) =>
                          calendars.filter((_value, i) => i !== index),
                        );
                      }}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </label>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpenAddCalendar(!openAddCalendar);
            setEditCalendar(None());
          }}
          className="text-blue-500"
        >
          + Add Calendar
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
      {editCalendar.isSome() && (
        <UpdateProjectCalendarForm
          refs={refs.isSome() ? Some([...refs.unwrap(), ref]) : Some([ref])}
          setOpen={() => setEditCalendar(None())}
          initialCalendar={editCalendar.unwrap()[0]}
          onSubmit={(calendar) => {
            setLocalCalendars((calendars) => {
              calendars[editCalendar.unwrap()[1]] = calendar;
              return calendars;
            });
          }}
        />
      )}
    </OutsideClick>
  );
};
