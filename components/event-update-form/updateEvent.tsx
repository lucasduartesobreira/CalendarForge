import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { useContext } from "react";
import { EventForm } from "../shared/event-forms/eventForm";

const UpdateEventForm = ({
  setOpen,
  initialForm,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CalendarEvent;
}) => {
  const { storages } = useContext(StorageContext);

  return storages.mapOrElse(
    () => null,
    ({ eventsStorage, eventsTemplateStorage }) => {
      return (
        <EventForm
          onSubmit={({ id, ...form }) => {
            eventsStorage.update(id, form);
          }}
          onDelete={({ id }) => {
            eventsStorage.remove(id);
          }}
          onCreateTemplate={(form) => {
            const { startDate: _sd, endDate: _ed, ...template } = form;
            eventsTemplateStorage.add(template);
          }}
          setOpen={setOpen}
          initialFormState={initialForm}
          blockedRefs={O.None()}
        />
      );
    },
  );
};

export default UpdateEventForm;
