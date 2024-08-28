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
    <div className="grid grid-rows-[100%] grid-cols-[auto] place-items-center gap-[4px] max-w-fit h-[90%] text-sm px-2 border-primary-300 border-[2px] bg-primary-50 rounded-xl">
      <button
        onClick={() => {
          setStartDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000));
        }}
        className="col-start-1 text-lg text-bold ml-auto px-1 bg-text-inverse border-primary-500 border-[2px] rounded-md text-primary-500"
      >
        &lt;
      </button>
      <div className="text-center col-start-2 text-primary-500">{`${startDate.getDate()}/${startDate.getMonth()} - ${endDate.getDate()}/${endDate.getMonth()}`}</div>
      <button
        onClick={() => {
          setStartDate(new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000));
        }}
        className="col-start-3 text-lg text-bold mr-auto px-1 bg-text-inverse border-primary-500 border-[2px] rounded-md text-primary-500"
      >
        &gt;
      </button>
    </div>
  );
};
