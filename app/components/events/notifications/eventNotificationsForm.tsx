import { EventNotification } from "@/services/events/events";
import React, { useState } from "react";

const initialNotification: EventNotification = {
  from: "start",
  time: 5,
  timescale: "minutes",
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
    <div>
      <label>
        Notify
        <input
          value={notification.time}
          type="number"
          min="1"
          max="60"
          className="text-right bg-gray-100"
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
      >
        <option value={"minutes"}>minutes</option>
        <option value={"hours"}>hours</option>
      </select>
      <label>
        from the
        <select
          value={notification.from}
          onChange={(e) => {
            const from = e.currentTarget.value as any;
            onChangeFrom(from);
          }}
        >
          <option value={"start"}>start</option>
          <option value={"end"}>end</option>
        </select>
      </label>
      <button
        className="absolute right-[2%] text-red-600"
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

const NewEventNotificationForm = ({
  onSubmit,
  resetNotification,
}: {
  onSubmit: (notification: EventNotification) => void;
  resetNotification: EventNotification;
}) => {
  const [newNotification, setNewNotification] = useState({
    ...resetNotification,
  });
  return (
    <div className="relative flex-none flex gap-[4px] justify-start text-black">
      <label>
        Notify
        <input
          value={newNotification.time}
          type="number"
          min="1"
          max="60"
          className="text-right bg-gray-100"
          onChange={(e) => {
            newNotification.time = Number(e.currentTarget.value);
            setNewNotification({ ...newNotification });
          }}
        />
      </label>
      <select
        value={newNotification.timescale}
        onChange={(e) => {
          newNotification.timescale = e.currentTarget.value as any;
          setNewNotification({ ...newNotification });
        }}
      >
        <option value={"minutes"}>minutes</option>
        <option value={"hours"}>hours</option>
      </select>
      <label>
        from the
        <select
          value={newNotification.from}
          onChange={(e) => {
            newNotification.from = e.currentTarget.value as any;
            setNewNotification({ ...newNotification });
          }}
        >
          <option value={"start"}>start</option>
          <option value={"end"}>end</option>
        </select>
      </label>
      <button
        className="absolute right-[2%] text-blue-600"
        type="submit"
        value={"+"}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onSubmit(newNotification);
          setNewNotification({ ...resetNotification });
        }}
      >
        +
      </button>
    </div>
  );
};

export {
  UpdateNotificationForm,
  NewEventNotificationForm,
  initialNotification,
};
