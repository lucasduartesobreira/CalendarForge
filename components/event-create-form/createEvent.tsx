"use client";
import React, {
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent, CreateEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { EventTemplate } from "@/services/events/eventTemplates";
import { Button } from "../shared/button-view/buttons";
import { EventForm } from "../event-update-form/updateEvent";

const OWN_CALENDAR_ID = Buffer.from("own_calendar").toString("base64");

const initialFormState: CreateEvent = {
  title: "",
  endDate: Date.now() + 60 * 60 * 1000,
  startDate: Date.now(),
  description: "",
  calendar_id: OWN_CALENDAR_ID,
  notifications: [],
  color: "#7a5195",
  task_id: O.None(),
};

const CreateEventForm = ({
  setOpen,
  initialForm,
  blockdRefs,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CreateEvent;
  blockdRefs: O.Option<RefObject<any>[]>;
}) => {
  const initialStartDate = new Date(initialForm.startDate);
  const initialEndDate = new Date(initialForm.endDate);
  initialStartDate.setSeconds(0, 0);
  initialEndDate.setSeconds(0, 0);

  const { storages } = useContext(StorageContext);

  return storages.mapOrElse(
    () => null,
    ({ eventsStorage }) => (
      <EventForm
        blockedRefs={blockdRefs}
        setOpen={setOpen}
        onSubmit={(form) => {
          eventsStorage.add(form);
        }}
        initialFormState={
          {
            ...initialForm,
            notifications: [...initialForm.notifications],
            startDate: initialStartDate.getTime(),
            endDate: initialEndDate.getTime(),
          } as Omit<CalendarEvent, "id">
        }
        templateSelector={TemplateSelector}
      />
    ),
  );
};

const TemplateSelector = ({
  updateForm,
}: {
  updateForm: (value: Partial<CalendarEvent>) => void;
}) => {
  const { storages } = useContext(StorageContext);
  const [selectedTemplate, setSelectedTemplate] = useState<string>();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);

  useEffect(() => {
    storages.map(async ({ eventsTemplateStorage }) =>
      setTemplates(await eventsTemplateStorage.all()),
    );
  }, []);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate.length > 0) {
      storages.map(async ({ eventsTemplateStorage }) =>
        (await eventsTemplateStorage.findById(selectedTemplate)).map(
          (template) =>
            updateForm({
              ...template,
            }),
        ),
      );
    }
  }, [selectedTemplate]);

  return (
    <label className="ml-5 origin-center text-neutral-500">
      {selectedTemplate != null && selectedTemplate.length > 0
        ? "Template"
        : ""}
      <select
        value={selectedTemplate}
        className="bg-neutral-300"
        onChange={(ev) => {
          ev.preventDefault();
          const selectedValue = ev.currentTarget.value;
          setSelectedTemplate(selectedValue);
        }}
      >
        <option value={undefined} />
        {templates.map((template, index) => {
          return (
            <option key={index} value={template.id}>
              {template.title}
            </option>
          );
        })}
      </select>
    </label>
  );
};

const CreateEventButton = () => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  return (
    <div className="">
      <Button.Primary
        ref={buttonRef}
        sizeType="xl"
        className="absolute bottom-8 right-8 w-24 h-24 z-[1000] rounded-s-full rounded-e-full bg-primary-500"
        onClick={() => setOpen(!open)}
        value="Create Event"
      />
      {open && (
        <CreateEventForm
          setOpen={setOpen}
          initialForm={initialFormState}
          blockdRefs={O.Some([buttonRef])}
        />
      )}
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };
