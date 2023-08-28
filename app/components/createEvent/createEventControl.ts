import { CalendarEvent } from "@/services/events/events";

type CreateEvent = Omit<CalendarEvent, "id">;

const createEvent = (event: CreateEvent): CalendarEvent => {
  const id = new Date(Date.now()).toUTCString();
  const hashedId = Buffer.from(id).toString("base64");

  const newEvent = {
    id: hashedId,
    ...event,
  };

  return newEvent;
};

export { createEvent };
export type { CreateEvent };
