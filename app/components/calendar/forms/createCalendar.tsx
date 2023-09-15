import OutsideClick from "@/components/utils/outsideClick";
import { CreateCalendar, Timezones } from "@/services/calendar/calendar";
import { FormEvent, RefObject, useState } from "react";
import { Option } from "@/utils/option";

const initialCalendar: CreateCalendar = { name: "", timezone: 0 };

export const CreateCalendarForm = ({
  refs,
  outsideClickHandler,
  onSubmit,
}: {
  refs: Option<RefObject<any>[]>;
  outsideClickHandler: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, form: CreateCalendar) => void;
}) => {
  const [form, setForm] = useState<CreateCalendar>({
    ...initialCalendar,
    timezone: (-new Date().getTimezoneOffset() / 60) as Timezones,
  });
  return (
    <OutsideClick doSomething={outsideClickHandler} refs={refs}>
      <form
        onSubmit={(e) => {
          onSubmit(e, form);
        }}
        className="flex-auto text-gray-500 flex flex-col gap-[4px] p-4 bg-white rounded-md"
      >
        <input
          title="name"
          type="text"
          placeholder="Name"
          className="text-black m-2 bg-gray-200"
          onChange={(e) => {
            form.name = e.target.value;
            setForm({ ...form });
          }}
        />
        <label>
          Timezone
          <select
            className="text-black m-2 bg-gray-200"
            onChange={(e) => {
              const timezone = Number(e.target.value);
              if (timezone >= -12 && timezone <= 12)
                form.timezone = timezone as Timezones;

              setForm({ ...form });
            }}
            value={form.timezone}
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
          className="flex-auto relative r-4 text-white bg-blue-600 rounded-md"
          value={"Save"}
        />
      </form>
    </OutsideClick>
  );
};
