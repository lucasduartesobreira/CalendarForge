import { HTMLDivExtended } from "@/utils/types";
import { Titles } from "../shared/title-view/titles";
import { useContext, useMemo } from "react";
import { SelectedDateContext } from "../calendar-navbar/selectedDateContext";

const daysOnMiniCalendarRange = Array.from(new Array(7 * 5));
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
  const [startDate, setStartDate] = useContext(SelectedDateContext);
  const startDateAsDate = new Date(startDate);
  const firstDayOfTheMonth = new Date(startDateAsDate.setDate(1));
  const lastDayOfTheMonth = new Date(
    new Date(startDateAsDate.setMonth(startDateAsDate.getMonth() + 1)).setDate(
      0,
    ),
  );

  const dayOfWeekOfFirstDay = firstDayOfTheMonth.getDay();
  const firstDayFromLastMonthToShow = new Date(
    new Date(firstDayOfTheMonth).setDate(1 - dayOfWeekOfFirstDay),
  );

  const daysOnMiniCalendar = daysOnMiniCalendarRange.map((_v, index) =>
    index - dayOfWeekOfFirstDay < 0
      ? firstDayFromLastMonthToShow.getDate() + index - 1
      : index < lastDayOfTheMonth.getDate() + dayOfWeekOfFirstDay
      ? index + 1 - dayOfWeekOfFirstDay
      : 1 + index - lastDayOfTheMonth.getDate(),
  );

  const startDateOriginal = new Date(startDate);

  return (
    <div className="bg-neutral-100 rounded-lg grid grid-cols-7 grid-rows-6 p-1 m-1 min-w-max">
      {daysHeader.map((_n, index) => (
        <div
          key={index}
          className="text-neutral-600 select-none text-center hover:bg-primary-500 cursor-pointer hover:text-text-inverse hover:border-neutral-200 border-transparent p-[2px] border-[1px] rounded-md"
        >
          {dayToName[(index + 1) as keyof typeof dayToName]}
        </div>
      ))}
      {daysOnMiniCalendar.map((day, index) => {
        const highlightedStartIndex =
          startDateOriginal.getDate() + dayOfWeekOfFirstDay - 1;
        const highlightedEndIndex = highlightedStartIndex + 6;
        const isHighlighted =
          index >= highlightedStartIndex && index <= highlightedEndIndex;
        return (
          <div
            key={index}
            className={`${
              isHighlighted ? "bg-primary-300 text-text-inverse" : ""
            } text-neutral-600 select-none text-center hover:bg-primary-500 cursor-pointer hover:text-text-inverse hover:border-neutral-200 border-transparent p-[2px] border-[1px] rounded-md`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStartDate(new Date(startDateOriginal.setDate(day)));
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
