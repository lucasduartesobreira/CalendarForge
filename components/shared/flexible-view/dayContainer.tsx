import { PropsWithChildren } from "react";

const colStartClass = [
  "col-start-[2]",
  "col-start-[3]",
  "col-start-[4]",
  "col-start-[5]",
  "col-start-[6]",
  "col-start-[7]",
  "col-start-[8]",
] as const;

export const DayContainer = ({
  children,
  column,
}: PropsWithChildren<{ column: number }>) => {
  const columnTailWind = colStartClass.at(column);
  if (columnTailWind)
    return (
      <div className={`${columnTailWind} relative w-full`}>{children}</div>
    );
};
