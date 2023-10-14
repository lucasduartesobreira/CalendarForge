import { StorageContext } from "@/hooks/dataHook";
import {
  DetailedHTMLProps,
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import OutsideClick from "../utils/outsideClick";
import * as O from "@/utils/option";
import {
  Calendar,
  CreateCalendar,
  Timezones,
} from "@/services/calendar/calendar";
import UpdateCalendarForm from "../calendar/updateCalendar/updateCalendar";
import { Actions } from "@/hooks/mapHook";

const initialCalendar: CreateCalendar = {
  name: "",
  timezone: 0,
  default: false,
};

const CreateCalendarForm = ({
  refs,
  setOpen,
}: {
  refs: O.Option<RefObject<any>[]>;
  setOpen: (open: boolean) => void;
}) => {
  const [form, setForm] = useState(initialCalendar);
  const { storages: storages } = useContext(StorageContext);

  if (storages.isSome()) {
    const { calendarsStorage } = storages.unwrap();
    return (
      <OutsideClick
        doSomething={() => {
          setOpen(false);
        }}
        refs={refs}
        className="fixed z-[2000] top-1/2 left-1/2"
      >
        <div className="flex">
          <form
            onSubmit={() => {
              calendarsStorage.add(form);
              setOpen(false);
            }}
            className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden"
          >
            <div className="w-full absolute top-0 h-[16px] left-0 bg-neutral-300 flex">
              <button
                className="ml-auto mr-3 text-neutral-500 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                X
              </button>
            </div>
            <input
              title="name"
              type="text"
              placeholder="Name"
              className="text-black px-2 py-1 mt-2 bg-neutral-200 text-base rounded-md"
              onChange={(e) => {
                form.name = e.target.value;
                setForm(form);
              }}
            />
            <label className="text-sm mx-1 mb-4">
              Timezone
              <select
                className="text-text-primary mx-2 bg-neutral-200 rounded-md"
                onChange={(e) => {
                  const timezone = Number(e.target.value);
                  if (timezone >= -12 && timezone <= 12)
                    form.timezone = timezone as Timezones;

                  setForm(form);
                }}
                defaultValue={-new Date().getTimezoneOffset() / 60}
              >
                <option value={-12}>(GMT-12:00)</option>
                <option value={-11}>(GMT-11:00)</option>
                <option value={-10}>(GMT-10:00)</option>
                <option value={-9}>(GMT-9:00)</option>
                <option value={-8}>(GMT-8:00)</option>
                <option value={-7}>(GMT-7:00)</option>
                <option value={-6}>(GMT-6:00)</option>
                <option value={-5}>(GMT-5:00)</option>
                <option value={-4}>(GMT-4:00)</option>
                <option value={-3}>(GMT-3:00)</option>
                <option value={-2}>(GMT-2:00)</option>
                <option value={-1}>(GMT-1:00)</option>
                <option value={0}>(GMT0:00)</option>
                <option value={1}>(GMT1:00)</option>
                <option value={2}>(GMT2:00)</option>
                <option value={3}>(GMT3:00)</option>
                <option value={4}>(GMT4:00)</option>
                <option value={5}>(GMT5:00)</option>
                <option value={6}>(GMT6:00)</option>
                <option value={7}>(GMT7:00)</option>
                <option value={8}>(GMT8:00)</option>
                <option value={9}>(GMT9:00)</option>
                <option value={10}>(GMT10:00)</option>
                <option value={11}>(GMT11:00)</option>
                <option value={12}>(GMT12:00)</option>
              </select>
            </label>
            <input
              type="submit"
              className="absolute bottom-0 w-full left-0 text-white bg-primary-500 rounded-md"
              value={"Save"}
            />
          </form>
        </div>
      </OutsideClick>
    );
  }

  return null;
};

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
  const [actions, setActions] = useState<O.Option<Actions<string, boolean>>>(
    O.None(),
  );
  const { storages } = useContext(StorageContext);
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
              {storages
                .unwrap()
                .calendarsStorage.all()
                .map((calendar, index) => {
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
                          actions
                            .unwrap()
                            .set(calendar.id, event.target.checked);
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
