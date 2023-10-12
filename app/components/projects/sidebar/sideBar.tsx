import { StorageContext } from "@/hooks/dataHook";
import {
  PropsWithChildren,
  RefObject,
  useContext,
  useReducer,
  useRef,
  useState,
} from "react";
import { ProjectForm } from "../forms/createProject";
import * as O from "@/utils/option";
import * as R from "@/utils/result";
import { Calendar, Timezones } from "@/services/calendar/calendar";
import { Project } from "@/services/projects/projectsStorage";
import { UpdateValue } from "@/utils/storage";

const SideBar = ({ children }: PropsWithChildren) => {
  return <div className="flex-none relative w-[15%] h-[100%]">{children}</div>;
};

const Content = ({
  selectProject,
}: {
  selectProject: (project: O.Option<Project>) => void;
}) => {
  const { storages } = useContext(StorageContext);
  const [edit, setEdit] = useState<O.Option<Project>>(O.None());
  const refList = useRef(null);

  return (
    <div className="bg-white rounded-t-xl shadow-lg border-[1px] border-neutral-200 m-1 overflow-hidden">
      {storages.mapOrElse(
        () => null,
        ({ projectsStorage, calendarsStorage }) => (
          <>
            <span className="p-2 text-neutral-600 bg-white text-lg ">
              Projects
            </span>
            <div ref={refList} className="text-sm bg-white p-2 flex flex-col">
              {projectsStorage.all().map((project) => {
                return (
                  <ProjectItemList
                    key={project.id}
                    setEdit={setEdit}
                    selectProject={selectProject}
                    project={project}
                  ></ProjectItemList>
                );
              })}
            </div>

            {edit.mapOrElse(
              () => null,
              (project) => {
                const [first, ...rest] = project.calendars;
                const projectCalendar = first
                  ? calendarsStorage.findById(first)
                  : O.None();
                const calendars = rest
                  .map((id) => calendarsStorage.findById(id))
                  .reduce(
                    (acc, value) => {
                      return acc
                        .map((calendars) => {
                          return value.map((calendar) => {
                            calendars.push(calendar);
                            return calendars;
                          });
                        })
                        .flatten();
                    },
                    O.Some([] as Calendar[]),
                  );

                return (
                  projectCalendar.isSome() &&
                  calendars.isSome() && (
                    <ProjectForm
                      setOpenForm={() => setEdit(O.None())}
                      deleteButton={O.Some(() => {
                        projectsStorage.remove(project.id);
                      })}
                      refs={O.Some([refList])}
                      initialForm={project as UpdateValue<Project>}
                      initialProjectCalendar={projectCalendar.unwrap()}
                      fixProjectCalendar={(form, localCalendars) => {
                        localCalendars.name = `${form.title} Calendar`;
                        return { ...localCalendars };
                      }}
                      initialCalendars={calendars.unwrap()}
                      onSubmit={(_e, form, localCalendars) => {
                        const calendarsSaved = localCalendars.reduce(
                          (acc, calendar) => {
                            if (!acc.isOk()) {
                              return acc;
                            }
                            const calendarsSaved = acc.unwrap();

                            const { id, ...restCalendar } = calendar;

                            if (!id) {
                              return calendarsStorage
                                .add(restCalendar)
                                .mapOrElse<
                                  R.Result<
                                    [Calendar, O.Option<Calendar>][],
                                    [symbol, [Calendar, O.Option<Calendar>][]]
                                  >
                                >(
                                  (err) =>
                                    R.Err([err, calendarsSaved] as [
                                      symbol,
                                      [Calendar, O.Option<Calendar>][],
                                    ]),
                                  (calendar) => {
                                    calendarsSaved.push([calendar, O.None()]);
                                    return R.Ok(calendarsSaved);
                                  },
                                );
                            }

                            const result = calendarsStorage
                              .findById(id)
                              .mapOrElse(
                                () =>
                                  calendarsStorage
                                    .add(restCalendar)
                                    .map(
                                      (calendar) =>
                                        [calendar, O.None()] as const,
                                    ),
                                (calendar) => {
                                  return calendarsStorage
                                    .update(id, restCalendar)
                                    .map(
                                      (updatedCalendar) =>
                                        [
                                          updatedCalendar,
                                          O.Some(calendar),
                                        ] as const,
                                    );
                                },
                              );
                            return result
                              .map(([calendar, option]) => {
                                calendarsSaved.push([calendar, option]);
                                return calendarsSaved;
                              })
                              .mapErr(
                                (err) =>
                                  [err, calendarsSaved] as [
                                    symbol,
                                    typeof calendarsSaved,
                                  ],
                              );
                          },
                          R.Ok([]) as R.Result<
                            [Calendar, O.Option<Calendar>][],
                            [symbol, [Calendar, O.Option<Calendar>][]]
                          >,
                        );

                        if (!calendarsSaved.isOk()) {
                          const [_errorMsg, calendars] =
                            calendarsSaved.unwrap_err();

                          calendars.forEach(([, found]) =>
                            found.map((calendar) =>
                              calendarsStorage.update(calendar.id, calendar),
                            ),
                          );

                          return;
                        }

                        projectsStorage.update(project.id, {
                          ...form,
                          calendars: calendarsSaved
                            .unwrap()
                            .map(([{ id }]) => id),
                        });
                      }}
                    />
                  )
                );
              },
            )}
          </>
        ),
      )}
      <AddNew></AddNew>
    </div>
  );
};

