import { HTMLDivExtended } from "@/utils/types";
import { Titles } from "../shared/title-view/titles";

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

const MiniCalendar = ({ startDate }: { startDate: number }) => {
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

  return (
    <div className="grid grid-cols-7 grid-rows-6 p-2 min-w-max">
      {daysHeader.map((_n, index) => (
        <div
          key={index}
          className="text-neutral-600 select-none text-center hover:bg-primary-500 cursor-pointer hover:text-text-inverse hover:border-neutral-200 border-transparent p-[2px] border-[1px] rounded-md"
        >
          {dayToName[(index + 1) as keyof typeof dayToName]}
        </div>
      ))}
      {daysOnMiniCalendar.map((_n, index) => (
        <div
          key={index}
          className="text-neutral-600 select-none text-center hover:bg-primary-500 cursor-pointer hover:text-text-inverse hover:border-neutral-200 border-transparent p-[2px] border-[1px] rounded-md"
        >
          {_n}
        </div>
      ))}
    </div>
  );
};

export const MiniCalendarContainer = (
  args: HTMLDivExtended<HTMLDivElement, {}>,
) => {
  return (
    <div
      {...args}
      className={`${args.className} min-w-fit bg-white rounded-xl shadow-lg border-[1px] border-neutral-200 overflow-hidden`}
    >
      <Titles.Normal name="Mini Calendar" />
      <MiniCalendar startDate={Date.now()} />
    </div>
  );
};
