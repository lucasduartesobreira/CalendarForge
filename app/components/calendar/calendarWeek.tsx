const range24 = Array.from(new Array(24));

const DayBackground = () => {
  return (
    <div
      className={`flex-none relative -top-[${
        -1440 + 835.63
      }px] h-[1440px] min-w-min grid grid-cols-1 bg-white text-black`}
    >
      {range24.map(() => {
        // eslint-disable-next-line react/jsx-key
        return <HourBackgroud />;
      })}
    </div>
  );
};

const HourBackgroud = () => {
  return <div className={`border-2 border-gray-600 h-${1440 / 24}`}>Hour</div>;
};

const CalendarWeek = ({ style }: { style: string }) => {
  return (
    <div className={`${style} grid grid-cols-7 overflow-auto`}>
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
