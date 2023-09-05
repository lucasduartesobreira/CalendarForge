"use client";
import React, {
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { StorageContext } from "@/hooks/dataHook";
import { CreateEvent, EventNotification } from "@/services/events/events";
import OutsideClick from "../utils/outsideClick";
import { getHTMLDateTime } from "@/utils/date";
import { Option, Some } from "@/utils/option";
import {
  NewEventNotificationForm,
  UpdateNotificationForm,
  initialNotification,
} from "../events/notifications/eventNotificationsForm";

const OWN_CALENDAR_ID = Buffer.from("own_calendar").toString("base64");

const initialFormState: CreateEvent = {
  title: "",
  endDate: Date.now() + 60 * 60 * 1000,
  startDate: Date.now(),
  description: "",
  calendar_id: OWN_CALENDAR_ID,
  notifications: [],
};

const CreateEventForm = ({
  setOpen,
  initialForm,
  blockdRefs,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CreateEvent;
  blockdRefs: Option<RefObject<any>[]>;
}) => {
  const initialStartDate = new Date(initialForm.startDate);
  const initialEndDate = new Date(initialForm.endDate);
  initialStartDate.setSeconds(0, 0);
  initialEndDate.setSeconds(0, 0);

  const [form, setForm] = useState({
    ...initialForm,
    notifications: [...initialForm.notifications],
    startDate: initialStartDate.getTime(),
    endDate: initialEndDate.getTime(),
  });
  const storageContext = useContext(StorageContext);
  let defaultValue: string | undefined = undefined;

  useEffect(() => {
    if (defaultValue) {
      form.calendar_id = defaultValue;
      setForm(form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (storageContext.isSome()) {
    const { eventsStorage, calendarsStorage } = storageContext.unwrap();

    const handleChangeText =
      <
        A extends keyof Omit<
          CreateEvent,
          "endDate" | "startDate" | "notifications"
        >,
      >(
        prop: A,
      ) =>
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
    };
    const startDate = new Date(initialForm.startDate);
    startDate.setSeconds(0, 0);
    const endDate = new Date(initialForm.endDate);
    endDate.setSeconds(0, 0);
    const defaultCalendar = calendarsStorage.findDefault();
    defaultValue = defaultCalendar.isSome()
      ? defaultCalendar.unwrap().id
      : undefined;

    return (
      <OutsideClick
        doSomething={() => {
          setOpen(false);
        }}
        refs={blockdRefs}
      >
        <form
          hidden={false}
          onSubmit={handleSubmit}
          className="z-[1000] text-gray-500 fixed border-2 rounded-md top-1/2 left-1/2 bg-white flex flex-col"
          id="form1"
        >
          <label>
            Text
            <input
              placeholder="Title"
              defaultValue={initialForm.title}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeText("title")}
              type="text"
            />
            <input
              placeholder="Description"
              defaultValue={initialForm.description}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeText("description")}
              type="text"
            />
            <input
              placeholder=""
              defaultValue={getHTMLDateTime(startDate)}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeDates("startDate")}
              type="datetime-local"
            />
            <input
              placeholder=""
              defaultValue={getHTMLDateTime(endDate)}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeDates("endDate")}
              type="datetime-local"
            />
          </label>
          <select
            onChange={(event) => {
              form.calendar_id = event.target.value;
              setForm(form);
            }}
            defaultValue={defaultValue}
          >
            {calendarsStorage.getCalendars().map((value, index) => {
              return (
                <option key={index} value={value.id}>
                  {value.name}
                </option>
              );
            })}
          </select>
          <div className="relative flex flex-col m-2 bg-gray-100 min-h-[24px]">
            {form.notifications.map((notification, index) => (
              <UpdateNotificationForm
                notification={notification}
                key={index}
                onChangeTime={(time) => {
                  form.notifications[index].time = time;
                  setForm({ ...form });
                }}
                onChangeTimescale={(timescale) => {
                  form.notifications[index].timescale = timescale;
                  setForm({ ...form });
                }}
                onChangeFrom={(from) => {
                  form.notifications[index].from = from;
                  setForm({ ...form });
                }}
                onDelete={() => {
                  form.notifications.splice(index, 1);
                  setForm({ ...form });
                }}
              />
            ))}
            <NewEventNotificationForm
              onSubmit={(notification) => {
                form.notifications.push(notification);
                setForm({ ...form });
              }}
              resetNotification={initialNotification}
            ></NewEventNotificationForm>
          </div>
          <input
            type="submit"
            className="flex-auto relative r-4 text-white bg-blue-600 rounded-md"
            value={"Save"}
            form="form1"
          />
        </form>
      </OutsideClick>
    );
  }

  return null;
};

const CreateEventButton = () => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  return (
    <div className="">
      <button
        ref={buttonRef}
        className="absolute bottom-8 right-8 w-24 h-24 z-[1000] rounded-s-full rounded-e-full bg-blue-600"
        onClick={() => setOpen(!open)}
      >
        Create Event
      </button>
      {open && (
        <CreateEventForm
          setOpen={setOpen}
          initialForm={initialFormState}
          blockdRefs={Some([buttonRef])}
        ></CreateEventForm>
      )}
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };
