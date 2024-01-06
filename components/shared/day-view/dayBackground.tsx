import {
  JSXElementConstructor,
  PropsWithChildren,
  ReactNode,
  useContext,
  useState,
} from "react";
import { ViewSize } from "../flexible-view/flexibleView";
import { HTMLDivExtended } from "@/utils/types";
import { DraggedEvent, ShowCalendarEvent } from "./dayEventsContent";
import { None, Option, Some } from "@/utils/option";
import { StorageContext } from "@/hooks/dataHook";

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
  "row-start-[27]",
  "row-start-[28]",
  "row-start-[29]",
  "row-start-[30]",
  "row-start-[31]",
  "row-start-[32]",
  "row-start-[33]",
  "row-start-[34]",
  "row-start-[35]",
  "row-start-[36]",
  "row-start-[37]",
  "row-start-[38]",
  "row-start-[39]",
  "row-start-[40]",
  "row-start-[41]",
  "row-start-[42]",
  "row-start-[43]",
  "row-start-[44]",
  "row-start-[45]",
  "row-start-[46]",
  "row-start-[47]",
  "row-start-[48]",
  "row-start-[49]",
  "row-start-[50]",
  "row-start-[51]",
  "row-start-[52]",
  "row-start-[53]",
  "row-start-[54]",
  "row-start-[55]",
  "row-start-[56]",
  "row-start-[57]",
  "row-start-[58]",
  "row-start-[59]",
  "row-start-[60]",
  "row-start-[61]",
  "row-start-[62]",
  "row-start-[63]",
  "row-start-[64]",
  "row-start-[65]",
  "row-start-[66]",
  "row-start-[67]",
  "row-start-[68]",
  "row-start-[69]",
  "row-start-[70]",
  "row-start-[71]",
  "row-start-[72]",
  "row-start-[73]",
  "row-start-[74]",
  "row-start-[75]",
  "row-start-[76]",
  "row-start-[77]",
  "row-start-[78]",
  "row-start-[79]",
  "row-start-[80]",
  "row-start-[81]",
  "row-start-[82]",
  "row-start-[83]",
  "row-start-[84]",
  "row-start-[85]",
  "row-start-[86]",
  "row-start-[87]",
  "row-start-[88]",
  "row-start-[89]",
  "row-start-[90]",
  "row-start-[91]",
  "row-start-[92]",
  "row-start-[93]",
  "row-start-[94]",
  "row-start-[95]",
  "row-start-[96]",
] as const;

const range24 = Array.from(new Array(24));
const range96 = Array.from(new Array(96));

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
            className={`${rowStartClass[index + 1]} col-start-[1] row-span-1`}
          />
        );
      })}
    </div>
  );
};

export const DayDropZone = ({
  dayOfWeek,
  day,
  date,
}: {
  dayOfWeek: ViewSize;
  day: number;
  date: Date;
}) => {
  const [dragged, setDragged] = useContext(DraggedEvent);
  const id = `day${day}${dayOfWeek}`;
  const [overDate, setOverDate] = useState<Option<number>>(None());
  const { storages } = useContext(StorageContext);
  return (
    <div
      className={`grid grid-rows-[48,repeat(96,16px)] absolute w-full`}
      id={id}
      onMouseLeave={() => {
        if (dragged.isSome()) setOverDate(None());
      }}
    >
      <div
        className={`${rowStartClass[0]} col-start-[1] row-span-1 h-[48px]`}
      />
      {range96.map((_value, index) => {
        return (
          <div
            key={index}
            className={`${
              rowStartClass[index + 1]
            } col-start-[1] row-span-1 h-[16px] z-[2]`}
            style={{ opacity: 0 }}
            onMouseEnter={(e) => {
              e.preventDefault();
              if (dragged.isSome()) {
                setOverDate(Some(date.getTime() + 15 * 60 * 1000 * index));
              }
            }}
            onMouseLeave={() => {
              if (dragged.isSome()) setOverDate(None());
            }}
            onMouseUp={(e) => {
              e.preventDefault();

              overDate.map((startDate) => {
                dragged.map((event) => {
                  storages.map(({ eventsStorage }) =>
                    eventsStorage.update(event.id, {
                      startDate: startDate,
                      endDate: startDate + event.endDate - event.startDate,
                    }),
                  );

                  setDragged(None());
                });
              });
            }}
          />
        );
      })}
      {overDate.mapOrElse(
        () => null,
        (startDate) =>
          dragged.mapOrElse(
            () => null,
            (event) => {
              return (
                <ShowCalendarEvent
                  conflicts={new Map()}
                  event={{
                    ...event,
                    startDate: startDate,
                    endDate: startDate + (event.endDate - event.startDate),
                  }}
                  day={day}
                  index={0}
                  setSelectedEvent={() => {}}
                  className="z-[100]"
                />
              );
            },
          ),
      )}
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
    <div className="flex row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-neutral-600 justify-center items-center top-0 rounded-lg shadow-lg border-[1px] border-neutral-200 overflow-hidden z-[10000] select-none">
      <div className="text-center relative px-8 py-4 select-none">
        <div
          className={`${color} select-none flex justify-center items-center font-mono text-4x1 font-bold px-4 py-2 rounded-[1rem] border-[1px] border-primary-500 text-primary-500 shadow-md w-10 h-10`}
        >
          <span className="text-center select-none">{day}</span>
        </div>
        <div className="absolute bottom-2 right-2 select-none">
          <a className="text-xs font-mono select-none">
            {dayToString[dayOfWeek]}
          </a>
        </div>
      </div>
    </div>
  );
};

const colStartClass = [
  "col-start-1",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
  "col-start-8",
];

export const HoursBackground = ({ column }: { column: number }) => {
  return (
    <div
      className={`grid grid-rows-[auto,repeat(24,64px)] ${colStartClass[column]} bg-white text-neutral-300`}
    >
      <div className="flex row-start-1 row-span-1 h-[48px] w-full sticky bg-white text-neutral-700 justify-center items-center top-0 shadow-lg border-[1px] border-neutral-200 overflow-hidden" />
      {range24.map((_value, index) => {
        return (
          <SquareBG
            className={`${
              rowStartClass[index + 1]
            } col-start-[1] flex flex-wrap justify-end items-start h-[64px]`}
            key={index}
          >
            <p
              key={index}
              className="text-neutral-600 mr-auto ml-auto mt-1 text-sm "
            >{`${index < 10 ? `0${index}` : index}:00`}</p>
          </SquareBG>
        );
      })}
    </div>
  );
};

const SquareBG = ({
  children: childrens,
  className,
}: HTMLDivExtended<HTMLDivElement, PropsWithChildren>) => {
  return (
    <div
      className={`${className} border-[1px] border-t-0 border-l-0 border-neutral-300 select-none`}
    >
      {childrens}
    </div>
  );
};
