"use client";
import React, {
  RefObject,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StorageContext } from "@/hooks/dataHook";
import {
  CalendarEvent,
  CreateEvent,
  UpdateEvent,
} from "@/services/events/events";
import * as O from "@/utils/option";
import { EventTemplate } from "@/services/events/eventTemplates";
import { Button } from "../shared/button-view/buttons";
import { EventForm, EventTypeSwitch } from "../shared/event-forms/eventForm";
import { useShortcut } from "@/hooks/useShortcut";
import { ShortcutBuilder } from "@/utils/shortcuts";
import { useFormHandler } from "../form-handler/formHandler";

const initialFormState: CreateEvent = {
  title: "",
  endDate: Date.now() + 60 * 60 * 1000,
  startDate: Date.now(),
  description: "",
  calendar_id: "",
  notifications: [],
  color: "#7a5195",
};

const CreateEventForm = ({
  setOpen,
  initialForm,
  blockdRefs,
  onChangeForm,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CreateEvent;
  blockdRefs: O.Option<RefObject<any>[]>;
  onChangeForm?: (form: CreateEvent) => void;
}) => {
  const initialStartDate = new Date(initialForm.startDate);
  const initialEndDate = new Date(initialForm.endDate);
  initialStartDate.setSeconds(0, 0);
  initialEndDate.setSeconds(0, 0);

  const { storages } = useContext(StorageContext);
  useShortcut(
    ShortcutBuilder.new().build("Escape", () => {
      setOpen(false);
    }),
    "all",
  );

  return storages.mapOrElse(
    () => null,
    ({ eventsStorage, tasksStorage }) => (
      <EventForm
        blockedRefs={blockdRefs}
        setOpen={setOpen}
        onSubmit={(form, type) => {
          if (type === "task") {
            tasksStorage
              .add({
                title: form.title,
                description: form.description,
                completed: false,
              })
              .then((result) =>
                result.map((taskCreated) =>
                  eventsStorage.add({ ...form, task_id: taskCreated.id }),
                ),
              );
          } else {
            eventsStorage.add(form);
          }
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
        ChangeEventTypeSwitch={EventTypeSwitch(false)}
        onChangeForm={onChangeForm}
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

type State<V> = [V, React.Dispatch<React.SetStateAction<V>>];

export const CreateEventFormOpenCtx = createContext<
  State<O.Option<UpdateEvent>>
>([O.None(), () => {}]);

const CreateEventButton = () => {
  const [open, setOpen] = useContext(CreateEventFormOpenCtx);
  useShortcut(
    ShortcutBuilder.new().build("n", () => {
      setOpen(!open.isSome() ? O.Some({}) : open);
    }),
    "all",
  );
  const buttonRef = useRef(null);
  const updates = useMemo(() => open.unwrapOrElse(() => ({})), [open]);
  const initialFormUpdated: CreateEvent = useMemo(
    () => ({
      ...initialFormState,
      startDate: Date.now(),
      endDate: Date.now() + 3600 * 1000,
      ...updates,
    }),
    [updates],
  );

  const { setActiveForm: setForm } = useFormHandler();

  return (
    <div className="">
      <Button.Primary
        innerRef={buttonRef}
        sizeType="xl"
        className="absolute bottom-8 right-8 w-24 h-24 z-[1000] rounded-s-full rounded-e-full bg-primary-500"
        onClick={() =>
          setForm("createEvent", initialFormUpdated, O.Some(buttonRef))
        }
        value="Create Event"
      />
    </div>
  );
};

export default CreateEventButton;

export { CreateEventForm };
