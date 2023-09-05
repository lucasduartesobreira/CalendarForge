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

const OWN_CALENDAR_ID = Buffer.from("own_calendar").toString("base64");

const initialFormState: CreateEvent = {
  title: "",
  endDate: Date.now() + 60 * 60 * 1000,
  startDate: Date.now(),
  description: "",
  calendar_id: OWN_CALENDAR_ID,
  notifications: [],
};

const initialNotification: EventNotification = {
  from: "start",
  time: 5,
  timescale: "minutes",
};

const NewEventNotificationForm = ({
  onSubmit,
  resetNotification,
}: {
  onSubmit: (notification: EventNotification) => void;
  resetNotification: EventNotification;
}) => {
  const [newNotification, setNewNotification] = useState({
    ...resetNotification,
  });
  return (
    <div className="relative flex-none flex gap-[4px] justify-start text-black">
      <label>
        Notify
        <input
          value={newNotification.time}
          type="number"
          min="1"
          max="60"
          className="text-right bg-gray-100"
          onChange={(e) => {
            newNotification.time = Number(e.currentTarget.value);
            setNewNotification({ ...newNotification });
          }}
        />
      </label>
      <select
        value={newNotification.timescale}
        onChange={(e) => {
          newNotification.timescale = e.currentTarget.value as any;
          setNewNotification({ ...newNotification });
        }}
      >
        <option value={"minutes"}>minutes</option>
        <option value={"hours"}>hours</option>
      </select>
      <label>
        from the
        <select
          value={newNotification.from}
          onChange={(e) => {
            newNotification.from = e.currentTarget.value as any;
            setNewNotification({ ...newNotification });
          }}
        >
          <option value={"start"}>start</option>
          <option value={"end"}>end</option>
        </select>
      </label>
      <button
        className="absolute right-[2%] text-blue-600"
        type="submit"
        value={"+"}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onSubmit(newNotification);
          setNewNotification({ ...resetNotification });
        }}
      >
        +
      </button>
    </div>
  );
};

const UpdateNotificationForm = ({
  notification,
  onChangeTime,
  onChangeTimescale,
  onChangeFrom,
  onDelete,
}: {
  notification: EventNotification;
  onChangeTime: (time: EventNotification["time"]) => void;
  onChangeTimescale: (timescale: EventNotification["timescale"]) => void;
  onChangeFrom: (from: EventNotification["from"]) => void;
  onDelete: () => void;
}) => {
  return (
    <div>
      <label>
        Notify
        <input
          value={notification.time}
          type="number"
          min="1"
          max="60"
          className="text-right bg-gray-100"
          onChange={(e) => {
            const time = Number(e.currentTarget.value);
            onChangeTime(time);
          }}
        />
      </label>
      <select
        value={notification.timescale}
        onChange={(e) => {
          const timescale = e.currentTarget.value as any;
          onChangeTimescale(timescale);
        }}
      >
        <option value={"minutes"}>minutes</option>
        <option value={"hours"}>hours</option>
      </select>
      <label>
        from the
        <select
          value={notification.from}
          onChange={(e) => {
            const from = e.currentTarget.value as any;
            onChangeFrom(from);
          }}
        >
          <option value={"start"}>start</option>
          <option value={"end"}>end</option>
        </select>
      </label>
      <button
        className="absolute right-[2%] text-red-600"
        type="submit"
        value={"-"}
        onClick={() => {
          onDelete();
        }}
      >
        -
      </button>
    </div>
  );
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
