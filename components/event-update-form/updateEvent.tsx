import OutsideClick from "@/components/utils/outsideClick";
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
  if (storages.isSome()) {
    const { eventsStorage, calendarsStorage, eventsTemplateStorage } =
      storages.unwrap();

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

    const handleSubmit = (submitEvent: any) => {
      submitEvent.preventDefault();

      eventsStorage.update(id, form);
      setOpen(false);
    };

    return (
      <OutsideClick
        doSomething={() => setOpen(false)}
        refs={O.None()}
        className="z-[1000] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <form
          hidden={false}
          onSubmit={handleSubmit}
          className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden text-text-primary"
        >
          <div className="w-full absolute top-0 h-[16px] text-xs left-0 bg-neutral-300 flex items-center justify-center">
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
            defaultValue={initialForm.title}
            className="px-2 py-1 rounded-md mt-2 text-base bg-neutral-200"
            onChange={handleChangeText("title")}
            type="text"
          />
          <input
            placeholder="Description"
            defaultValue={initialForm.description}
            className="px-2 py-1 rounded-md  bg-neutral-200"
            onChange={handleChangeText("description")}
            type="text"
          />
          <div className="gap-1 flex">
            <label className="px-2 py-1 text-sm flex flex-col flex-nowrap justify-center rounded-md bg-neutral-200">
              Initial Date
              <input
                placeholder=""
                defaultValue={getHTMLDateTime(new Date(initialForm.startDate))}
                className="bg-neutral-200"
                onChange={handleChangeDates("startDate")}
                type="datetime-local"
              />
            </label>
            <label className="px-2 py-1 text-sm flex flex-col justify-center rounded-md bg-neutral-200">
              End Date
              <input
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
            ></NewEventNotificationForm>
          </div>
          <div className="absolute w-full bottom-0 flex flex-col gap-[4px] left-0">
            <div className="w-full flex items-center justify-center gap-2 px-4">
              <button
                className="bg-red-500 font-semibold w-[25%] rounded-xl text-text-inverse px-2 py-1 text-sm"
                onClick={() => {
                  setOpen(false);
                  eventsStorage.remove(id);
                }}
              >
                Delete
              </button>
              <button
                className="bg-amber-500 font-semibold w-full rounded-xl text-text-inverse px-2 py-1 text-sm"
                onClick={() => {
                  setOpen(false);
                  const { startDate: _sd, endDate: _ed, ...template } = form;
                  eventsTemplateStorage.add(template);
                }}
              >
                Make Template
              </button>
            </div>
            <input
              type="submit"
              className="w-full left-0 font-semibold text-white bg-primary-500 rounded-md"
              value={"Save"}
            />
          </div>
        </form>
      </OutsideClick>
    );
  }

  return null;
};

export default UpdateEventForm;
