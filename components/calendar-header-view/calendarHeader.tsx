import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { SelectedDateContext } from "../calendar-navbar/selectedDateContext";
import {
  lastWeekMidnight,
  nextWeekMidnight,
  sundayInTheWeek,
} from "@/utils/date";
import { twMerge } from "tailwind-merge";

export const CalendarHeader = () => {
  const [date, setDate] = useContext(SelectedDateContext);

  const [dateNow, setDateNow] = useState(Date.now());

  useEffect(() => {
    setTimeout(() => setDateNow(() => Date.now()), 60 * 1000);
  }, [dateNow]);

  const todayButtonHidden = useMemo(() => {
    const timeDiffBetweenNowAndSelected = dateNow - date.getTime();
    return timeDiffBetweenNowAndSelected < 7 * 24 * 60 * 60 * 1000 &&
      timeDiffBetweenNowAndSelected > 0
      ? "invisible"
      : "visible";
  }, [dateNow, date]);

  return (
    <div className="ml-[4px] mr-[16px] py-[4px] border rounded-b-md drop-shadow-md text-gray-600 inline-flex align-center px-[4px] gap-2">
      <button
        className="inline-flex justify-center align-center w-6 h-6 text-primary-500 hover:bg-gray-100 rounded-md"
        onClick={() => {
          setDate((date) => lastWeekMidnight(date));
        }}
      >
        <ChevronLeft />
      </button>
      <button
        className="inline-flex justify-center align-center w-6 h-6 text-primary-500 hover:bg-gray-100 rounded-md"
        onClick={() => {
          setDate((date) => nextWeekMidnight(date));
        }}
      >
        <ChevronRight />
      </button>
      <button
        className={twMerge(
          "inline-flex justify-center align-center w-6 h-6 text-primary-500 hover:bg-gray-100 rounded-md ",
          todayButtonHidden,
        )}
        onClick={() => setDate(() => sundayInTheWeek(new Date(dateNow)))}
      >
        <Home />
      </button>
    </div>
  );
};
