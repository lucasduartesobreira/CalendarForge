import OutsideClick from "@/components/utils/outsideClick";
import { StorageContext } from "@/hooks/dataHook";
import { CalendarEvent, CreateEvent } from "@/services/events/events";
import { getHTMLDateTime } from "@/utils/date";
import { None } from "@/utils/option";
import { useContext, useState } from "react";

const UpdateEventForm = ({
  setOpen,
  initialForm,
}: {
  setOpen: (open: boolean) => void;
  initialForm: CalendarEvent;
}) => {
  const storageContext = useContext(StorageContext);
  const { id, ...initialFormState } = initialForm;
  const [form, setForm] = useState(initialFormState);
  if (storageContext.isSome()) {
    const { eventsStorage, calendarsStorage } = storageContext.unwrap();

    const handleChangeText =
      <A extends keyof Omit<CreateEvent, "endDate" | "startDate">>(prop: A) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        form[prop] = event.target.value;
        setForm(form);
      };

    const handleChangeDates =
      <A extends keyof Pick<CreateEvent, "endDate" | "startDate">>(prop: A) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = new Date(event.target.value);
        form[prop] = target.getTime();
        setForm(form);
      };

    const handleSubmit = (submitEvent: any) => {
      submitEvent.preventDefault();

      eventsStorage.update(id, form);
      setOpen(false);
    };

    return (
      <OutsideClick doSomething={() => setOpen(false)} refs={None()}>
        <form
          hidden={false}
          onSubmit={handleSubmit}
          className="z-[1000] text-gray-500 fixed border-2 p-[8px]rounded-md top-1/2 left-1/2 bg-white flex flex-col"
        >
          <label>
            <input
              placeholder="Title"
              defaultValue={initialForm.title}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeText("title")}
              type="text"
            />
            <input
              placeholder="Description"
              defaultValue={initialForm.description}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeText("description")}
              type="text"
            />
            <input
              placeholder=""
              defaultValue={getHTMLDateTime(new Date(initialForm.startDate))}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeDates("startDate")}
              type="datetime-local"
            />
            <input
              placeholder=""
              defaultValue={getHTMLDateTime(new Date(initialForm.endDate))}
              className="text-black m-2 bg-gray-200"
              onChange={handleChangeDates("endDate")}
              type="datetime-local"
            />
          </label>
          <select
            onChange={(event) => {
              form.calendar_id = event.target.value;
              setForm(form);
            }}
            defaultValue={initialForm.calendar_id}
            className="text-black m-2 bg-gray-200"
          >
            {calendarsStorage.getCalendars().map((value, index) => (
              <option key={index} value={value.id}>
                {value.name}
              </option>
            ))}
          </select>
          <input
            type="submit"
            className="flex-auto relative r-4 text-white bg-blue-600 rounded-md"
            value={"Save"}
          />
          <button
            className="absolute right-[10px] text-red-500"
            onClick={() => {
              setOpen(false);
              eventsStorage.remove(id);
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

export default UpdateEventForm;
