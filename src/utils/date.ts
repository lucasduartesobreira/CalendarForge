function getHTMLDateTime(date: Date) {
  var localdt = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localdt.toISOString().slice(0, -1);
}

export { getHTMLDateTime };

