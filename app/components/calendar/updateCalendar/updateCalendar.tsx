import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import { Calendar, Timezones } from "@/services/calendar/calendar";
import { RefObject, useContext, useState } from "react";
import { None, Option } from "@/utils/option";
import { EventTemplate } from "@/services/events/eventTemplates";

const UpdateCalendarForm = ({
  refs,
  setOpen,
  initialCalendar,
}: {
  refs: Option<RefObject<any>[]>;
  setOpen: (open: boolean) => void;
  initialCalendar: Calendar;
}) => {
  const { id, ...initialForm } = initialCalendar;
  const [form, setForm] = useState(initialForm);
  const { storages } = useContext(StorageContext);
  const [selectedTemplate, setSelectedTemplate] = useState<
    Option<EventTemplate>
  >(None());

  if (storages.isSome()) {
    const { calendarsStorage, eventsStorage, eventsTemplateStorage } =
      storages.unwrap();
    const templates = eventsTemplateStorage
      .all()
      .filter((template) => template.calendar_id === id);
    return (
      <OutsideClick
        doSomething={() => {
          setOpen(false);
        }}
        refs={refs}
      >
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            calendarsStorage.updateCalendar(id, form);
            setOpen(false);
          }}
          className="fixed z-[2000] top-1/2 left-1/2 text-gray-500 p-[8px] flex flex-col gap-[4px] p-4 bg-white rounded-md"
        >
          <input
            title="name"
            type="text"
            placeholder="Name"
            className="text-black m-2 bg-gray-200"
            onChange={(e) => {
              form.name = e.target.value;
              setForm(form);
            }}
            defaultValue={initialCalendar.name}
          />
          <label>
            Timezone
            <select
              className="text-black m-2 bg-gray-200"
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
          {templates.length > 0 && (
            <label>
              Templates
              <div className="text-black m-2 bg-gray-200">
                {templates.map((template) => (
                  <div key={template.id}>{template.title}</div>
                ))}
              </div>
            </label>
          )}
          <input
            type="submit"
            className="flex-auto relative r-4 text-white bg-blue-600 rounded-md"
            value={"Save"}
          />
          <button
            className="absolute right-[8px] text-red-500"
            onClick={() => {
              setOpen(false);
              calendarsStorage.removeCalendar(id);
              eventsStorage.removeAll((event) => event.calendar_id === id);
            }}
          >
            Delete
          </button>
        </form>
      </OutsideClick>
    );
  }

  return null;
};

export default UpdateCalendarForm;