const ProjectItemList = ({
  project,
  selectProject,
  setEdit,
}: {
  project: Project;
  selectProject: (project: O.Option<Project>) => void;
  setEdit: (project: O.Option<Project>) => void;
}) => {
  const ref = useRef(null);
  return (
    <div
      key={project.id}
      onClick={(e) => {
        if (
          ref.current != null &&
          !(ref as RefObject<any>).current.contains(e.target)
        ) {
          selectProject(O.Some(project));
        }
      }}
      className="flex items-center gap-2 w-full relative"
    >
      <a className="text-neutral-600 p-1 max-w-[70%] whitespace-nowrap overflow-hidden">
        {project.title}
      </a>
      <button
        className="flex-none ml-auto text-yellow-500 p-1"
        ref={ref}
        onClick={(e) => {
          setEdit(O.Some(project));
        }}
      >
        Edit
      </button>
    </div>
  );
};

const AddNew = () => {
  const [openForm, setOpenForm] = useState(false);
  const { storages } = useContext(StorageContext);
  const ref = useRef(null);
  return storages.mapOrElse(
    () => null,
    ({ calendarsStorage, projectsStorage }) => (
      <>
        <button
          ref={ref}
          className="sticky bottom-0 rounded-xl shadow-xl text-white w-full p-1 bg-primary-500"
          onClick={() => {
            setOpenForm((open) => !open);
          }}
        >
          New Project
        </button>
        {openForm && (
          <ProjectForm
            setOpenForm={setOpenForm}
            deleteButton={O.None()}
            refs={O.Some([ref])}
            initialForm={{
              title: "",
              calendars: [],
            }}
            initialProjectCalendar={{
              name: "",
              default: false,
              timezone: (-new Date().getTimezoneOffset() / 60) as Timezones,
            }}
            fixProjectCalendar={(form, localCalendars) => {
              localCalendars.name = `${form.title} Calendar`;
              return { ...localCalendars };
            }}
            initialCalendars={[]}
            onSubmit={(_e, form, localCalendars) => {
              const calendarsSaved = localCalendars.reduce(
                (acc, calendar) => {
                  if (!acc.isOk()) {
                    return acc;
                  }
                  const calendarsSaved = acc.unwrap();

                  const result = calendarsStorage.add(calendar);
                  if (result.isOk()) {
                    const finalCalendar = result.unwrap();
                    calendarsSaved.push(finalCalendar.id);
                    return R.Ok(calendarsSaved);
                  }

                  return R.Err([result.unwrap_err(), calendarsSaved] as [
                    symbol,
                    Calendar["id"][],
                  ]);
                },
                R.Ok([]) as R.Result<
                  Calendar["id"][],
                  [symbol, Calendar["id"][]]
                >,
              );

              if (!calendarsSaved.isOk()) {
                const [_errorMsg, calendars] = calendarsSaved.unwrap_err();
                calendarsStorage.removeWithFilter(
                  (value) =>
                    calendars.find((id) => id === value.id) != undefined,
                );

                return;
              }

              projectsStorage.add({
                ...form,
                calendars: calendarsSaved.unwrap(),
              });
            }}
          />
        )}
      </>
    ),
  );
};

function Test<This extends string>(bind: This) {
  const fn = function (this: This) {
    return <div>{this}</div>;
  };
  return fn.bind(bind);
}

const ProjectsSideBar = {
  SideBar,
  Content,
  AddNew,
};

export default ProjectsSideBar;
