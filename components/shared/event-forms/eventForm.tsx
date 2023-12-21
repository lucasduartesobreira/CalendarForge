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

const dayOfWeekFirstLetter = {
  0: "S",
  1: "M",
  2: "T",
  3: "W",
  4: "T",
  5: "F",
  6: "S",
};

export const EventForm = <T extends Omit<CalendarEvent, "id"> | CalendarEvent>({
  initialFormState,
  setOpen,
  onSubmit,
  onDelete,
  onCreateTemplate: onTemplate,
  templateSelector: TemplateSelector,
  closeOnSubmit = true,
  closeOnDelete = true,
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
  closeOnSubmit?: boolean;
  closeOnDelete?: boolean;
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
      closeOnSubmit={closeOnSubmit}
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
      <div className="gap-1 flex flex-col">
        <div className="flex gap-1">
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
        <label className="text-sm px-2 py-1 w-full bg-neutral-200 rounded-md justify-start flex flex-col gap-1">
          <div className="flex gap-1">
            <a className="pl-2 py-1">Repeating</a>
            <select
              value={form.recurring_settings?.frequencyType}
              className="bg-neutral-200 text-center"
              onChange={(event) => {
                const value = event.target.value;
                const newSettings =
                  value === "never"
                    ? undefined
                    : value === "daily"
                    ? {
                        frequencyType: value,
                        frequency: 1,
                        stop: form.recurring_settings?.stop ?? {
                          type: "frequency",
                          afterFrequency: 1,
                        },
                      }
                    : {
                        frequencyType: value,
                        days: [new Date(form.startDate).getDay()],
                        stop: form.recurring_settings?.stop ?? {
                          type: "frequency",
                          afterFrequency: 1,
                        },
                      };

                setForm({
                  ...form,
                  recurring_settings: newSettings,
                });
              }}
            >
              <option value={"never"}>never</option>
              <option value={"weekly"}>weekly</option>
              <option value={"daily"}>daily</option>
            </select>
            {
              <>
                {form.recurring_settings != undefined &&
                  form.recurring_settings.frequencyType === "daily" &&
                  form.recurring_settings.frequency != null && (
                    <>
                      <a className="py-1">every</a>
                      <InputText
                        type="number"
                        className="text-sm text-black w-[56px] text-right"
                        value={form.recurring_settings.frequency}
                        min={1}
                        max={365}
                        onChange={(e) => {
                          const value = e.currentTarget.valueAsNumber;
                          const { recurring_settings } = form;
                          if (recurring_settings?.frequencyType === "daily")
                            recurring_settings.frequency =
                              value == Number.NaN ? 1 : value;

                          setForm({
                            ...form,
                            recurring_settings,
                          });
                        }}
                      />
                      <a className="py-1">days</a>
                    </>
                  )}
                {form.recurring_settings != undefined &&
                  form.recurring_settings.frequencyType === "weekly" &&
                  form.recurring_settings.days != null && (
                    <>
                      <a className="py-1 pr-1">every</a>
                      {([0, 1, 2, 3, 4, 5, 6] as const).map((value) => {
                        return (
                          <InputText
                            key={value}
                            type="button"
                            className={`px-1 py-0 rounded-full font-mono  ${
                              form.recurring_settings?.frequencyType ===
                              "weekly"
                                ? form.recurring_settings.days.find(
                                    (day) => day === value,
                                  ) != null
                                  ? "bg-primary-400 text-text-inverse font-bold"
                                  : "bg-neutral-400 text-text-inverse font-semibold"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              const { recurring_settings } = form;
                              if (
                                recurring_settings?.frequencyType === "weekly"
                              ) {
                                const daysSet = new Set(
                                  recurring_settings.days,
                                );
                                if (daysSet.has(value)) daysSet.delete(value);
                                else daysSet.add(value);

                                setForm({
                                  ...form,
                                  recurring_settings: {
                                    ...recurring_settings,
                                    days: Array.from(daysSet),
                                  },
                                });
                              }
                            }}
                            value={dayOfWeekFirstLetter[value]}
                          />
                        );
                      })}
                    </>
                  )}
              </>
            }
          </div>
          {form.recurring_settings != null && (
            <div className="flex gap-1 pb-1">
              <a className="pl-2">Stopping after</a>
              <select
                className="bg-neutral-200"
                value={form.recurring_settings.stop.type}
                onChange={(e) => {
                  const value = e.target.value;
                  const newStopSetting =
                    value === "frequency"
                      ? { type: value, afterFrequency: 1 }
                      : {
                          type: "date",
                          afterDay: new Date(form.startDate + 24 * 3600 * 1000),
                        };

                  setForm({
                    ...form,
                    recurring_settings: {
                      ...form.recurring_settings,
                      stop: newStopSetting,
                    },
                  });
                }}
              >
                <option value={"date"}>the day</option>
                <option value={"frequency"}>repeating</option>
              </select>
              {form.recurring_settings.stop.type === "frequency" && (
                <>
                  <InputText
                    type="number"
                    min={1}
                    max={365}
                    className="py-0 text-right w-[56px]"
                    value={form.recurring_settings.stop.afterFrequency}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber;
                      if (form.recurring_settings?.stop.type === "frequency") {
                        form.recurring_settings.stop.afterFrequency = value;
                      }
                      setForm({ ...form });
                    }}
                  />
                  <a className="pl-2">time(s)</a>
                </>
              )}
              {form.recurring_settings.stop.type === "date" && (
                <InputText
                  type="date"
                  value={form.recurring_settings.stop.afterDay
                    .toISOString()
                    .slice(0, 10)}
                  onChange={(e) => {
                    const value = e.target.valueAsDate;
                    if (
                      form.recurring_settings?.stop.type === "date" &&
                      value != null
                    ) {
                      form.recurring_settings.stop.afterDay = new Date(
                        value.getTime() + value.getTimezoneOffset() * 1000 * 60,
                      );
                    }
                    setForm({ ...form });
                  }}
                  className="py-0"
                />
              )}
            </div>
          )}
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
                closeOnDelete={closeOnDelete}
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
