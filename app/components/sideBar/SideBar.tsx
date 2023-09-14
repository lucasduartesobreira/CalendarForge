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
import { None, Option, Some } from "@/utils/option";
import {
  Calendar,
  CreateCalendar,
  Timezones,
} from "@/services/calendar/calendar";
import UpdateCalendarForm from "../calendar/updateCalendar/updateCalendar";
import { Actions } from "@/hooks/mapHook";

const initialCalendar: CreateCalendar = { name: "", timezone: 0 };

const CreateCalendarForm = ({
  refs,
  setOpen,
}: {
  refs: Option<RefObject<any>[]>;
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
      >
        <form
          onSubmit={() => {
            calendarsStorage.add(form);
            setOpen(false);
          }}
          className="fixed z-[2000] top-1/2 left-1/2 text-gray-500 flex flex-col gap-[4px] p-4 bg-white rounded-md"
        >
          <input
            title="name"
            type="text"
            placeholder="Name"
            className="text-black m-2 bg-gray-200"
            onChange={(e) => {
              form.name = e.target.value;
              setForm(form);
            }}
          />
          <label>
            Timezone
            <select
              className="text-black m-2 bg-gray-200"
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
            className="flex-auto relative r-4 text-white bg-blue-600 rounded-md"
            value={"Save"}
          />
        </form>
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
    viewableCalendarsState: Option<
      [
        Omit<Map<string, boolean>, "set" | "clear" | "delete">,
        Actions<string, boolean>,
      ]
    >;
  },
) => {
  const { viewableCalendarsState, ...arg } = args;
  const [calendars, setCalendars] = useState<Option<Map<string, boolean>>>(
    None(),
  );
  const [actions, setActions] = useState<Option<Actions<string, boolean>>>(
    None(),
  );
  const { storages } = useContext(StorageContext);
  const [open, setOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<Option<Calendar>>(
    None(),
  );

  useEffect(() => {
    if (viewableCalendarsState.isSome()) {
      const [viewableCalendars, viewableCalendarsActions] =
        viewableCalendarsState.unwrap();
      setCalendars(Some(viewableCalendars as any));

      setActions(Some(viewableCalendarsActions));
    }
  }, [viewableCalendarsState]);

  const refButton = useRef(null);

  return (
    <div
      {...arg}
      className={`${args.className} grid grid-rows-[auto_48px] grid-cols-[auto]`}
    >
      <div className="overflow-auto row-start-1">
        {storages.isSome() && calendars.isSome() && actions.isSome() && (
          <ul className="">
            {storages
              .unwrap()
              .calendarsStorage.getCalendars()
              .map((calendar, index) => {
                const viewableCalendars = calendars.unwrap();

                const defaultChecked =
                  viewableCalendars.get(calendar.id) ?? true;
                return (
                  <li key={index}>
                    <input
                      type="checkbox"
                      onChange={(event) => {
                        actions.unwrap().set(calendar.id, event.target.checked);
                      }}
                      defaultChecked={defaultChecked}
                    ></input>
                    {calendar.name}{" "}
                    <button
                      className="text-yellow-100"
                      onClick={() => {
                        setSelectedCalendar(Some(calendar));
                      }}
                    >
                      Edit
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
      <button
        className="row-start-2"
        ref={refButton}
        onClick={() => setOpen(!open)}
      >
        New Calendar
      </button>
      {open && (
        <CreateCalendarForm setOpen={setOpen} refs={Some([refButton])} />
      )}
      {selectedCalendar.isSome() && (
        <UpdateCalendarForm
          setOpen={(_arg: boolean) => setSelectedCalendar(None())}
          refs={None()}
          initialCalendar={selectedCalendar.unwrap()}
        />
      )}
    </div>
  );
};

export default SideBar;
