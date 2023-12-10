import { PropsWithChildren, useContext } from "react";
import { DayBackground, HoursBackground } from "./dayBackground";
import { DayEvents, DraggedEvent } from "./dayEventsContent";

const colStartClass = [
  "col-start-[2]",
  "col-start-[3]",
  "col-start-[4]",
  "col-start-[5]",
  "col-start-[6]",
  "col-start-[7]",
  "col-start-[8]",
] as const;

const DayContainer = ({
  children,
  column,
}: PropsWithChildren<{ column: number }>) => {
  const columnTailWind = colStartClass.at(column);
  const [dragged] = useContext(DraggedEvent)
  if (columnTailWind)
    return (
      <div
        className={`${columnTailWind} relative w-full`}
        onDrop={(e) => {
          console.log("aqui");
          console.log(e.clientX, e.clientY);
          console.log(dragged)
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
      >
        {children}
      </div>
    );
};

export const DayViewContent = {
  HoursBackground: HoursBackground,
  DayBackground: DayBackground,
  DayEvents: DayEvents,
  DayContainer,
};
