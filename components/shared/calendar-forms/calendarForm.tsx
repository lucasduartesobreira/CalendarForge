import {
  Calendar,
  CreateCalendar,
  Timezones,
} from "@/services/calendar/calendar";
import { EventTemplate } from "@/services/events/eventTemplates";
import { None, Option, Some } from "@/utils/option";
import { JSXElementConstructor, RefObject, useState } from "react";
import { FormHeader, InputButtons, InputText, PopupForm } from "../forms/forms";
import { UpdateEventTemplateForm } from "@/components/template-update-form/updateEventTemplate";

export const CalendarForm = <T extends CreateCalendar | Calendar>({
  refs,
  setOpen,
  onSubmit,
  initialCalendar,
  onDelete,
  templateList: TemplateList,
}: {
  initialCalendar: T;
  refs: Option<RefObject<any>[]>;
  setOpen: (value: boolean) => void;
  onSubmit: (form: T) => void;
  onDelete?: () => void;
  templateList?: JSXElementConstructor<{
    selectTemplate: (value: EventTemplate) => void;
  }>;
}) => {
  const [form, setForm] = useState(initialCalendar);

  const [selectedTemplate, setSelectedTemplate] = useState<
    Option<EventTemplate>
  >(None());

  return selectedTemplate.mapOrElse(
    () => (
      <PopupForm
        refs={refs}
        setOpen={setOpen}
        onSubmit={() => {
          onSubmit(form);
          setOpen(false);
        }}
        id="calendar-form"
      >
        <FormHeader setOpen={setOpen} />
        <InputText
          title="name"
          type="text"
          placeholder="Name"
          onChange={(e) => {
            setForm((form) => ({ ...form, name: e.target.value }));
          }}
          value={form.name}
          required
          minLength={1}
          className="mt-2"
        />
        <label
          className={`text-sm mx-1 ${TemplateList == null ? "mb-4" : ""} `}
        >
          Timezone
          <select
            className="text-text-primary mx-2 bg-neutral-200 rounded-md"
            onChange={(e) => {
              const timezone = Number(e.target.value);
              if (timezone >= -12 && timezone <= 12) {
                setForm((form) => ({
                  ...form,
                  timezone: timezone as Timezones,
                }));
              }
            }}
            defaultValue={form.timezone}
          >
            <option value={-12}>(GMT-12:00)</option>
            <option value={-11}>(GMT-11:00)</option>
            <option value={-10}>(GMT-10:00)</option>
            <option value={-9}>(GMT-9:00)</option>
            <option value={-8}>(GMT-8:00)</option>
            <option value={-7}>(GMT-7:00)</option>
            <option value={-6}>(GMT-6:00)</option>
            <option value={-5}>(GMT-5:00)</option>
            <option value={-4}>(GMT-4:00)</option>
            <option value={-3}>(GMT-3:00)</option>
            <option value={-2}>(GMT-2:00)</option>
            <option value={-1}>(GMT-1:00)</option>
            <option value={0}>(GMT0:00)</option>
            <option value={1}>(GMT1:00)</option>
            <option value={2}>(GMT2:00)</option>
            <option value={3}>(GMT3:00)</option>
            <option value={4}>(GMT4:00)</option>
            <option value={5}>(GMT5:00)</option>
            <option value={6}>(GMT6:00)</option>
            <option value={7}>(GMT7:00)</option>
            <option value={8}>(GMT8:00)</option>
            <option value={9}>(GMT9:00)</option>
            <option value={10}>(GMT10:00)</option>
            <option value={11}>(GMT11:00)</option>
            <option value={12}>(GMT12:00)</option>
          </select>
        </label>
        {TemplateList && (
          <TemplateList
            selectTemplate={(template) => setSelectedTemplate(Some(template))}
          />
        )}
        <div className="absolute w-full bottom-0 flex flex-col gap-[4px] left-0">
          {onDelete && (
            <div className="w-full flex items-center justify-center gap-2 px-4">
              <InputButtons.Delete
                type="button"
                className="bg-red-500 font-semibold w-[25%] rounded-xl text-text-inverse px-2 py-1 text-sm"
                setOpen={setOpen}
                onDelete={() => {
                  onDelete();
                }}
                text="Delete"
              />
            </div>
          )}
          <InputButtons.Primary
            type="submit"
            className="w-full left-0 font-semibold"
            form="calendar-form"
            value={"Save"}
          />
        </div>
      </PopupForm>
    ),
    (template) => (
      <UpdateEventTemplateForm
        setOpen={() => setSelectedTemplate(None())}
        initialForm={template}
      />
    ),
  );
};
