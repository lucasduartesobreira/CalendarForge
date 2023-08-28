"use client";
import React, { useState } from "react";
import { CreateEvent, createEvent } from "./createEventControl";
import { CalendarEvent, EventStorage } from "@/services/events/events";

const OWN_CALENDAR_ID = Buffer.from("own_calendar").toString("base64");

const CreateEventForm = ({
  open,
  events,
  setEvents,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;
}) => {
  const initialFormState: CreateEvent = {
    title: "",
    endDate: Date.now() + 60 * 60 * 1000,
    startDate: Date.now(),
    description: "",
    calendar_id: OWN_CALENDAR_ID,
  };
  const [form, setForm] = useState(initialFormState);
  const handleChange =
    <A extends keyof Omit<CreateEvent, "endDate" | "startDate">>(prop: A) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      form[prop] = event.target.value;
      setForm(form);
    };

  //const [events, setEvents] = useLocalStorage("events", [] as Event[]);
  //const [events, setEvents] = useState([] as Event[]);

  const handleSubmit = (__event: any) => {
    __event.preventDefault();

    let dateNow = Date.now();
    form.endDate = dateNow + 60 * 60 * 1000;
    form.startDate = dateNow;

    const event = createEvent(form);
    const newEvents = [...events, event];
    setEvents(newEvents);
    setOpen(false);
    console.log("clicked");
  };

  return (
    open && (
      <form
        hidden={false}
        onSubmit={handleSubmit}
        className="z-[1000] text-gray-500 fixed border-2 rounded-md top-1/2 left-1/2 bg-white flex flex-col"
      >
        <label>
          Text
          <input
            placeholder="Title"
            className="text-black m-2 bg-gray-200"
            onChange={handleChange("title")}
            type="text"
          />
        </label>
        <input
          type="submit"
          className="flex-auto relative r-4 text-white bg-blue-600 rounded-md"
          value={"Save"}
        />
      </form>
    )
  );
};

const CreateEventButton = ({
  setEvents,
  events,
}: {
  setEvents: (events: CalendarEvent[]) => void;
  events: CalendarEvent[];
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="">
      <button
        className="absolute bottom-8 right-8 w-24 h-24 z-[1000] rounded-s-full rounded-e-full bg-blue-600"
        onClick={() => setOpen(!open)}
      >
        Create Event
      </button>
      <CreateEventForm
        open={open}
        setOpen={setOpen}
        setEvents={setEvents}
        events={events}
      ></CreateEventForm>
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };
