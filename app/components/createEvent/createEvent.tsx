"use client";
import React, { useContext, useState } from "react";
import { StorageContext } from "@/hooks/dataHook";
import { CreateEvent } from "@/services/events/events";

const OWN_CALENDAR_ID = Buffer.from("own_calendar").toString("base64");

const initialFormState: CreateEvent = {
  title: "",
  endDate: Date.now() + 60 * 60 * 1000,
  startDate: Date.now(),
  description: "",
  calendar_id: OWN_CALENDAR_ID,
};

const CreateEventForm = ({ setOpen }: { setOpen: (open: boolean) => void }) => {
  const [form, setForm] = useState(initialFormState);
  const storageContext = useContext(StorageContext);
  if (storageContext.isSome()) {
    const { eventsStorage } = storageContext.unwrap();

    const handleChangeText =
      <A extends keyof Omit<CreateEvent, "endDate" | "startDate">>(prop: A) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        form[prop] = event.target.value;
        setForm(form);
      };

    const handleChangeDates =
      <A extends keyof Pick<CreateEvent, "endDate" | "startDate">>(prop: A) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = new Date(event.target.value);
        form[prop] = target.getTime();
        setForm(form);
      };

    const handleSubmit = (submitEvent: any) => {
      submitEvent.preventDefault();

      eventsStorage.add(form);
      setOpen(false);
      console.log("clicked");
    };

    return (
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
            onChange={handleChangeText("title")}
            type="text"
          />
          <input
            placeholder="Description"
            className="text-black m-2 bg-gray-200"
            onChange={handleChangeText("description")}
            type="text"
          />
          <input
            placeholder=""
            className="text-black m-2 bg-gray-200"
            onChange={handleChangeDates("startDate")}
            type="datetime-local"
          />
          <input
            placeholder=""
            className="text-black m-2 bg-gray-200"
            onChange={handleChangeDates("endDate")}
            type="datetime-local"
          />
        </label>
        <input
          type="submit"
          className="flex-auto relative r-4 text-white bg-blue-600 rounded-md"
          value={"Save"}
        />
      </form>
    );
  }

  return null;
};

const CreateEventButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="">
      <button
        className="absolute bottom-8 right-8 w-24 h-24 z-[1000] rounded-s-full rounded-e-full bg-blue-600"
        onClick={() => setOpen(!open)}
      >
        Create Event
      </button>
      {open && <CreateEventForm setOpen={setOpen}></CreateEventForm>}
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };
