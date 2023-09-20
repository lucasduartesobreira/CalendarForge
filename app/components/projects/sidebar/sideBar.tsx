import { StorageContext } from "@/hooks/dataHook";
import { PropsWithChildren, useContext, useRef, useState } from "react";
import { CreateProjectForm } from "../forms/createProject";
import * as O from "@/utils/option";
import * as R from "@/utils/result";
import { Calendar, Timezones } from "@/services/calendar/calendar";

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
            return (
              <div key={project.id}>
                <a>{project.title}</a>
                <button className="text-yellow-500">Edit</button>
              </div>
            );
          })}
    </div>
  );
};

const AddNew = () => {
  const [openForm, setOpenForm] = useState(false);
  const { storages } = useContext(StorageContext);
  const ref = useRef(null);
  if (storages.isSome()) {
    const { calendarsStorage, projectsStorage } = storages.unwrap();
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
          <CreateProjectForm
            setOpenForm={setOpenForm}
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
    );
  }
};

const ProjectsSideBar = {
  SideBar,
  Content,
  AddNew,
};

export default ProjectsSideBar;
