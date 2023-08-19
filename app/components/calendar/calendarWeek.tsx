import { ReactNode } from "react";

const range24 = Array.from(new Array(24));

const DayBackground = () => {
  return (
    <div className={`min-w-full grid grid-cols-1 bg-white text-gray-300`}>
      {range24.map((value) => {
        return <SquareBG key={value} />;
      })}
    </div>
  );
};

const SquareBG = ({
  childrens,
  style,
}: {
  childrens?: ReactNode[];
  style?: string;
}) => {
  return (
    <div className={`${style} border-2 border-gray-300 h-[60px]`}>
      {childrens}
    </div>
  );
};

const HoursBackground = () => {
  return (
    <div className={`grid grid-cols-1 bg-white text-gray-300`}>
      {range24.map((value, index) => {
        return (
          <SquareBG
            style="right-0 place-content-end"
            childrens={[
              <p key={value}>{`${index < 10 ? `0${index}` : index}:00`}</p>,
            ]}
            key={value}
          />
        );
      })}
    </div>
  );
};

const CalendarWeek = ({ style }: { style: string }) => {
  return (
    <div className={`${style} grid grid-cols-8 overflow-scroll`}>
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
