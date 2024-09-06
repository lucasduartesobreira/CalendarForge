import { HTMLDivExtended } from "@/utils/types";
import { Titles } from "../shared/title-view/titles";
import { useContext, useEffect, useMemo, useState } from "react";
import { SelectedDateContext } from "../calendar-navbar/selectedDateContext";
import { twMerge } from "tailwind-merge";

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

const MiniCalendar = ({}: { startDate: number }) => {
  const [selectedStartDate, setSelectedStartDate] =
    useContext(SelectedDateContext);
  const [startDate, setStartDate] = useState(selectedStartDate);

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
        };
      }),
    [startDate],
  );

  return (
    <div className="rounded-lg grid grid-cols-7 grid-rows-7 p-1 m-1 min-w-max">
      <div className="grid grid-cols-[subgrid] grid-rows-[subgrid] row-start-1 row-end-[2] col-start-1 col-end-[8]">
        {daysHeader.map((_n, index) => (
          <div
            key={index}
            className="text-neutral-600 text-xs select-none text-center border-transparent p-[2px] border-[1px] rounded-md ml-[1px] mr-[1px] aspect-[1/1]"
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
                ? "text-neutral-600 text-sm"
                : "text-neutral-400 font-bold text-xs";

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
                  className={`flex text-center items-center justify-center aspect-[1/1] select-none text-center hover:bg-primary-500 hover:font-bold cursor-pointer hover:text-text-inverse p-[2px] rounded-md ml-[1px] mr-[1px]`}
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
  );
};

export const MiniCalendarContainer = (
  args: HTMLDivExtended<HTMLDivElement, { startDate: Date }>,
) => {
  const startDate = useMemo(() => args.startDate, [args.startDate]);
  return (
    <div
      {...args}
      className={`${args.className} min-w-fit bg-white rounded-xl shadow-lg border-[1px] border-neutral-200 overflow-hidden`}
    >
      <Titles.Normal name="Mini Calendar" />
      <MiniCalendar startDate={startDate.getTime()} />
    </div>
  );
};
