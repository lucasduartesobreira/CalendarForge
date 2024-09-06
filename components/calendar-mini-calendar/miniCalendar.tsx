import { HTMLDivExtended } from "@/utils/types";
import { Titles } from "../shared/title-view/titles";
import { useContext, useEffect, useMemo, useState } from "react";
import { SelectedDateContext } from "../calendar-navbar/selectedDateContext";

const daysOnMiniCalendarRange = Array.from(new Array(7 * 6));
const daysHeader = Array.from(new Array(1 * 7));

const dayToName = {
  1: "S",
  2: "M",
  3: "T",
  4: "W",
  5: "T",
  6: "F",
  7: "S",
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

        return {
          date: day,
          day: day.getDate(),
          highlighted:
            day.getTime() >= selectedStartDateAtMidnight &&
            day.getTime() <= selectedStartDatePlusSeven,
        };
      }),
    [startDate],
  );

  return (
    <div className="bg-neutral-100 rounded-lg grid grid-cols-7 grid-rows-7 p-1 m-1 min-w-max">
      {daysHeader.map((_n, index) => (
        <div
          key={index}
          className="text-neutral-600 select-none text-center hover:bg-primary-500 cursor-pointer hover:text-text-inverse hover:border-neutral-200 border-transparent p-[2px] border-[1px] rounded-md"
        >
          {dayToName[(index + 1) as keyof typeof dayToName]}
        </div>
      ))}
      {daysOnMiniCalendar.map(({ day, date, highlighted }, index) => {
        return (
          <div
            key={index}
            className={`${
              highlighted ? "bg-primary-300 text-text-inverse" : ""
            } text-neutral-600 select-none text-center hover:bg-primary-500 cursor-pointer hover:text-text-inverse hover:border-neutral-200 border-transparent p-[2px] border-[1px] rounded-md`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedStartDate(new Date(date));
            }}
          >
            {day}
          </div>
        );
      })}
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
