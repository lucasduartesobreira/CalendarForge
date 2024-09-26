import { StorageContext } from "@/hooks/dataHook";
import { useContext, useEffect, useRef, useState } from "react";
import * as O from "@/utils/option";
import { Calendar } from "@/services/calendar/calendar";
import UpdateCalendarForm from "@/components/calendar-update-form/updateCalendar";
import { Actions } from "@/hooks/mapHook";
import { CreateCalendarForm } from "@/components/calendar-create-form/createCalendar";
import { HTMLDivExtended } from "@/utils/types";
import { ListContainer } from "../shared/list-view/list";
import { Button } from "../shared/button-view/buttons";
import { Titles } from "../shared/title-view/titles";
import { MiniCalendar } from "../calendar-mini-calendar/miniCalendar";
import { CalendarModeContext } from "../calendar-editor-week-view/contexts";

const SideBar = (
  args: HTMLDivExtended<
    HTMLDivElement,
    {
      viewableCalendarsState: O.Option<
        [
          Omit<Map<string, boolean>, "set" | "clear" | "delete">,
          Actions<string, boolean>,
        ]
      >;
      startDate: Date;
    }
  >,
) => {
  const { viewableCalendarsState, startDate, ...arg } = args;
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

  const [calendarMode, setCalendarMode] = useContext(CalendarModeContext);
  return (
    <div
      {...arg}
      className={`${arg.className} flex flex-col gap-1 min-w-fit flex-none`}
    >
      {storages.isSome() &&
        calendars.isSome() &&
        actions.isSome() &&
        calendarMode.isSome() && (
          <>
            <div
              className={`inline-flex items-center justify-center w-full p-1 min-w-fit bg-white rounded-xl shadow-lg border-[1px] border-neutral-200 overflow-hidden text-neutral-600`}
            >
              <span className="m-2 text-lg text-neutral-600 select-none">
                {"Mode"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer ml-auto mr-2">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={false}
                  onChange={() => {
                    setCalendarMode(O.Some("editor"));
                  }}
                />
                <div className="w-10 h-5 border-primary-100 border-[2px] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-primary-300 peer-checked:after:bg-primary-300 after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-primary-200 after:border-primary-200 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-200" />
                <span className="ml-1 text-sm text-neutral-600 select-none">
                  {"Normal"}
                </span>
              </label>
            </div>
            <MiniCalendar className="p-1" />
            <ListContainer
              titleSection={<Titles.Normal name="Calendars" />}
              buttonSection={
                <Button.Primary
                  className="w-full p-1 sticky bottom-0"
                  innerRef={refButton}
                  onClick={() => setOpen(!open)}
                  value="New"
                  sizeType="xl"
                />
              }
              className="p-1"
            >
              {calendarsFound.map((calendar) => {
                const viewableCalendars = calendars.unwrap();

                const defaultChecked =
                  viewableCalendars.get(calendar.id) ?? true;

                return (
                  <CalendarSidebarView
                    key={calendar.id}
                    actions={actions}
                    calendar={calendar}
                    defaultChecked={defaultChecked}
                    selectCalendar={setSelectedCalendar}
                  />
                );
              })}
            </ListContainer>
          </>
        )}
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

const CalendarSidebarView = ({
  actions,
  calendar,
  defaultChecked,
  selectCalendar: setSelectedCalendar,
}: {
  actions: O.Option<Actions<string, boolean>>;
  calendar: Calendar;
  defaultChecked: boolean;
  selectCalendar: (value: O.Option<Calendar>) => void;
}) => {
  return (
    <li className="flex items-center w-full relative max-w-[12rem]">
      <input
        type="checkbox"
        onChange={(event) => {
          actions.unwrap().set(calendar.id, event.target.checked);
        }}
        defaultChecked={defaultChecked}
        className="px-[2px]"
      />
      <div className="text-neutral-600 p-1 whitespace-nowrap overflow-hidden truncate">
        {calendar.name}
      </div>
      <Button.Secondary
        onClick={() => {
          setSelectedCalendar(O.Some(calendar));
        }}
        className="ml-auto p-1 flex-none"
        value="Edit"
        sizeType="ml"
      />
    </li>
  );
};

export default SideBar;
