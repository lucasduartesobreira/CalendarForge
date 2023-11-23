import { StorageContext } from "@/hooks/dataHook";
import {
  DetailedHTMLProps,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as O from "@/utils/option";
import { Calendar } from "@/services/calendar/calendar";
import UpdateCalendarForm from "@/components/calendar-update-form/updateCalendar";
import { Actions } from "@/hooks/mapHook";
import { CreateCalendarForm } from "@/components/calendar-create-form/createCalendar";

const SideBar = (
  args: DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > & {
    viewableCalendarsState: O.Option<
      [
        Omit<Map<string, boolean>, "set" | "clear" | "delete">,
        Actions<string, boolean>,
      ]
    >;
  },
) => {
  const { viewableCalendarsState, ...arg } = args;
  const [calendars, setCalendars] = useState<O.Option<Map<string, boolean>>>(
    O.None(),
  );
  const [calendarsFound, setCalendarsFound] = useState<Calendar[]>([]);
  const [actions, setActions] = useState<O.Option<Actions<string, boolean>>>(
    O.None(),
  );
  const { storages, listeners } = useContext(StorageContext);
  const [open, setOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<O.Option<Calendar>>(
    O.None(),
  );

  useEffect(() => {
    if (viewableCalendarsState.isSome()) {
      const [viewableCalendars, viewableCalendarsActions] =
        viewableCalendarsState.unwrap();
      setCalendars(O.Some(viewableCalendars as any));

      setActions(O.Some(viewableCalendarsActions));
    }
  }, [viewableCalendarsState]);

  useEffect(() => {
    storages.map(({ calendarsStorage }) => {
      calendarsStorage.all().then((allCalendars) => {
        setCalendarsFound(allCalendars);
      });
    });
  }, [storages, listeners.calendarsStorageListener]);

  const refButton = useRef(null);

  return (
    <div
      {...arg}
      className={`${args.className} grid grid-rows-[auto_48px] grid-cols-[auto] bg-white`}
    >
      <div className="overflow-auto row-start-1">
        {storages.isSome() && calendars.isSome() && actions.isSome() && (
          <div className="bg-white rounded-xl shadow-lg border-[1px] border-neutral-200 m-1 overflow-hidden">
            <span className="m-2 text-neutral-600 bg-white text-lg ">
              Calendars
            </span>
            <ul className="text-sm bg-white p-2 flex flex-col">
              {calendarsFound.map((calendar, index) => {
                const viewableCalendars = calendars.unwrap();

                const defaultChecked =
                  viewableCalendars.get(calendar.id) ?? true;
                return (
                  <li
                    key={index}
                    className="flex items-center gap-2 w-full relative"
                  >
                    <input
                      type="checkbox"
                      onChange={(event) => {
                        actions.unwrap().set(calendar.id, event.target.checked);
                      }}
                      defaultChecked={defaultChecked}
                      className="px-[2px]"
                    ></input>
                    <div className="text-neutral-600 p-1 max-w-[70%] whitespace-nowrap overflow-hidden">
                      {calendar.name}
                    </div>
                    <button
                      className="flex-none ml-auto text-yellow-500 p-1"
                      onClick={() => {
                        setSelectedCalendar(O.Some(calendar));
                      }}
                    >
                      Edit
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              className="w-full bg-primary-500 text-white rounded-xl shadow-xl p-1 sticky bottom-0"
              ref={refButton}
              onClick={() => setOpen(!open)}
            >
              New
            </button>
          </div>
        )}
      </div>
      {open && (
        <CreateCalendarForm setOpen={setOpen} refs={O.Some([refButton])} />
      )}
      {selectedCalendar.isSome() && (
        <UpdateCalendarForm
          setOpen={(_arg: boolean) => setSelectedCalendar(O.None())}
          refs={O.None()}
          initialCalendar={selectedCalendar.unwrap()}
        />
      )}
    </div>
  );
};

export default SideBar;
