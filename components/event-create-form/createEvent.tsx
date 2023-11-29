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
  UpdateNotificationForm,
  initialNotification,
} from "@/components/notifications-update-form/eventNotificationsForm";
import { EventTemplate } from "@/services/events/eventTemplates";
import { Calendar } from "@/services/calendar/calendar";
import { NewEventNotificationForm } from "@/components/notifications-create-form/createNotificationForm";
import {
  FormHeader,
  InputButtons,
  InputText,
  PopupForm,
} from "../shared/forms/forms";

const OWN_CALENDAR_ID = Buffer.from("own_calendar").toString("base64");

const initialFormState: CreateEvent = {
  title: "",
  endDate: Date.now() + 60 * 60 * 1000,
  startDate: Date.now(),
  description: "",
  calendar_id: OWN_CALENDAR_ID,
  notifications: [],
  color: "#7a5195",
  task_id: O.None(),
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
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const { storages } = useContext(StorageContext);

  useEffect(() => {
    if (storages.isSome()) {
      (async () => {
        const { calendarsStorage } = storages.unwrap();
        const foundDefault = await calendarsStorage.find({ default: true });
        foundDefault.map(({ id }) => {
          form.calendar_id = id;
          setForm({ ...form });
        });
      })();
    }
  }, []);

  useEffect(() => {
    storages.map(async ({ eventsTemplateStorage }) =>
      setTemplates(await eventsTemplateStorage.all()),
    );
  }, []);

  useEffect(() => {
    storages.map(async ({ calendarsStorage }) =>
      setCalendars(await calendarsStorage.all()),
    );
  }, []);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate.length > 0) {
      storages.map(async ({ eventsTemplateStorage }) =>
        (await eventsTemplateStorage.findById(selectedTemplate)).map(
          (template) =>
            setForm({
              ...template,
              startDate: form.startDate,
              endDate: form.endDate,
              task_id: O.None(),
            }),
        ),
      );
    }
  }, [selectedTemplate]);

  if (storages.isSome()) {
    const { eventsStorage } = storages.unwrap();

    const handleChangeText =
      <
        A extends keyof Omit<
          CreateEvent,
          "endDate" | "startDate" | "notifications" | "color" | "task_id"
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

    const handleSubmit = () => {
      eventsStorage.add(form);
    };
    const startDate = new Date(initialForm.startDate);
    startDate.setSeconds(0, 0);
    const endDate = new Date(initialForm.endDate);
    endDate.setSeconds(0, 0);

    return (
      <PopupForm
        setOpen={setOpen}
        refs={blockdRefs}
        onSubmit={handleSubmit}
        id="form1"
      >
        <FormHeader setOpen={setOpen}>
          <label className="ml-5 origin-center text-neutral-500">
            {selectedTemplate != null && selectedTemplate.length > 0
              ? "Template"
              : ""}
            <select
              value={selectedTemplate}
              className="bg-neutral-300"
              onChange={(ev) => {
                ev.preventDefault();
                const selectedValue = ev.currentTarget.value;
                setSelectedTemplate(selectedValue);
              }}
            >
              <option value={undefined} />
              {templates.map((template, index) => {
                return (
                  <option key={index} value={template.id}>
                    {template.title}
                  </option>
                );
              })}
            </select>
          </label>
        </FormHeader>
        <InputText
          placeholder="Title"
          value={form.title}
          className="mt-2"
          onChange={handleChangeText("title")}
          type="text"
        />
        <InputText
          placeholder="Description"
          value={form.description}
          onChange={handleChangeText("description")}
          type="text"
        />
        <div className="gap-1 flex">
          <label className="px-2 py-1 text-sm flex flex-col flex-nowrap justify-center rounded-md bg-neutral-200">
            Initial Date
            <InputText
              placeholder=""
              value={getHTMLDateTime(new Date(form.startDate))}
              onChange={handleChangeDates("startDate")}
              type="datetime-local"
            />
          </label>
          <label className="px-2 py-1 text-sm flex flex-col justify-center rounded-md bg-neutral-200">
            End Date
            <InputText
              placeholder=""
              value={getHTMLDateTime(new Date(form.endDate))}
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
          {calendars.map((value, index) => {
            return (
              <option key={index} value={value.id}>
                {value.name}
              </option>
            );
          })}
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
          />
        </div>
        <InputButtons.Primary
          type="submit"
          className="absolute bottom-0 font-semibold w-full left-0"
          value={"Save"}
          form="form1"
        />
      </PopupForm>
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
        />
      )}
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };
