import { RecurringEventsHandler, StorageContext } from "@/hooks/dataHook";
import { CalendarEvent } from "@/services/events/events";
import * as O from "@/utils/option";
import { useContext, useRef, useState } from "react";
import { EventForm } from "../shared/event-forms/eventForm";
import { InputButtons, InputText, PopupForm } from "../shared/forms/forms";

const UpdateEventForm = ({
  setOpen,
  initialForm,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CalendarEvent;
}) => {
  const { storages } = useContext(StorageContext);
  const recurringEventsManager = useContext(RecurringEventsHandler);
  const [updatedForm, setUpdatedForm] = useState<O.Option<CalendarEvent>>(
    O.None(),
  );
  const [deleteId, setDeleteId] = useState<O.Option<CalendarEvent["id"]>>(
    O.None(),
  );

  const [selectedOption, setOption] = useState<"all" | "forward" | "one">();

  const ref = useRef(null);

  return storages
    .flatMap((storages) =>
      recurringEventsManager.map((manager) => ({ ...storages, manager })),
    )
    .mapOrElse(
      () => null,
      ({
        eventsStorage,
        eventsTemplateStorage,
        manager: recurringEventsManager,
      }) => {
        return (
          <>
            <EventForm
              closeOnSubmit={false}
              onSubmit={({ id, ...form }) => {
                (async () =>
                  (await eventsStorage.findById(id))
                    .ok(Symbol("Record not found"))
                    .map(async (event) => {
                      const addingRecurring =
                        form.recurring_settings != null &&
                        event.recurring_settings == null;
                      const removingRecurring =
                        form.recurring_settings == null &&
                        event.recurring_settings != null;
                      const changingARecurringEvent =
                        form.recurring_settings != null ||
                        event.recurring_settings != null;
                      if (
                        changingARecurringEvent &&
                        !addingRecurring &&
                        !removingRecurring
                      ) {
                        return setUpdatedForm(O.Some({ id, ...form }));
                      } else if (removingRecurring || addingRecurring) {
                        await recurringEventsManager.updateForward(id, form);
                        return setOpen(false);
                      }

                      await eventsStorage.update(id, form);
                      return setOpen(false);
                    }))();
              }}
              closeOnDelete={false}
              onDelete={({ id }) => {
                (async () =>
                  (await eventsStorage.findById(id))
                    .ok(Symbol("Record not found"))
                    .map((event) => {
                      if (event.recurring_settings != null)
                        return setDeleteId(O.Some(id));
                      eventsStorage.remove(id);
                      return setOpen(false);
                    }))();
              }}
              onCreateTemplate={(form) => {
                const {
                  startDate: _sd,
                  endDate: _ed,
                  recurring_settings: _recurring_settings,
                  recurring_id: _recurring_id,
                  task_id: _task_id,
                  todo_id: _todo_id,
                  ...template
                } = form;
                eventsTemplateStorage.add(template);
              }}
              setOpen={setOpen}
              initialFormState={initialForm}
              blockedRefs={O.Some([ref])}
            />
            {updatedForm.mapOrElse(
              () => null,
              (updatedForm) => (
                <PopupForm
                  setOpen={(value) =>
                    value
                      ? setUpdatedForm(O.Some(updatedForm))
                      : setUpdatedForm(O.None())
                  }
                  refs={O.None()}
                  onSubmit={() => {
                    if (selectedOption === "one") {
                      const { recurring_settings, id, ...form } = updatedForm;
                      eventsStorage.update(id, form);
                    } else if (selectedOption === "forward") {
                      const { id, ...form } = updatedForm;
                      recurringEventsManager.updateForward(id, form);
                    } else if (selectedOption === "all") {
                      const { id, ...form } = updatedForm;
                      recurringEventsManager.updateAll(id, form);
                    }
                    setOpen(false);
                  }}
                  closeOnSubmit={true}
                  className="text-black"
                  ref={ref}
                >
                  <label className="flex gap-1">
                    <InputText
                      type="radio"
                      value={"one"}
                      name="update_question"
                      checked={selectedOption === "one"}
                      onChange={() => setOption("one")}
                    />
                    Update only this one
                  </label>
                  <label className="flex gap-1">
                    <InputText
                      type="radio"
                      value={"forward"}
                      name="update_question"
                      checked={selectedOption === "forward"}
                      onChange={() => setOption("forward")}
                    />
                    Update this and all the next ones
                  </label>
                  <label className="flex gap-1 mb-4">
                    <InputText
                      type="radio"
                      value={"all"}
                      name="update_question"
                      checked={selectedOption === "all"}
                      onChange={() => setOption("all")}
                    />
                    Update all events
                  </label>
                  <div className="absolute bottom-0 w-full left-0">
                    <InputButtons.Primary
                      type="submit"
                      className="w-full left-0 font-semibold"
                      value={"Confirm"}
                    />
                  </div>
                </PopupForm>
              ),
            )}
            {deleteId.mapOrElse(
              () => null,
              (deleteId) => (
                <PopupForm
                  setOpen={(value) =>
                    value
                      ? setDeleteId(O.Some(deleteId))
                      : setDeleteId(O.None())
                  }
                  refs={O.None()}
                  onSubmit={() => {
                    if (selectedOption === "one") {
                      eventsStorage.remove(deleteId);
                    } else if (selectedOption === "forward") {
                      recurringEventsManager.deleteForward(deleteId);
                    } else if (selectedOption === "all") {
                      recurringEventsManager.deleteAll(deleteId);
                    }
                    setOpen(false);
                  }}
                  closeOnSubmit={true}
                  className="text-black"
                  ref={ref}
                >
                  <label className="flex gap-1">
                    <InputText
                      type="radio"
                      value={"one"}
                      name="update_question"
                      checked={selectedOption === "one"}
                      onChange={() => setOption("one")}
                    />
                    Delete only this one
                  </label>
                  <label className="flex gap-1">
                    <InputText
                      type="radio"
                      value={"forward"}
                      name="update_question"
                      checked={selectedOption === "forward"}
                      onChange={() => setOption("forward")}
                    />
                    Delete this and all the next ones
                  </label>
                  <label className="flex gap-1 mb-4">
                    <InputText
                      type="radio"
                      value={"all"}
                      name="update_question"
                      checked={selectedOption === "all"}
                      onChange={() => setOption("all")}
                    />
                    Delete all events
                  </label>
                  <div className="absolute bottom-0 w-full left-0">
                    <InputButtons.Primary
                      type="submit"
                      className="w-full left-0 font-semibold"
                      value={"Confirm"}
                    />
                  </div>
                </PopupForm>
              ),
            )}
          </>
        );
      },
    );
};

export default UpdateEventForm;
