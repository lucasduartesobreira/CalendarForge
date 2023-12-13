import { StorageContext } from "@/hooks/dataHook";
import {
  CreateTemplate,
  EventTemplate,
  UpdateTemplate,
} from "@/services/events/eventTemplates";
import { useContext, useEffect, useState } from "react";
import OutsideClick from "../utils/outsideClick";
import * as O from "@/utils/option";
import {
  UpdateNotificationForm,
  initialNotification,
} from "@/components/notifications-update-form/eventNotificationsForm";
import { EventColors } from "@/services/events/events";
import { Calendar } from "@/services/calendar/calendar";
import { NewEventNotificationForm } from "@/components/notifications-create-form/createNotificationForm";
import {
  FormHeader,
  InputButtons,
  InputText,
  PopupForm,
} from "../shared/forms/forms";

export const UpdateEventTemplateForm = ({
  setOpen,
  initialForm,
}: {
  setOpen: (open: boolean) => void;
  initialForm: EventTemplate;
}) => {
  const { storages, listeners } = useContext(StorageContext);
  const { id, ...initialFormState } = initialForm;
  const [form, setForm] = useState(initialFormState);
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  useEffect(() => {
    storages.map(({ calendarsStorage }) =>
      calendarsStorage.all().then((allCalendars) => setCalendars(allCalendars)),
    );
  }, [storages, listeners.calendarsStorageListener]);

  const handleChangeText =
    <
      A extends keyof Omit<
        UpdateTemplate,
        "notifications" | "color" | "task_id" | "recurring"
      >,
    >(
      prop: A,
    ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      form[prop] = event.target.value;
      setForm({ ...form });
    };

  return storages.mapOrElse(
    () => null,
    ({ eventsTemplateStorage }) => {
      const handleSubmit = () => {
        eventsTemplateStorage.update(id, form);
      };

      return (
        <PopupForm
          setOpen={setOpen}
          refs={O.None()}
          onSubmit={handleSubmit}
          className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden text-text-primary"
        >
          <FormHeader setOpen={setOpen} />
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
          <select
            onChange={() => {}}
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
            value={form.color}
            onChange={(event) => {
              form.color = event.target.value as CreateTemplate["color"];
              setForm({ ...form });
            }}
            style={{ color: form.color }}
            className="px-2 py-1 bg-neutral-200 rounded-md"
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
                  eventsTemplateStorage.remove(id);
                }}
                text="Delete"
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
