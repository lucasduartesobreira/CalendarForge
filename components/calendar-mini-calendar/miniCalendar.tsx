import { HTMLDivExtended } from "@/utils/types";
import { useContext, useEffect, useMemo, useState } from "react";
import { SelectedDateContext } from "../calendar-navbar/selectedDateContext";
import { twMerge } from "tailwind-merge";
import { ChevronLeft, ChevronRight, Undo2 } from "lucide-react";

const daysOnMiniCalendarRange = Array.from(new Array(7 * 6));
const daysHeader = Array.from(new Array(1 * 7));

const dayToName = {
  1: "Su",
  2: "Mo",
  3: "Tu",
  4: "We",
  5: "Th",
  6: "Fr",
  7: "Sa",
};

const monthName = {
  0: "January",
  1: "February",
  2: "March",
  3: "April",
  4: "May",
  5: "June",
  6: "July",
  7: "August",
  8: "September",
  9: "October",
  10: "November",
  11: "December",
} as const;

const Nav = ({
  startDate,
  setStartDate,
  today,
}: {
  startDate: Date;
  setStartDate: (v: Date | ((v: Date) => Date)) => void;
  today: Date;
}) => {
  const month = useMemo(
    () => startDate.getMonth() as keyof typeof monthName,
    [startDate],
  );

  const selectedStartDateMonth = useMemo(
    () => today.getMonth() as keyof typeof monthName,
    [today],
  );

  const showGoBack = useMemo(
    () => (month !== selectedStartDateMonth ? "visible" : "invisible"),
    [month, selectedStartDateMonth],
  );

  return (
    <nav className="pl-2 pr-2 ml-1 mr-1 pt-1 mt-1 flex w-full gap-1 items-center text-neutral-400 select-none">
      <a className="mr-auto font-medium text-neutral-600 ">
        {monthName[month]}
      </a>
      <Undo2
        className={twMerge(
          "hover:text-neutral-600 hover:border-1 border-neutral-400 rounded-md cursor-pointer",
          showGoBack,
        )}
        size={20}
        onClick={(e) => {
          e.preventDefault();
          setStartDate(
            (date) => new Date(date.setMonth(selectedStartDateMonth)),
          );
        }}
      />
      <ChevronLeft
        className="hover:text-neutral-600 hover:border-1 border-neutral-400 rounded-md cursor-pointer"
        size={20}
        onClick={(e) => {
          e.preventDefault();
          setStartDate((date) => new Date(date.setMonth(month - 1)));
        }}
      />
      <ChevronRight
        className="hover:text-neutral-600 hover:border-1 border-neutral-400 rounded-md cursor-pointer"
        size={20}
        onClick={(e) => {
          e.preventDefault();
          setStartDate((date) => new Date(date.setMonth(month + 1)));
        }}
      />
    </nav>
  );
};

