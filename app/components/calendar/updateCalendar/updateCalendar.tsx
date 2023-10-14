import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import { Calendar, Timezones } from "@/services/calendar/calendar";
import { RefObject, useContext, useEffect, useState } from "react";
import * as O from "@/utils/option";
import { EventTemplate } from "@/services/events/eventTemplates";
import { UpdateEventTemplateForm } from "@/components/templates/updateEventTemplate";

const UpdateCalendarForm = ({
  refs,
  setOpen,
  initialCalendar,
}: {
  refs: O.Option<RefObject<any>[]>;
  setOpen: (open: boolean) => void;
  initialCalendar: Calendar;
}) => {
  const { id, ...initialForm } = initialCalendar;
  const [form, setForm] = useState(initialForm);
  const { storages, listeners } = useContext(StorageContext);
  const [selectedTemplate, setSelectedTemplate] = useState<
    O.Option<EventTemplate>
  >(O.None());
  const [templates, setTemplates] = useState<EventTemplate[]>([]);

  useEffect(() => {
    storages.map(({ eventsTemplateStorage }) => {
      setTemplates(() =>
        eventsTemplateStorage
          .all()
          .filter((template) => template.calendar_id === id),
      );
    });
  }, [listeners.eventsTemplateStorageListener]);

  if (storages.isSome()) {
    const { calendarsStorage, eventsStorage } = storages.unwrap();
    return (
      <OutsideClick
        doSomething={() => {
          setOpen(false);
        }}
        refs={refs}
        className="fixed z-[2000] top-1/2 left-1/2"
      >
        {!selectedTemplate.isSome() && (
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              calendarsStorage.update(id, form);
              setOpen(false);
            }}
            className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden"
          >
            <div className="w-full absolute top-0 h-[16px] text-xs left-0 bg-neutral-300 flex items-center">
              <button
                className="ml-auto mr-2 text-red-500"
                onClick={() => {
                  setOpen(false);
                  calendarsStorage.remove(id);
                  eventsStorage.removeWithFilter(
                    (event) => event.calendar_id === id,
                  );
                }}
              >
                Delete
              </button>
              <button
                className=" mr-3 text-neutral-500 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                X
              </button>
            </div>
            <input
              title="name"
              type="text"
              placeholder="Name"
              className="text-black px-2 py-1 mt-2 bg-neutral-200 text-base rounded-md"
              onChange={(e) => {
                form.name = e.target.value;
                setForm(form);
              }}
              defaultValue={initialCalendar.name}
            />
            <label className="text-sm mx-1 mb-4">
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
            {templates.length > 0 && (
              <label className="mx-1 mb-4">
                Templates
                <div className="text-black bg-neutral-200 rounded-md py-1 px-1">
                  {templates.map((template) => (
                    <div key={template.id} className="relative px-2 flex">
                      {template.title}
                      <button
                        className="text-yellow-500 ml-auto"
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setSelectedTemplate(O.Some(template));
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </label>
            )}
            <input
              type="submit"
              className="absolute bottom-0 w-full left-0 text-white bg-primary-500 rounded-md"
              value={"Save"}
            />
          </form>
        )}
        {selectedTemplate.isSome() && (
          <UpdateEventTemplateForm
            setOpen={() => setSelectedTemplate(O.None())}
            initialForm={selectedTemplate.unwrap()}
          />
        )}
      </OutsideClick>
    );
  }

  return null;
};

export default UpdateCalendarForm;
