import React from "react";

export const WeekNavigation = ({
  startDate,
  setStartDate,
}: {
  startDate: Date;
  setStartDate: (arg0: Date) => void;
}) => {
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return (
    <div className="col-start-2 grid grid-rows-[100%] grid-cols-[auto] place-items-center gap-[4px] w-[100%] h-[100%]">
      <button
        onClick={() => {
          setStartDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000));
        }}
        className="col-start-1"
      >
        &lt;
      </button>{" "}
      <div className="text-center col-start-2">{`${startDate.getDate()}/${startDate.getMonth()} - ${endDate.getDate()}/${endDate.getMonth()}`}</div>{" "}
      <button
        onClick={() => {
          setStartDate(new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000));
        }}
        className="col-start-3"
      >
        &gt;
      </button>
    </div>
  );
};
