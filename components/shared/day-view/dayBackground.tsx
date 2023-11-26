import { ReactNode } from "react";
import { ViewSize } from "../flexible-view/flexibleView";

const dayToString = {
  1: "sun",
  2: "mon",
  3: "tue",
  4: "wed",
  5: "thu",
  6: "fri",
  7: "sat",
};

const rowStartClass = [
  "row-start-[1]",
  "row-start-[2]",
  "row-start-[3]",
  "row-start-[4]",
  "row-start-[5]",
  "row-start-[6]",
  "row-start-[7]",
  "row-start-[8]",
  "row-start-[9]",
  "row-start-[10]",
  "row-start-[11]",
  "row-start-[12]",
  "row-start-[13]",
  "row-start-[14]",
  "row-start-[15]",
  "row-start-[16]",
  "row-start-[17]",
  "row-start-[18]",
  "row-start-[19]",
  "row-start-[20]",
  "row-start-[21]",
  "row-start-[22]",
  "row-start-[23]",
  "row-start-[24]",
  "row-start-[25]",
  "row-start-[26]",
] as const;

const range24 = Array.from(new Array(24));

export const DayBackground = ({
  dayOfWeek,
  day,
  isToday,
}: {
  dayOfWeek: ViewSize;
  day: number;
  isToday: boolean;
}) => {
  const color = isToday ? "bg-primary-50" : "bg-white";

  return (
    <div
      className={`grid grid-rows-[auto,repeat(24,64px)] absolute w-full bg-white text-neutral-300`}
    >
      <DayHeader day={day} color={color} dayOfWeek={dayOfWeek} />
      {range24.map((_value, index) => {
        return (
          <SquareBG
            key={index}
            style={`${rowStartClass[index + 1]} col-start-[1] row-span-1`}
          />
        );
      })}
    </div>
  );
};

const DayHeader = ({
  color,
  day,
  dayOfWeek,
}: {
  color: string;
  day: number;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}) => {
  return (
    <div className="flex row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-neutral-600 justify-center items-center top-0 rounded-lg shadow-lg border-[1px] border-neutral-200 overflow-hidden z-[10000]">
      <div className="text-center relative px-8 py-4">
        <div
          className={`${color} flex justify-center items-center font-mono text-4x1 font-bold px-4 py-2 rounded-[1rem] border-[1px] border-primary-500 text-primary-500 shadow-md w-10 h-10`}
        >
          <span className="text-center">{day}</span>
        </div>
        <div className="absolute bottom-2 right-2">
          <a className="text-xs font-mono">{dayToString[dayOfWeek]}</a>
        </div>
      </div>
    </div>
  );
};

export const HoursBackground = () => {
  return (
    <div
      className={`grid grid-rows-[auto,repeat(24,64px)] col-start-1 bg-white text-neutral-300`}
    >
      <div className="flex row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-neutral-700 justify-center items-center top-0 shadow-lg border-[1px] border-neutral-200 overflow-hidden" />
      {range24.map((_value, index) => {
        return (
          <SquareBG
            style={`${
              rowStartClass[index + 1]
            } col-start-[1] flex flex-wrap justify-end items-start`}
            childrens={
              <p
                key={index}
                className="text-neutral-600 mr-auto ml-auto mt-1 text-sm "
              >{`${index < 10 ? `0${index}` : index}:00`}</p>
            }
            key={index}
          />
        );
      })}
    </div>
  );
};

const SquareBG = ({
  childrens,
  style,
}: {
  childrens?: ReactNode;
  style?: string;
}) => {
  return (
    <div
      className={`${style} border-[1px] border-t-0 border-l-0 border-neutral-300 h-[64px]`}
    >
      {childrens}
    </div>
  );
};
