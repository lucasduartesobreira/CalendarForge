import { PropsWithChildren } from "react";
import { Background, DayBackground, HoursBackground } from "./dayBackground";
import { DayEvents } from "./dayEventsContent";

const colStartClass = [
  "col-start-[2]",
  "col-start-[3]",
  "col-start-[4]",
  "col-start-[5]",
  "col-start-[6]",
  "col-start-[7]",
  "col-start-[8]",
  "col-start-[9]",
] as const;

const DayContainer = ({
  children,
  column,
}: PropsWithChildren<{ column: number }>) => {
  const columnTailWind = colStartClass.at(column);
  if (columnTailWind)
    return (
      <div className={`${columnTailWind} relative w-full`}>{children}</div>
    );
};

export const DayViewContent = {
  HoursBackground: HoursBackground,
  DayBackground: DayBackground,
  DayEvents: DayEvents,
  Background: Background,
  DayContainer,
};