const MiniCalendarContent = () => {
  const [today, setToday] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] =
    useContext(SelectedDateContext);
  const [startDate, setStartDate] = useState(selectedStartDate);

  useEffect(() => {
    const interval = setInterval(() => setToday(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  });

  useEffect(() => {
    setStartDate(selectedStartDate);
  }, [selectedStartDate]);

  const selectedStartDateAtMidnight = useMemo(
    () => new Date(selectedStartDate).setHours(0, 0, 0, 0),
    [selectedStartDate],
  );
  const selectedStartDatePlusSeven = useMemo(
    () => selectedStartDateAtMidnight + 7 * 24 * 60 * 60 * 1000 - 1,
    [selectedStartDateAtMidnight],
  );

  const firstDayFromLastMonthToShow = useMemo(() => {
    const startDateAsDate = new Date(startDate);
    const firstDayOfTheMonth = new Date(startDateAsDate.setDate(1));

    const dayOfWeekOfFirstDay = firstDayOfTheMonth.getDay();
    const firstDayFromLastMonthToShow = new Date(
      new Date(firstDayOfTheMonth).setDate(1 - dayOfWeekOfFirstDay),
    );

    return firstDayFromLastMonthToShow;
  }, [startDate]);

  const daysOnMiniCalendar = useMemo(
    () =>
      daysOnMiniCalendarRange.map((_v, index) => {
        const day = new Date(
          firstDayFromLastMonthToShow.getTime() + index * 24 * 60 * 60 * 1000,
        );

        const midnightStartDate = new Date(selectedStartDateAtMidnight);
        const midnightStartDatePlusSeven = new Date(selectedStartDatePlusSeven);

        return {
          date: day,
          day: day.getDate(),
          highlighted:
            day.getTime() >= selectedStartDateAtMidnight &&
            day.getTime() <= selectedStartDatePlusSeven,
          firstHighlighted:
            midnightStartDate.getDate() === day.getDate() &&
            midnightStartDate.getMonth() === day.getMonth() &&
            midnightStartDate.getFullYear() === day.getFullYear(),
          lastHighilighted:
            midnightStartDatePlusSeven.getDate() === day.getDate() &&
            midnightStartDatePlusSeven.getMonth() === day.getMonth() &&
            midnightStartDatePlusSeven.getFullYear() === day.getFullYear(),
          isInTheMonth: day.getMonth() === startDate.getMonth(),
          isToday:
            today.getDate() === day.getDate() &&
            today.getMonth() === day.getMonth() &&
            today.getFullYear() === day.getFullYear(),
        };
      }),
    [startDate],
  );

  return (
    <>
      <Nav today={today} startDate={startDate} setStartDate={setStartDate} />
      <div className="rounded-lg grid grid-cols-7 text-xs grid-rows-7 p-1 m-1 min-w-max">
        <div className="grid grid-cols-[subgrid] grid-rows-[subgrid] row-start-1 row-end-[2] col-start-1 col-end-[8]">
          {daysHeader.map((_n, index) => (
            <div
              key={index}
              className="text-neutral-600 select-none text-center border-transparent p-[2px] border-[1px] rounded-md ml-[1px] mr-[1px] aspect-[1/1]"
            >
              {dayToName[(index + 1) as keyof typeof dayToName]}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[subgrid] grid-rows-[subgrid] row-start-2 row-end-[9] col-start-1 col-end-8">
          {daysOnMiniCalendar.map(
            (
              {
                day,
                date,
                highlighted,
                firstHighlighted,
                lastHighilighted,
                isInTheMonth,
                isToday,
              },
              index,
            ) => {
              const highlightedClassName = highlighted
                ? "bg-primary-300 text-text-inverse font-semibold"
                : "";
              const firstHighlightedClassName = firstHighlighted
                ? "rounded-l-md "
                : "";
              const lastHighilightedClassName = lastHighilighted
                ? "rounded-r-md "
                : "";

              const textColor =
                isInTheMonth || highlighted
                  ? "text-neutral-600"
                  : "text-neutral-400 font-bold";

              const todayHighlight = isToday
                ? "bg-primary-500 text-text-inverse"
                : "";

              return (
                <div
                  key={index}
                  className={twMerge(
                    textColor,
                    highlightedClassName,
                    firstHighlightedClassName,
                    lastHighilightedClassName,
                    "p-[1px]",
                  )}
                >
                  <div
                    className={twMerge(
                      `flex text-center items-center justify-center aspect-[1/1] select-none text-center hover:bg-primary-500 hover:font-bold cursor-pointer hover:text-text-inverse p-[2px] rounded-md ml-[1px] mr-[1px]`,
                      todayHighlight,
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedStartDate(new Date(date));
                    }}
                  >
                    {day}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </>
  );
};

export const MiniCalendar = (args: HTMLDivExtended<HTMLDivElement, {}>) => {
  return (
    <div
      {...args}
      className={`${args.className} min-w-fit bg-white rounded-xl shadow-lg border-[1px] border-neutral-200 overflow-hidden`}
    >
      <MiniCalendarContent />
    </div>
  );
};
