"use client";
import React, {
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { StorageContext } from "@/hooks/dataHook";
import {
  CalendarEvent,
  CreateEvent,
  EventColors,
} from "@/services/events/events";
import OutsideClick from "../utils/outsideClick";
import { getHTMLDateTime } from "@/utils/date";
import * as O from "@/utils/option";
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
  color: "#7a5195",
};

const CreateEventForm = ({
  setOpen,
  initialForm,
  blockdRefs,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CreateEvent;
  blockdRefs: O.Option<RefObject<any>[]>;
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

  const [selectedTemplate, setSelectedTemplate] = useState<string>();
  const { storages } = useContext(StorageContext);

  useEffect(() => {
    if (storages.isSome()) {
      (async () => {
        const { calendarsStorage } = storages.unwrap();
        const foundDefault = await calendarsStorage.findDefault();
        foundDefault.map(({ id }) => {
          form.calendar_id = id;
          setForm({ ...form });
        });
      })();
    }
  }, []);

  if (storages.isSome()) {
    const {
      eventsStorage,
      calendarsStorage,
      eventsTemplateStorage: templateStorage,
    } = storages.unwrap();

    const handleChangeText =
      <
        A extends keyof Omit<
          CreateEvent,
          "endDate" | "startDate" | "notifications" | "color"
        >,
      >(
        prop: A,
      ) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        form[prop] = event.target.value;
        setForm({ ...form });
      };

    const handleChangeDates =
      <A extends keyof Pick<CreateEvent, "endDate" | "startDate">>(prop: A) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = new Date(event.target.value);
        form[prop] = target.getTime();
        setForm({ ...form });
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

    return (
      <OutsideClick
        doSomething={() => {
          setOpen(false);
        }}
        refs={blockdRefs}
        className="z-[1000] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <form
          hidden={false}
          onSubmit={handleSubmit}
          className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden text-text-primary"
          id="form1"
        >
          <div className="w-full absolute top-0 h-[16px] text-xs left-0 bg-neutral-300 flex items-center justify-center">
            <label className="ml-5 origin-center text-neutral-500">
              {selectedTemplate != null && selectedTemplate.length > 0
                ? "Template"
                : ""}
              <select
                value={selectedTemplate}
                className="bg-neutral-300"
                onChange={async (ev) => {
                  ev.preventDefault();
                  const selectedValue = ev.currentTarget.value;
                  setSelectedTemplate(selectedValue);
                  const template = (
                    await templateStorage.findById(selectedValue)
                  ).unwrap() as CalendarEvent;
                  setForm({
                    ...template,
                    startDate: form.startDate,
                    endDate: form.endDate,
                  });
                }}
              >
                <option value={undefined}></option>
                {(async () =>
                  (await templateStorage.all()).map((template, index) => {
                    return (
                      <option key={index} value={template.id}>
                        {template.title}
                      </option>
                    );
                  }))()}
              </select>
            </label>
            <button
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
              className="ml-auto mr-3 text-neutral-500 text-xs"
            >
              X
            </button>
          </div>

          <input
            placeholder="Title"
            value={form.title}
            className="px-2 py-1 rounded-md mt-2 text-base bg-neutral-200"
            onChange={handleChangeText("title")}
            type="text"
          />
          <input
            placeholder="Description"
            value={form.description}
            className="px-2 py-1 rounded-md  bg-neutral-200"
            onChange={handleChangeText("description")}
            type="text"
          />
          <div className="gap-1 flex">
            <label className="px-2 py-1 text-sm flex flex-col flex-nowrap justify-center rounded-md bg-neutral-200">
              Initial Date
              <input
                placeholder=""
                value={getHTMLDateTime(new Date(form.startDate))}
                className="bg-neutral-200"
                onChange={handleChangeDates("startDate")}
                type="datetime-local"
              />
            </label>
            <label className="px-2 py-1 text-sm flex flex-col justify-center rounded-md bg-neutral-200">
              End Date
              <input
                placeholder=""
                value={getHTMLDateTime(new Date(form.endDate))}
                className="bg-neutral-200"
                onChange={handleChangeDates("endDate")}
                type="datetime-local"
              />
            </label>
          </div>
          <select
            onChange={(event) => {
              form.calendar_id = event.target.value;
              setForm({ ...form });
            }}
            className="px-2 py-1 rounded-md bg-neutral-200"
            value={form.calendar_id}
          >
            {(async () =>
              (await calendarsStorage.all()).map((value, index) => {
                return (
                  <option key={index} value={value.id}>
                    {value.name}
                  </option>
                );
              }))()}
          </select>
          <select
            value={form.color}
            onChange={(event) => {
              form.color = event.target.value as CalendarEvent["color"];
              setForm({ ...form });
            }}
            className="px-2 py-1 bg-neutral-200 rounded-md"
            style={{ color: form.color }}
          >
            {EventColors.map((color, index) => (
              <option key={index} value={color} style={{ color }}>
                Event Color
              </option>
            ))}
          </select>
          <div className="flex flex-col px-2 py-1 bg-neutral-200 min-h-[24px] items-start justify-start rounded-md mb-4">
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
            className="absolute bottom-0 font-semibold w-full left-0 text-white bg-primary-500 rounded-md"
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
        className="absolute bottom-8 right-8 w-24 h-24 z-[1000] rounded-s-full rounded-e-full bg-primary-500"
        onClick={() => setOpen(!open)}
      >
        Create Event
      </button>
      {open && (
        <CreateEventForm
          setOpen={setOpen}
          initialForm={initialFormState}
          blockdRefs={O.Some([buttonRef])}
        ></CreateEventForm>
      )}
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };
