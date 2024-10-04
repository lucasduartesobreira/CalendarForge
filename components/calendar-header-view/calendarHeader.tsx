import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Home,
  Play,
  Square,
} from "lucide-react";
import {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { SelectedDateContext } from "../calendar-navbar/selectedDateContext";
import {
  lastWeekMidnight,
  nextWeekMidnight,
  sundayInTheWeek,
} from "@/utils/date";
import { twMerge } from "tailwind-merge";
import { useFormHandler } from "../form-handler/formHandler";
import { None } from "@/utils/option";

type State =
  | {
      state: "stopped";
      recording: false;
      startDate: null;
      endDate: null;
      spentTimeInMilliseconds: number;
    }
  | {
      state: "recording";
      recording: true;
      startDate: number;
      endDate: null;
      spentTimeInMilliseconds: number;
    }
  | {
      state: "saving";
      recording: false;
      startDate: number;
      endDate: number;
      spentTimeInMilliseconds: number;
    };

const PlayAndStop = ({ hideStyling }: { hideStyling: string }) => {
  const [recordingState, dispatch] = useReducer(
    (
      recordingState: State,
      action: { type: "start" | "stop" | "finish" | "update" },
    ): State => {
      const { type } = action;
      const { state } = recordingState;

      if (type === "update" && state === "recording") {
        const { startDate, spentTimeInMilliseconds } = recordingState;
        return {
          state: "recording",
          recording: true,
          startDate,
          endDate: null,
          spentTimeInMilliseconds: spentTimeInMilliseconds + 1000,
        };
      }

      if (type === "start" && state === "stopped") {
        return {
          state: "recording",
          recording: true,
          startDate: Date.now(),
          spentTimeInMilliseconds: 0,
          endDate: null,
        };
      }

      if (type === "stop" && state === "recording") {
        const { startDate, spentTimeInMilliseconds } = recordingState;
        return {
          state: "saving",
          recording: false,
          startDate,
          endDate: startDate + spentTimeInMilliseconds,
          spentTimeInMilliseconds: 0,
        };
      }

      return {
        state: "stopped",
        recording: false,
        startDate: null,
        endDate: null,
        spentTimeInMilliseconds: 0,
      };
    },
    {
      recording: false,
      state: "stopped",
      startDate: null,
      endDate: null,
      spentTimeInMilliseconds: 0,
    },
  );

  const {
    recording,
    state,
    startDate,
    endDate,
    spentTimeInMilliseconds: spentMillieconds,
  } = useMemo(() => recordingState, [recordingState]);

  const { setActiveForm: setForm } = useFormHandler();

  useEffect(() => {
    if (state === "saving") {
      setForm(
        "createEvent",
        { startDate, endDate },
        None(),
        () => {},
        () => {
          dispatch({ type: "finish" });
        },
      );
    }
  }, [state]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (recording) {
        dispatch({ type: "update" });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  return (
    <>
      <IconButton
        className={twMerge("ml-auto ", hideStyling, recording ? "hidden" : "")}
        onClick={() => dispatch({ type: "start" })}
      >
        <Play />
      </IconButton>
      <IconButton
        className={twMerge("ml-auto", hideStyling, !recording ? "hidden" : "")}
        onClick={() => dispatch({ type: "stop" })}
      >
        <Square />
      </IconButton>
      <span
        className={twMerge(
          "mr-auto text-center text-align-center my-auto",
          hideStyling,
        )}
      >
        {spentMillieconds > 60000
          ? `${Math.floor(spentMillieconds / 60000)} m`
          : `${spentMillieconds / 1000} s`}
      </span>
    </>
  );
};

export const CalendarHeader = () => {
  const [date, setDate] = useContext(SelectedDateContext);

  const [dateNow, setDateNow] = useState(Date.now());

  useEffect(() => {
    setTimeout(() => setDateNow(() => Date.now()), 60 * 1000);
  }, [dateNow]);

  const todayButtonHidden = useMemo(() => {
    const timeDiffBetweenNowAndSelected = dateNow - date.getTime();
    return timeDiffBetweenNowAndSelected < 7 * 24 * 60 * 60 * 1000 &&
      timeDiffBetweenNowAndSelected > 0
      ? "invisible"
      : "visible";
  }, [dateNow, date]);

  const [collapseHeader, setDisplay] = useState(true);

  const collapseContent = useMemo(
    () => (collapseHeader ? "hidden opacity-0" : "opacity-100"),
    [collapseHeader],
  );
  const CollapseIcon = useMemo(
    () => (collapseHeader ? ChevronDown : ChevronUp),
    [collapseHeader],
  );
  const paddingChange = useMemo(
    () => (collapseHeader ? "py-0 -mb-[4px]" : ""),
    [collapseHeader],
  );

  return (
    <div
      className={twMerge(
        "relative ml-[4px] mr-[16px] py-[4px] border rounded-b-md drop-shadow-md min-h-2 text-gray-600 inline-flex align-center px-[4px] gap-2 transition-all ease-out",
        paddingChange,
      )}
    >
      <IconButton
        className={"w-auto h-auto self-center"}
        onClick={() => setDisplay((hide) => !hide)}
      >
        <CollapseIcon size={16} />
      </IconButton>
      <PlayAndStop hideStyling={collapseContent} />
      <IconButton
        className={twMerge(todayButtonHidden, collapseContent)}
        onClick={() => setDate(() => sundayInTheWeek(new Date(dateNow)))}
      >
        <Home />
      </IconButton>
      <IconButton
        className={twMerge(collapseContent)}
        onClick={() => {
          setDate((date) => lastWeekMidnight(date));
        }}
      >
        <ChevronLeft />
      </IconButton>
      <IconButton
        className={twMerge(collapseContent)}
        onClick={() => {
          setDate((date) => nextWeekMidnight(date));
        }}
      >
        <ChevronRight />
      </IconButton>
    </div>
  );
};

const IconButton = ({
  className,
  children,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"button">>) => {
  return (
    <button
      className={twMerge(
        "inline-flex justify-center align-center w-6 h-6 text-primary-500 hover:bg-gray-100 rounded-md",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
