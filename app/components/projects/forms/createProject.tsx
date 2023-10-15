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
        <label className="flex flex-nowrap gap-1 items-center">
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
        <div className="flex flex-col flex-nowrap gap-1 justify-center w-full mb-4">
          <a className="text-neutral-500 text-sm">Calendars</a>
          {projectCalendar.name?.length != 0 ? (
            <div>{projectCalendar.name}</div>
          ) : null}
          <div className="bg-neutral-200 px-2 py-2 rounded-md gap-1 flex flex-col flex-nowrap">
            {localCalendars.map((calendar, index) => {
              return (
                <div
                  key={index}
                  className="flex w-full gap-2 py-1 px-2 text-sm bg-white rounded-md border-text-primary border-[1px] items-center"
                >
                  <a className="w-[75%]">{calendar.name}</a>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditCalendar(O.Some([calendar, index]));
                        setOpenAddCalendar(false);
                      }}
                      className="bg-yellow-500 text-text-inverse px-1 rounded-md"
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
                      className="bg-red-600 text-text-inverse px-1 rounded-md"
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
        <input
          value={"Save"}
          type="submit"
          className="absolute bottom-0 left-0 w-full rounded-md text-white bg-primary-400 font-semibold"
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
