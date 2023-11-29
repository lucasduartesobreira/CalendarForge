import { StorageContext } from "@/hooks/dataHook";
import { CreateCalendar, Timezones } from "@/services/calendar/calendar";
import * as O from "@/utils/option";
import { RefObject, useContext, useState } from "react";
import { PopupForm } from "../shared/forms/forms";

const initialCalendar: CreateCalendar = {
  name: "",
  timezone: 0,
  default: false,
};

export const CreateCalendarForm = ({
  refs,
  setOpen,
}: {
  refs: O.Option<RefObject<any>[]>;
  setOpen: (open: boolean) => void;
}) => {
  const [form, setForm] = useState(initialCalendar);
  const { storages } = useContext(StorageContext);

  return storages.mapOrElse(
    () => null,
    ({ calendarsStorage }) => (
      <PopupForm
        onSubmit={() => calendarsStorage.add(form)}
        refs={refs}
        setOpen={setOpen}
      >
        <div className="w-full absolute top-0 h-[16px] left-0 bg-neutral-300 flex">
          <button
            className="ml-auto mr-3 text-neutral-500 text-xs"
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
            defaultValue={-new Date().getTimezoneOffset() / 60}
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
        <input
          type="submit"
          className="absolute bottom-0 w-full left-0 text-white bg-primary-500 rounded-md"
          value={"Save"}
        />
      </PopupForm>
    ),
  );
};
