import { ReactNode } from "react";

const range24 = Array.from(new Array(24));

const DayBackground = () => {
  return (
    <div className={`grid grid-rows-[repeat(24,64px)] bg-white text-gray-300`}>
      {range24.map((_value, index) => {
        return (
          <SquareBG
            key={index}
            style={`row-start-[${index + 1}] col-start-[1] row-span-[${
              index + 1
            }]`}
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
    <div className={`${style} border-[0.5px] border-gray-300 h-[64px]`}>
      {childrens}
    </div>
  );
};

const HoursBackground = () => {
  return (
    <div className={`grid grid-rows-[repeat(24,64px)] bg-white text-gray-300`}>
      {range24.map((_value, index) => {
        return (
          <SquareBG
            style={`row-start-[${index + 1}] col-start-[1] row-span-[${
              index + 1
            }]`}
            childrens={
              <p key={index}>{`${index < 10 ? `0${index}` : index}:00`}</p>
            }
            key={index}
          />
        );
      })}
    </div>
  );
};

const CalendarWeek = ({ style }: { style: string }) => {
  return (
    <div
      className={`${style} grid grid-cols-[50px_repeat(7,1fr)] grid-row-1 overflow-auto`}
    >
      <HoursBackground />
      <DayBackground />
      <DayBackground />
      <DayBackground />
      <DayBackground />
      <DayBackground />
      <DayBackground />
      <DayBackground />
    </div>
  );
};

export default CalendarWeek;
