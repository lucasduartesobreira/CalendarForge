import { CreateCalendarForm } from "@/components/calendar/forms/createCalendar";
import { UpdateProjectCalendarForm } from "@/components/calendar/forms/updateCalendar";
import OutsideClick from "@/components/utils/outsideClick";
import { Calendar, CreateCalendar } from "@/services/calendar/calendar";
import { Project } from "@/services/projects/projectsStorage";
import * as O from "@/utils/option";
import { AddValue, UpdateValue } from "@/utils/storage";
import React, {
  FormEvent,
  PropsWithChildren,
  RefObject,
  useRef,
  useState,
} from "react";

type UpdateOrCreateCalendar<V> = V extends AddValue<Project>
  ? AddValue<Calendar>
  : AddValue<Calendar> & { id?: Project["id"] };

type Prop<V extends AddValue<Project> | UpdateValue<Project>> = {
  setOpenForm: (value: boolean) => void;
  onSubmit: (
    e: FormEvent<HTMLFormElement>,
    form: V,
    localCalendars: UpdateOrCreateCalendar<V>[],
  ) => void;
  refs: O.Option<RefObject<any>[]>;
  fixProjectCalendar: (
    form: V,
    localCalendars: CreateCalendar,
  ) => CreateCalendar;
  initialForm: V;
  initialCalendars: CreateCalendar[];
  initialProjectCalendar: CreateCalendar;
  deleteButton: O.Option<() => void>;
};

export function ProjectForm<
  V extends UpdateValue<Project> | AddValue<Project>,
>({
  setOpenForm,
  refs,
  onSubmit,
  initialForm,
  initialCalendars,
  fixProjectCalendar,
  initialProjectCalendar,
  deleteButton,
}: PropsWithChildren<Prop<V>>) {
  const [form, setForm] = useState<V>(initialForm);

  const [localCalendars, setLocalCalendars] =
    useState<AddValue<Calendar>[]>(initialCalendars);

  const [projectCalendar, setProjectCalendar] = useState<AddValue<Calendar>>(
    initialProjectCalendar,
  );

  const [openAddCalendar, setOpenAddCalendar] = useState(false);

  const [editCalendar, setEditCalendar] = useState<
    O.Option<[AddValue<Calendar>, number]>
  >(O.None());

  const ref = useRef(null);

  return (
    <OutsideClick
      refs={refs}
      doSomething={() => {
        setOpenForm(false);
      }}
      className="fixed z-[1000] top-1/2 flex w-full justify-center"
    >
      <form
        className="flex-auto relative max-w-[30%] bg-white p-2 text-gray-400 flex flex-col"
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
          {projectCalendar.name?.length != 0 ? (
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
                        setEditCalendar(O.Some([calendar, index]));
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
            setEditCalendar(O.None());
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
        {deleteButton.mapOrElse(
          () => null,
          (fn) => {
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  fn();
                  setOpenForm(false);
                }}
                className="absolute rounded-md right-[4px] top-[4px]"
              >
                Delete
              </button>
            );
          },
        )}
      </form>
      {openAddCalendar && (
        <CreateCalendarForm
          onSubmit={(e, calendar) => {
            e.preventDefault();
            e.stopPropagation();
            setLocalCalendars((calendars) => [...calendars, calendar]);
            setOpenAddCalendar(!openAddCalendar);
          }}
          refs={refs.isSome() ? O.Some([...refs.unwrap(), ref]) : O.Some([ref])}
          outsideClickHandler={() => {
            setOpenForm(false);
          }}
        />
      )}
      {editCalendar.isSome() && (
        <UpdateProjectCalendarForm
          refs={refs.isSome() ? O.Some([...refs.unwrap(), ref]) : O.Some([ref])}
          setOpen={() => setEditCalendar(O.None())}
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
}
