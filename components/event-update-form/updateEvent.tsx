import { StorageContext } from "@/hooks/dataHook";
import {
  CalendarEvent,
  CreateEvent,
  EventColors,
} from "@/services/events/events";
import { getHTMLDateTime } from "@/utils/date";
import * as O from "@/utils/option";
import { useContext, useEffect, useState } from "react";
import {
  UpdateNotificationForm,
  initialNotification,
} from "@/components/notifications-update-form/eventNotificationsForm";
import { Calendar } from "@/services/calendar/calendar";
import { NewEventNotificationForm } from "@/components/notifications-create-form/createNotificationForm";
import {
  FormHeader,
  InputButtons,
  InputText,
  PopupForm,
} from "../shared/forms/forms";

const UpdateEventForm = ({
  setOpen,
  initialForm,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CalendarEvent;
}) => {
  const { storages } = useContext(StorageContext);
  const { id, ...initialFormState } = initialForm;
  const [form, setForm] = useState(initialFormState);
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  useEffect(() => {
    storages.map(async ({ calendarsStorage }) =>
      setCalendars(await calendarsStorage.all()),
    );
  }, []);

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
      setForm(form);
    };

  const handleChangeDates =
    <A extends keyof Pick<CreateEvent, "endDate" | "startDate">>(prop: A) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const target = new Date(event.target.value);
      form[prop] = target.getTime();
      setForm(form);
    };

  return storages.mapOrElse(
    () => null,
    ({ eventsStorage, eventsTemplateStorage }) => {
      const handleSubmit = () => {
        eventsStorage.update(id, form);
      };

      return (
        <PopupForm
          onSubmit={handleSubmit}
          setOpen={setOpen}
          refs={O.None()}
          className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden text-text-primary"
        >
          <FormHeader setOpen={setOpen} />
          <InputText
            placeholder="Title"
            defaultValue={initialForm.title}
            className="px-2 py-1 rounded-md mt-2 text-base bg-neutral-200"
            onChange={handleChangeText("title")}
            type="text"
          />
          <InputText
            placeholder="Description"
            defaultValue={initialForm.description}
            className="px-2 py-1 rounded-md  bg-neutral-200"
            onChange={handleChangeText("description")}
            type="text"
          />
          <div className="gap-1 flex">
            <label className="px-2 py-1 text-sm flex flex-col flex-nowrap justify-center rounded-md bg-neutral-200">
              Initial Date
              <InputText
                placeholder=""
                defaultValue={getHTMLDateTime(new Date(initialForm.startDate))}
                className="bg-neutral-200"
                onChange={handleChangeDates("startDate")}
                type="datetime-local"
              />
            </label>
            <label className="px-2 py-1 text-sm flex flex-col justify-center rounded-md bg-neutral-200">
              End Date
              <InputText
                placeholder=""
                defaultValue={getHTMLDateTime(new Date(initialForm.endDate))}
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
            value={form.calendar_id}
            className="px-2 py-1 rounded-md bg-neutral-200"
          >
            {calendars.map((value, index) => (
              <option key={index} value={value.id}>
                {value.name}
              </option>
            ))}
          </select>
          <select
            defaultValue={form.color}
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
          <div className="flex flex-col px-2 py-1 bg-neutral-200 min-h-[24px] items-start justify-start rounded-md mb-12">
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
          <div className="absolute w-full bottom-0 flex flex-col gap-[4px] left-0">
            <div className="w-full flex items-center justify-center gap-2 px-4">
              <InputButtons.Delete
                className="bg-red-500 font-semibold w-[25%] rounded-xl text-text-inverse px-2 py-1 text-sm"
                setOpen={setOpen}
                onDelete={() => {
                  eventsStorage.remove(id);
                }}
                text="Delete"
              />
              <InputButtons.Warning
                setOpen={setOpen}
                className="w-full"
                onWarning={() => {
                  const { startDate: _sd, endDate: _ed, ...template } = form;
                  eventsTemplateStorage.add(template);
                }}
                text="Make Template"
              />
            </div>
            <InputButtons.Primary
              type="submit"
              className="w-full left-0 font-semibold"
              value={"Save"}
            />
          </div>
        </PopupForm>
      );
    },
  );
};

export default UpdateEventForm;
