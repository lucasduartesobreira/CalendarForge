"use client";
import React, { useState } from "react";
import { CreateEvent, createEvent } from "./createEventControl";
import { title } from "process";
import useLocalStorage from "@/src/localStorageHook";

const CreateEventForm = ({ open }: { open: boolean }) => {
  const initialFormState: CreateEvent = {
    title: "",
    endDate: new Date(0),
    startDate: new Date(0),
    description: "",
  };
  const [form, setForm] = useState(initialFormState);
  const handleChange =
    <A extends keyof Omit<CreateEvent, "endDate" | "startDate">>(prop: A) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      form[prop] = event.target.value;
      setForm(form);
    };

  const [events, setEvents] = useLocalStorage("events", []);
  const handleSubmit = (__event: any) => {
    const f = createEvent(form);
    console.log(form);
    events.push(f);
    setEvents(events);
  };

  return (
    open && (
      <form
        hidden={false}
        onSubmit={handleSubmit}
        className="text-gray-500 fixed border-2 rounded-md top-1/2 left-1/2 bg-white flex flex-col"
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

const CreateEventButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="">
      <button
        className="absolute bottom-8 right-8 w-24 h-24 rounded-s-full rounded-e-full bg-blue-600"
        onClick={() => setOpen(!open)}
      >
        Create Event
      </button>
      <CreateEventForm open={open}></CreateEventForm>
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };

