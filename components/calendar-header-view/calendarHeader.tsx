import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Home,
} from "lucide-react";
import {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SelectedDateContext } from "../calendar-navbar/selectedDateContext";
import {
  lastWeekMidnight,
  nextWeekMidnight,
  sundayInTheWeek,
} from "@/utils/date";
import { twMerge } from "tailwind-merge";

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
      <IconButton
        className={twMerge("ml-auto", todayButtonHidden, collapseContent)}
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