import { StorageContext } from "@/hooks/dataHook";
import { Calendar } from "@/services/calendar/calendar";
import {
  CalendarEvent,
  CreateEvent,
  EventColors,
} from "@/services/events/events";
import { Option } from "@/utils/option";
import {
  JSXElementConstructor,
  PropsWithChildren,
  RefObject,
  useContext,
  useEffect,
  useState,
} from "react";
import { FormHeader, InputButtons, InputText, PopupForm } from "../forms/forms";
import { getHTMLDateTime } from "@/utils/date";
import {
  UpdateNotificationForm,
  initialNotification,
} from "@/components/notifications-update-form/eventNotificationsForm";
import { NewEventNotificationForm } from "@/components/notifications-create-form/createNotificationForm";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkHeadingGap from "remark-heading-gap";

export const EventForm = <T extends Omit<CalendarEvent, "id"> | CalendarEvent>({
  initialFormState,
  setOpen,
  onSubmit,
  onDelete,
  onCreateTemplate: onTemplate,
  templateSelector: TemplateSelector,
  blockedRefs,
}: {
  initialFormState: T;
  setOpen: (value: boolean) => void;
  onSubmit: (form: T) => void;
  onDelete?: (form: T) => void;
  onCreateTemplate?: (form: T) => void;
  templateSelector?: JSXElementConstructor<{
    updateForm: (value: Partial<T>) => void;
  }>;
  blockedRefs: Option<RefObject<any>[]>;
}) => {
  const { storages } = useContext(StorageContext);
  const [form, setForm] = useState<T>(initialFormState);
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  useEffect(() => {
    storages.map(async ({ calendarsStorage }) => {
      const foundDefault = await calendarsStorage.find({ default: true });
      if (form.calendar_id == "") {
        foundDefault.map(({ id }) => {
          form.calendar_id = id;
          setForm({ ...form });
        });
      }
    });
  }, []);

  useEffect(() => {
    storages.map(async ({ calendarsStorage }) =>
      setCalendars(await calendarsStorage.all()),
    );
  }, []);

  const handleChangeText =
    <
      A extends keyof Omit<
        CreateEvent,
        | "endDate"
        | "startDate"
        | "notifications"
        | "color"
        | "task_id"
        | "recurring_id"
        | "recurring_settings"
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
      setForm(form);
    };

  const [markdownPreview, setMarkdownPreview] = useState(
    form.description.length !== 0,
  );
  return (
    <PopupForm
      onSubmit={() => {
        onSubmit(form);
      }}
      setOpen={setOpen}
      refs={blockedRefs}
      className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden text-text-primary"
    >
      <FormHeader setOpen={setOpen}>
        {TemplateSelector && (
          <TemplateSelector
            updateForm={(templateForm) => setForm({ ...form, ...templateForm })}
          />
        )}
      </FormHeader>
      <InputText
        placeholder="Title"
        value={form.title}
        className="mt-2"
        onChange={handleChangeText("title")}
        type="text"
      />
      <label className="text-sm text-neutral-500 flex-initial w-full">
        Description
        <div
          className="w-full"
          onClick={() => setMarkdownPreview(false)}
          onBlur={() => setMarkdownPreview(true)}
        >
          {(!markdownPreview || form.description.length == 0) && (
            <textarea
              placeholder="Description"
              defaultValue={form.description}
              onChange={(e) => {
                e.stopPropagation();
                e.stopPropagation();
                const value = e.target.value;
                setForm({ ...form, description: value });
              }}
              className={`w-full whitespace-pre-wrap text-black px-2 py-1 bg-neutral-200 rounded-md`}
              style={{ resize: "vertical" }}
            />
          )}
          {markdownPreview && form.description.length != 0 && (
            <Markdown
              className={
                "prose w-full max-w-full min-h-[8px] text-text-primary px-2 py-1 bg-neutral-200 rounded-md"
              }
              remarkPlugins={[remarkGfm, remarkBreaks, remarkHeadingGap]}
              components={{
                h1: BoldHeadingsRenderer(1),
                h2: BoldHeadingsRenderer(2),
              }}
            >
              {form.description}
            </Markdown>
          )}
        </div>
      </label>
      <div className="gap-1 flex">
        <label className="px-2 py-1 text-sm flex flex-col flex-nowrap justify-center rounded-md bg-neutral-200">
          Initial Date
          <InputText
            placeholder=""
            defaultValue={getHTMLDateTime(new Date(form.startDate))}
            className="bg-neutral-200"
            onChange={handleChangeDates("startDate")}
            type="datetime-local"
          />
        </label>
        <label className="px-2 py-1 text-sm flex flex-col justify-center rounded-md bg-neutral-200">
          End Date
          <InputText
            placeholder=""
            defaultValue={getHTMLDateTime(new Date(form.endDate))}
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
      <div
        className={`flex flex-col px-2 py-1 bg-neutral-200 min-h-[24px] items-start justify-start rounded-md ${
          onDelete || onTemplate ? "mb-12" : "mb-4"
        }`}
      >
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
        {(onDelete || onTemplate) && (
          <div className="w-full flex items-center justify-center gap-2 px-4">
            {onDelete && (
              <InputButtons.Delete
                className="bg-red-500 font-semibold w-[25%] rounded-xl text-text-inverse px-2 py-1 text-sm"
                setOpen={setOpen}
                onDelete={() => {
                  onDelete(form);
                }}
                text="Delete"
              />
            )}
            {onTemplate && (
              <InputButtons.Warning
                setOpen={setOpen}
                className="w-full"
                onWarning={() => {
                  onTemplate(form);
                }}
                text="Make Template"
              />
            )}
          </div>
        )}
        <InputButtons.Primary
          type="submit"
          className="w-full left-0 font-semibold"
          value={"Save"}
        />
      </div>
    </PopupForm>
  );
};

const BoldHeadingsRenderer = (level: 1 | 2) => {
  const boldStyle = {
    1: "font-bold prose-2xl",
    2: "font-semibold prose-xl",
  } as const;
  const Component = ({ children }: PropsWithChildren) => {
    if (level === 1) {
      return <h1 className={boldStyle[level]}>{children}</h1>;
    } else if (level === 2) {
      const a = boldStyle[level];
      return <h2 className={a}>{children}</h2>;
    } else {
      return null;
    }
  };

  return Component;
};
