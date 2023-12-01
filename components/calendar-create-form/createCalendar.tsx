import { StorageContext } from "@/hooks/dataHook";
import { CreateCalendar } from "@/services/calendar/calendar";
import * as O from "@/utils/option";
import { RefObject, useContext } from "react";
import { CalendarForm } from "../calendar-update-form/updateCalendar";

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
  const { storages } = useContext(StorageContext);

  return storages.mapOrElse(
    () => null,
    ({ calendarsStorage }) => (
      <CalendarForm
        onSubmit={(form) => calendarsStorage.add(form)}
        refs={refs}
        setOpen={setOpen}
        initialCalendar={initialCalendar}
      />
    ),
  );
};
