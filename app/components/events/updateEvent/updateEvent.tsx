import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import {
  CalendarEvent,
  CreateEvent,
  EventColors,
} from "@/services/events/events";
import { getHTMLDateTime } from "@/utils/date";
import * as O from "@/utils/option";
import { useContext, useState } from "react";
import {
  NewEventNotificationForm,
  UpdateNotificationForm,
  initialNotification,
} from "../notifications/eventNotificationsForm";

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
  if (storages.isSome()) {
    const { eventsStorage, calendarsStorage, eventsTemplateStorage } =
      storages.unwrap();

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
      <OutsideClick doSomething={() => setOpen(false)} refs={O.None()}>
        <form
          hidden={false}
          onSubmit={handleSubmit}
          className="z-[1000] text-neutral-500 fixed border-2 p-[8px]rounded-md top-1/2 left-1/2 bg-white flex flex-col"
        >
          <label>
            <input
              placeholder="Title"
              defaultValue={initialForm.title}
              className="text-black m-2 bg-neutral-200"
              onChange={handleChangeText("title")}
              type="text"
            />
            <input
              placeholder="Description"
              defaultValue={initialForm.description}
              className="text-black m-2 bg-neutral-200"
              onChange={handleChangeText("description")}
              type="text"
            />
            <input
              placeholder=""
              defaultValue={getHTMLDateTime(new Date(initialForm.startDate))}
              className="text-black m-2 bg-neutral-200"
              onChange={handleChangeDates("startDate")}
              type="datetime-local"
            />
            <input
              placeholder=""
              defaultValue={getHTMLDateTime(new Date(initialForm.endDate))}
              className="text-black m-2 bg-neutral-200"
              onChange={handleChangeDates("endDate")}
              type="datetime-local"
            />
          </label>
          <select
            onChange={(event) => {
              form.calendar_id = event.target.value;
              setForm(form);
            }}
            defaultValue={initialForm.calendar_id}
            className="text-black m-2 bg-neutral-200"
          >
            {calendarsStorage.all().map((value, index) => (
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
            style={{ color: form.color }}
          >
            {EventColors.map((color, index) => (
              <option key={index} value={color} style={{ color }}>
                Event Color
              </option>
            ))}
          </select>
          <div className="relative flex flex-col m-2 bg-neutral-100 min-h-[24px]">
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
            className="flex-auto relative r-4 text-white bg-primary-500 rounded-md"
            value={"Save"}
          />
          <div className="absolute flex flex-row-reverse gap-[4px] right-0">
            <button
              className="text-red-500"
              onClick={() => {
                setOpen(false);
                eventsStorage.remove(id);
              }}
            >
              Delete
            </button>
            <button
              className="text-yellow-500"
              onClick={() => {
                setOpen(false);
                const { startDate: _sd, endDate: _ed, ...template } = form;
                eventsTemplateStorage.add(template);
              }}
            >
              + Template
            </button>
          </div>
        </form>
      </OutsideClick>
    );
  }

  return null;
};

export default UpdateEventForm;
