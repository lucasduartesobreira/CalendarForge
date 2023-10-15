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
      className="fixed z-[1000] top-1/2 left-1/2 flex -translate-y-1/2 -translate-x-1/2"
    >
      <form
        className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden text-text-primary"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit(e, form, [projectCalendar, ...localCalendars]);
          setOpenForm(false);
        }}
        ref={ref}
      >
        <div className="w-full absolute top-0 h-[16px] text-xs left-0 bg-neutral-300 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              setOpenForm(false);
            }}
            className="ml-auto mr-3 text-neutral-500 text-xs"
          >
            X
          </button>
        </div>
        <label className="flex flex-nowrap gap-1 items-center mt-2">
          <a className="text-neutral-500 text-sm">Title</a>
          <input
            value={form.title}
            placeholder="Title"
            className="bg-neutral-200 px-2 py-1 text-text-primary rounded-md"
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
        <div
          className={`flex flex-col flex-nowrap gap-1 justify-center w-full ${
            deleteButton.isSome() ? "mb-[3.25rem]" : "mb-6"
          }`}
        >
          <a className="text-neutral-500 text-sm">Calendars</a>
          <div className="bg-neutral-200 px-2 py-2 rounded-md gap-1 flex flex-col flex-nowrap">
            {projectCalendar.name?.length != 0 ? (
              <div className="flex w-full gap-2 py-1 px-2 text-sm bg-white rounded-md border-text-primary border-[1px] items-center">
                <a className="w-[75%]">{projectCalendar.name}</a>

                <div className="flex gap-1 text-xs font-semibold justify-center items-center">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="bg-yellow-400 text-text-inverse px-2 py-[2px] text-center rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="bg-red-400 text-text-inverse px-2 py-[2px]  text-center rounded-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : null}
            {localCalendars.map((calendar, index) => {
              return (
                <div
                  key={index}
                  className="flex w-full gap-2 py-1 px-2 text-sm bg-white rounded-md border-text-primary border-[1px] items-center"
                >
                  <a className="w-[75%]">{calendar.name}</a>
                  <div className="flex gap-1 text-xs font-semibold justify-center items-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditCalendar(O.Some([calendar, index]));
                        setOpenAddCalendar(false);
                      }}
                      className="bg-yellow-500 text-text-inverse px-2 py-[2px] text-center rounded-md"
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
                      className="bg-red-600 text-text-inverse px-2 py-[2px]  text-center rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setOpenAddCalendar(!openAddCalendar);
                setEditCalendar(O.None());
              }}
              className="text-primary-500 w-full text-sm border-primary-500 border-[1px] rounded-md"
            >
              + Add Calendar
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full flex flex-col gap-1 flex-nowrap items-center">
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
                  className="rounded-md bg-red-600 min-w-[25%] max-w-[50%] text-text-inverse font-semibold "
                >
                  Delete
                </button>
              );
            },
          )}
          <input
            value={"Save"}
            type="submit"
            className="w-full rounded-md text-text-inverse bg-primary-400 font-semibold py-1"
          />
        </div>
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
