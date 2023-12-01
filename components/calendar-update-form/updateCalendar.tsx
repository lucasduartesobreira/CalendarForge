import { StorageContext } from "@/hooks/dataHook";
import {
  Calendar,
  CreateCalendar,
  Timezones,
} from "@/services/calendar/calendar";
import {
  JSXElementConstructor,
  RefObject,
  useContext,
  useEffect,
  useState,
} from "react";
import * as O from "@/utils/option";
import { EventTemplate } from "@/services/events/eventTemplates";
import { UpdateEventTemplateForm } from "@/components/template-update-form/updateEventTemplate";
import { Button } from "../shared/button-view/buttons";
import {
  FormHeader,
  InputButtons,
  InputText,
  PopupForm,
} from "../shared/forms/forms";

const UpdateCalendarForm = ({
  refs,
  setOpen,
  initialCalendar,
}: {
  refs: O.Option<RefObject<any>[]>;
  setOpen: (open: boolean) => void;
  initialCalendar: Calendar;
}) => {
  const { id } = initialCalendar;
  const { storages } = useContext(StorageContext);

  return storages.mapOrElse(
    () => null,
    ({ calendarsStorage }) => (
      <CalendarForm
        refs={refs}
        setOpen={setOpen}
        onSubmit={({ id, ...form }) => {
          calendarsStorage.update(id, form);
        }}
        initialCalendar={initialCalendar}
        onDelete={() => calendarsStorage.remove(id)}
        templateList={templateListFactory(id)}
      />
    ),
  );
};

const CalendarForm = <T extends CreateCalendar | Calendar>({
  refs,
  setOpen,
  onSubmit,
  initialCalendar,
  onDelete,
  templateList: TemplateList,
}: {
  initialCalendar: T;
  refs: O.OptionClass<RefObject<any>[]>;
  setOpen: (value: boolean) => void;
  onSubmit: (form: T) => void;
  onDelete?: () => void;
  templateList?: JSXElementConstructor<{
    selectTemplate: (value: EventTemplate) => void;
  }>;
}) => {
  const [form, setForm] = useState(initialCalendar);

  const [selectedTemplate, setSelectedTemplate] = useState<
    O.Option<EventTemplate>
  >(O.None());

  return selectedTemplate.mapOrElse(
    () => (
      <PopupForm
        refs={refs}
        setOpen={setOpen}
        onSubmit={() => {
          onSubmit(form);
          setOpen(false);
        }}
      >
        <FormHeader setOpen={setOpen} />
        <InputText
          title="name"
          type="text"
          placeholder="Name"
          onChange={(e) => {
            form.name = e.target.value;
            setForm(form);
          }}
          value={form.name}
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
              if (timezone >= -12 && timezone <= 12)
                form.timezone = timezone as Timezones;

              setForm(form);
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
            selectTemplate={(template) => setSelectedTemplate(O.Some(template))}
          />
        )}
        <div className="absolute w-full bottom-0 flex flex-col gap-[4px] left-0">
          {onDelete && (
            <div className="w-full flex items-center justify-center gap-2 px-4">
              <InputButtons.Delete
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
            value={"Save"}
          />
        </div>
      </PopupForm>
    ),
    (template) => (
      <UpdateEventTemplateForm
        setOpen={() => setSelectedTemplate(O.None())}
        initialForm={template}
      />
    ),
  );
};

const templateListFactory = (calendarId: Calendar["id"]) => {
  const Template = ({
    selectTemplate,
  }: {
    selectTemplate: (template: EventTemplate) => void;
  }) => {
    const { storages, listeners } = useContext(StorageContext);
    const [templates, setTemplates] = useState<EventTemplate[]>([]);

    useEffect(() => {
      storages.map(async ({ eventsTemplateStorage }) => {
        const allTemplates = await eventsTemplateStorage.all();
        setTemplates(() =>
          allTemplates.filter(
            (template) => template.calendar_id === calendarId,
          ),
        );
      });
    }, [listeners.eventsTemplateStorageListener, storages]);

    return (
      <label className="mx-1 mb-12">
        Templates
        <div className="text-black bg-neutral-200 rounded-md py-1 px-1">
          {templates.length > 0 ? (
            templates.map((template) => (
              <div key={template.id} className="relative px-2 flex">
                {template.title}
                <Button.Secondary
                  onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    selectTemplate(template);
                  }}
                  value="Edit"
                  sizeType="ml"
                />
              </div>
            ))
          ) : (
            <div className="relative px-2 flex">No template found</div>
          )}
        </div>
      </label>
    );
  };

  return Template;
};

export default UpdateCalendarForm;
