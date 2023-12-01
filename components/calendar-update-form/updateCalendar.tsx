import { StorageContext } from "@/hooks/dataHook";
import { Calendar } from "@/services/calendar/calendar";
import { RefObject, useContext, useEffect, useState } from "react";
import * as O from "@/utils/option";
import { EventTemplate } from "@/services/events/eventTemplates";
import { Button } from "../shared/button-view/buttons";
import { CalendarForm } from "../shared/calendar-forms/calendarForm";

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
