import { StorageContext } from "@/hooks/dataHook";
import { Calendar, Timezones } from "@/services/calendar/calendar";
import { ChangeEvent, RefObject, useContext, useEffect, useState } from "react";
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
  const { id, ...initialForm } = initialCalendar;
  const [form, setForm] = useState(initialForm);
  const { storages, listeners } = useContext(StorageContext);
  const [selectedTemplate, setSelectedTemplate] = useState<
    O.Option<EventTemplate>
  >(O.None());
  const [templates, setTemplates] = useState<EventTemplate[]>([]);

  useEffect(() => {
    storages.map(async ({ eventsTemplateStorage }) => {
      const allTemplates = await eventsTemplateStorage.all();
      setTemplates(() =>
        allTemplates.filter((template) => template.calendar_id === id),
      );
    });
  }, [id, listeners.eventsTemplateStorageListener, storages]);

  return storages.mapOrElse(
    () => null,
    ({ calendarsStorage, eventsStorage }) =>
      selectedTemplate.mapOrElse(
        () => (
          <PopupForm
            refs={refs}
            setOpen={setOpen}
            onSubmit={() => {
              calendarsStorage.update(id, form);
              setOpen(false);
            }}
          >
            <FormHeader
              onDelete={() => {
                setOpen(false);
                calendarsStorage.remove(id);
                eventsStorage.removeWithFilter(
                  (event) => event.calendar_id === id,
                );
              }}
              setOpen={setOpen}
            />
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
                      <Button.Secondary
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setSelectedTemplate(O.Some(template));
                        }}
                        value="Edit"
                        sizeType="ml"
                      />
                    </div>
                  ))}
                </div>
              </label>
            )}
            <InputButtons.Primary
              type="submit"
              className="absolute bottom-0 w-full left-0"
              value={"Save"}
            />
          </PopupForm>
        ),
        (selectedTemplate) => (
          <UpdateEventTemplateForm
            setOpen={() => setSelectedTemplate(O.None())}
            initialForm={selectedTemplate}
          />
        ),
      ),
  );
};

export default UpdateCalendarForm;
