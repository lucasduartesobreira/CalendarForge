function getHTMLDateTime(date: Date) {
  var localdt = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localdt.toISOString().slice(0, -1);
}

export const getMidnightDate = (date: Date) => {
  const dateAtMidnightInMilliseconds = new Date(date).setHours(0, 0, 0, 0);

  return new Date(dateAtMidnightInMilliseconds);
};

export const lastWeekMidnight = (date: Date) => {
  const lastWeek = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
  const lastWeekMidnight = getMidnightDate(lastWeek);

  return lastWeekMidnight;
};

export const nextWeekMidnight = (date: Date) => {
  const nextWeek = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000 + 1);
  const nextWeekMidnight = getMidnightDate(nextWeek);

  return nextWeekMidnight;
};

export const sundayInTheWeek = (date: Date) => {
  const sundayDateInMiliseconds = new Date(date).setDate(
    date.getDate() - date.getDay(),
  );

  const sundayMidnight = getMidnightDate(new Date(sundayDateInMiliseconds));

  return sundayMidnight;
};

export { getHTMLDateTime };
