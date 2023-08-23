type Event = {
  id: string;
  startDate: number;
  endDate: number;
  title: string;
  description: string;
  calendar_id: string;
};

type CreateEvent = Omit<Event, "id">;

const createEvent = (event: CreateEvent): Event => {
  const id = new Date(Date.now()).toUTCString();
  const hashedId = Buffer.from(id).toString("base64");

  const newEvent = {
    id: hashedId,
    ...event,
  };

  return newEvent;
};

export { createEvent };
export type { CreateEvent, Event };
