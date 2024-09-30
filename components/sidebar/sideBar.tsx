import { StorageContext } from "@/hooks/dataHook";
import {
  ComponentPropsWithoutRef,
  Dispatch,
  PropsWithChildren,
  RefObject,
  SetStateAction,
  createContext,
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
import { HTMLDivExtended } from "@/utils/types";
import { ListContainer } from "../shared/list-view/list";
import { Button } from "../shared/button-view/buttons";
import { Titles } from "../shared/title-view/titles";
import { MiniCalendar } from "../calendar-mini-calendar/miniCalendar";
import { CalendarModeContext } from "../calendar-editor-week-view/contexts";
import { EventsDisplayedContext } from "../calendar-editor-week-view/calendarEditorWeek";

const useViewableCalendars = ({
  viewableCalendarsState,
}: {
  viewableCalendarsState: O.Option<
    [
      Omit<Map<string, boolean>, "set" | "clear" | "delete">,
      Actions<string, boolean>,
    ]
  >;
}) => {
  const [calendars, setCalendars] = useState<O.Option<Map<string, boolean>>>(
    O.None(),
  );
  const [calendarsFound, setCalendarsFound] = useState<Calendar[]>([]);
  const [isCalendarViewable, setCalendarViewable] = useState<
    O.Option<Actions<string, boolean>>
  >(O.None());
  const { storages, listeners } = useContext(StorageContext);

  useEffect(() => {
    if (viewableCalendarsState.isSome()) {
      const [viewableCalendars, viewableCalendarsActions] =
        viewableCalendarsState.unwrap();
      setCalendars(O.Some(viewableCalendars as any));

      setCalendarViewable(O.Some(viewableCalendarsActions));
    }
  }, [viewableCalendarsState]);

  useEffect(() => {
    storages.map(({ calendarsStorage }) => {
      calendarsStorage.all().then((allCalendars) => {
        setCalendarsFound(allCalendars);
      });
    });
  }, [storages, listeners.calendarsStorageListener]);

  return { calendars, calendarsFound, isCalendarViewable };
};

type Setter<T> = Dispatch<SetStateAction<T>>;

const SideBarContainerFormContext = createContext<{
  setSelectedCalendar: Setter<O.OptionClass<Calendar>>;
  setOpen: Setter<boolean>;
  refButton: O.Option<RefObject<any>>;
}>({ setSelectedCalendar: () => {}, setOpen: () => {}, refButton: O.None() });

const SideBarContainer = ({
  children,
  ...arg
}: PropsWithChildren<ComponentPropsWithoutRef<"div">>) => {
  const [open, setOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<O.Option<Calendar>>(
    O.None(),
  );
  const refButton = useRef(null);
  return (
    <div
      {...arg}
      className={`${arg.className} flex flex-col gap-1 min-w-fit flex-none`}
    >
      <SideBarContainerFormContext.Provider
        value={{ setOpen, setSelectedCalendar, refButton: O.Some(refButton) }}
      >
        {children}
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
      </SideBarContainerFormContext.Provider>
    </div>
  );
};

const CalendarsNormalCard = ({
  viewableCalendarsState,
}: {
  viewableCalendarsState: O.Option<
    [
      Omit<Map<string, boolean>, "set" | "clear" | "delete">,
      Actions<string, boolean>,
    ]
  >;
}) => {
  const { calendarsFound, calendars, isCalendarViewable } =
    useViewableCalendars({ viewableCalendarsState });

  const { setOpen, setSelectedCalendar, refButton } = useContext(
    SideBarContainerFormContext,
  );

  return (
    <ListContainer
      titleSection={<Titles.Normal name="Calendars" />}
      buttonSection={
        <Button.Primary
          className="w-full p-1 sticky bottom-0"
          innerRef={refButton.isSome() ? refButton.unwrap() : undefined}
          onClick={() => setOpen(!open)}
          value="New"
          sizeType="xl"
        />
      }
      className="p-1"
    >
      {calendarsFound.map((calendar) => {
        const viewableCalendars = calendars.unwrap();

        const defaultChecked = viewableCalendars.get(calendar.id) ?? true;

        return (
          <CalendarListItemNormal
            key={calendar.id}
            actions={isCalendarViewable}
            calendar={calendar}
            defaultChecked={defaultChecked}
            selectCalendar={setSelectedCalendar}
          />
        );
      })}
    </ListContainer>
  );
};

const useEventsDistribution = () => {
  const [eventsDistribution, setEventDistribution] = useState(
    new Map<string, number>(),
  );

  const displayedEvents = useContext(EventsDisplayedContext);

  useEffect(() => {
    displayedEvents.map(([events]) => {
      setEventDistribution(
        events.reduce((acc, value) => {
          const foundCalendarCount = acc.get(value.calendar_id) ?? 0;
          return acc.set(
            value.calendar_id,
            foundCalendarCount + 1 / events.length,
          );
        }, new Map<string, number>()),
      );
    });
  }, [displayedEvents]);

  return {
    distribution: eventsDistribution,
  };
};

const CalendarsEditorCard = ({
  viewableCalendarsState,
}: {
  viewableCalendarsState: O.Option<
    [
      Omit<Map<string, boolean>, "set" | "clear" | "delete">,
      Actions<string, boolean>,
    ]
  >;
}) => {
  const { distribution: eventsDistribution } = useEventsDistribution();

  const { isCalendarViewable, calendars, calendarsFound } =
    useViewableCalendars({ viewableCalendarsState });

  const { setOpen, setSelectedCalendar, refButton } = useContext(
    SideBarContainerFormContext,
  );

  return (
    <ListContainer
      titleSection={<Titles.Normal name="Calendars" />}
      buttonSection={
        <Button.Primary
          className="w-full p-1 sticky bottom-0"
          innerRef={refButton.isSome() ? refButton.unwrap() : undefined}
          onClick={() => setOpen(!open)}
          value="New"
          sizeType="xl"
        />
      }
      className="p-1"
    >
      {calendarsFound.map((calendar) => {
        const viewableCalendars = calendars.unwrap();

        const defaultChecked = viewableCalendars.get(calendar.id) ?? true;

        return (
          <CalendarListItemEditor
            key={calendar.id}
            actions={isCalendarViewable}
            calendar={calendar}
            defaultChecked={defaultChecked}
            selectCalendar={setSelectedCalendar}
            distribution={eventsDistribution.get(calendar.id) ?? 0}
          />
        );
      })}
    </ListContainer>
  );
};

const ModeCard = ({}) => {
  const [calendarMode, setCalendarMode] = useContext(CalendarModeContext);
  return (
    <div
      className={`inline-flex items-center justify-center w-full p-1 min-w-fit bg-white rounded-xl shadow-lg border-[1px] border-neutral-200 overflow-hidden text-neutral-600`}
    >
      <span className="m-2 text-lg text-neutral-600 select-none">{"Mode"}</span>
      <label className="relative inline-flex items-center cursor-pointer ml-auto mr-2">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={calendarMode
            .map((mode) => mode === "editor")
            .unwrapOrElse(() => false)}
          onChange={() => {
            setCalendarMode((mode) =>
              mode.map((mode) => (mode === "normal" ? "editor" : "normal")),
            );
          }}
        />
        <div className="w-10 h-5 border-primary-100 border-[2px] peer-focus:outline-none rounded-full peer peer-checked:after:start-[24px] rtl:peer-checked:after:-translate-x-1/2 peer-checked:after:border-primary-300 peer-checked:after:bg-primary-300 after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-primary-200 after:border-primary-200 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-100" />
        <span className="ml-1 text-sm text-neutral-600 select-none">
          {calendarMode
            .map((mode) =>
              mode == "normal"
                ? "Normal"
                : mode === "editor"
                ? "Editor"
                : "Normal",
            )
            .unwrapOrElse(() => "Normal")}
        </span>
      </label>
    </div>
  );
};

const NullComponent = (_props: any) => <></>;

const SideBar = ({
  viewableCalendarsState,
  ...args
}: HTMLDivExtended<
  HTMLDivElement,
  {
    viewableCalendarsState: O.Option<
      [
        Omit<Map<string, boolean>, "set" | "clear" | "delete">,
        Actions<string, boolean>,
      ]
    >;
  }
>) => {
  const [calendarMode] = useContext(CalendarModeContext);
  console.log(calendarMode);
  const CalendarCard = calendarMode
    .map((mode) =>
      mode === "editor"
        ? CalendarsEditorCard
        : mode === "normal"
        ? CalendarsNormalCard
        : NullComponent,
    )
    .unwrapOrElse(() => NullComponent);
  return (
    <SideBarContainer {...args}>
      <ModeCard />
      <MiniCalendar className="p-1" />
      <CalendarCard viewableCalendarsState={viewableCalendarsState} />
    </SideBarContainer>
  );
};

const CalendarListItemNormal = ({
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

const CalendarListItemEditor = ({
  actions,
  calendar,
  defaultChecked,
  distribution,
  selectCalendar: setSelectedCalendar,
}: {
  actions: O.Option<Actions<string, boolean>>;
  calendar: Calendar;
  defaultChecked: boolean;
  selectCalendar: (value: O.Option<Calendar>) => void;
  distribution: number;
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
      <div className="ml-auto text-neutral-600 p-1 max-w-fit whitespace-nowrap text-center align-start">
        {Math.round(distribution * 100 * 100) / 100}%
      </div>
      <Button.Secondary
        onClick={() => {
          setSelectedCalendar(O.Some(calendar));
        }}
        className="p-1 flex-none ml-1"
        value="Edit"
        sizeType="ml"
      />
    </li>
  );
};

export default SideBar;
