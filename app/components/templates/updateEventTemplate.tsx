import { StorageContext } from "@/hooks/dataHook";
import {
  CreateTemplate,
  EventTemplate,
  UpdateTemplate,
} from "@/services/events/eventTemplates";
import { useContext, useState } from "react";
import OutsideClick from "../utils/outsideClick";
import * as O from "@/utils/option";
import {
  NewEventNotificationForm,
  UpdateNotificationForm,
  initialNotification,
} from "../events/notifications/eventNotificationsForm";
import { EventColors } from "@/services/events/events";

export const UpdateEventTemplateForm = ({
  setOpen,
  initialForm,
}: {
  setOpen: (open: boolean) => void;
  initialForm: EventTemplate;
}) => {
  const { storages } = useContext(StorageContext);
  const { id, ...initialFormState } = initialForm;
  const [form, setForm] = useState(initialFormState);
  if (storages.isSome()) {
    const { calendarsStorage, eventsTemplateStorage } = storages.unwrap();

    const handleChangeText =
      <A extends keyof Omit<UpdateTemplate, "notifications" | "color">>(
        prop: A,
      ) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        form[prop] = event.target.value;
        setForm({ ...form });
      };

    const handleSubmit = (submitEvent: any) => {
      submitEvent.preventDefault();

      eventsTemplateStorage.update(id, form);
      setOpen(false);
    };

    return (
      <OutsideClick doSomething={() => setOpen(false)} refs={O.None()}>
        <form
          hidden={false}
          onSubmit={handleSubmit}
          className="z-[2100] text-neutral-500 fixed border-2 p-[8px] rounded-md top-1/2 left-1/2 bg-white flex flex-col"
        >
          <label>
            <input
              placeholder="Title"
              value={form.title}
              className="text-black m-2 bg-neutral-200"
              onChange={handleChangeText("title")}
              type="text"
            />
            <input
              placeholder="Description"
              value={form.description}
              className="text-black m-2 bg-neutral-200"
              onChange={handleChangeText("description")}
              type="text"
            />
          </label>
          <select
            onChange={() => {}}
            value={form.calendar_id}
            className="text-black m-2 bg-neutral-200"
          >
            {calendarsStorage.all().map((value, index) => (
              <option key={index} value={value.id}>
                {value.name}
              </option>
            ))}
          </select>
          <select
            value={form.color}
            onChange={(event) => {
              form.color = event.target.value as CreateTemplate["color"];
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
                eventsTemplateStorage.remove(id);
              }}
            >
              Delete
            </button>
          </div>
        </form>
      </OutsideClick>
    );
  }

  return null;
};
