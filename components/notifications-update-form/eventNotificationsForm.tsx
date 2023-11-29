import { EventNotification } from "@/services/events/events";
import React from "react";
import { InputButtons, InputText } from "../shared/forms/forms";

const initialNotification: EventNotification = {
  from: "start",
  time: 5,
  timescale: "minutes",
  id: "",
};

const UpdateNotificationForm = ({
  notification,
  onChangeTime,
  onChangeTimescale,
  onChangeFrom,
  onDelete,
}: {
  notification: EventNotification;
  onChangeTime: (time: EventNotification["time"]) => void;
  onChangeTimescale: (timescale: EventNotification["timescale"]) => void;
  onChangeFrom: (from: EventNotification["from"]) => void;
  onDelete: () => void;
}) => {
  return (
    <div className="px-2 w-full flex flex-nowrap gap-1 justify-start text-black text-sm">
      <label className="flex flex-nowrap whitespace-nowrap items-center">
        Notify
        <InputText
          value={notification.time}
          type="number"
          min="1"
          max="60"
          className="text-right bg-neutral-200"
          onChange={(e) => {
            const time = Number(e.currentTarget.value);
            onChangeTime(time);
          }}
        />
      </label>
      <select
        value={notification.timescale}
        onChange={(e) => {
          const timescale = e.currentTarget.value as any;
          onChangeTimescale(timescale);
        }}
        className="text-center bg-neutral-200"
      >
        <option value={"minutes"}>minutes</option>
        <option value={"hours"}>hours</option>
      </select>
      <label className="flex flex-nowrap whitespace-nowrap items-center">
        from the
        <select
          value={notification.from}
          onChange={(e) => {
            const from = e.currentTarget.value as any;
            onChangeFrom(from);
          }}
          className="text-center bg-neutral-200"
        >
          <option value={"start"}>start</option>
          <option value={"end"}>end</option>
        </select>
      </label>
      <button
        className="ml-auto font-mono text-red-500"
        type="submit"
        value={"-"}
        onClick={() => {
          onDelete();
        }}
      >
        -
      </button>
    </div>
  );
};

export { UpdateNotificationForm, initialNotification };
