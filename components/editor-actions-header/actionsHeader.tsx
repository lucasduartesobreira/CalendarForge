import { JSXElementConstructor, useContext, useState } from "react";
import {
  ActionSelected,
  ActionSelectedTypes,
} from "../calendar-editor-week-view/contexts";
import {
  CalendarEvent,
  DaysOfWeek,
  RecurringSettings,
  StopConfig,
} from "@/services/events/events";
import { InputText } from "../shared/forms/forms";

export const ActionHeader = () => {
  const actionHeader = useContext(ActionSelected);
  return actionHeader[0].mapOrElse(
    () => null,
    ({ type: header, selected }) => {
      const ActionComponent = actionsComponent[header];
      return (
        <div className="text-text-primary rounded-xl shadow-xl h-[48px] absolute top-[80px] left-1/2 -translate-y-1/2 -translate-x-1/2 z-[40000] bg-white flex items-center text-center justify-center">
          <ActionComponent className="px-2 py-1" selected={selected} />
        </div>
      );
    },
  );
};

type ActionsComponent = {
  [Key in (typeof ActionSelectedTypes)[number]]: JSXElementConstructor<{
    className: string;
    selected: CalendarEvent;
  }>;
};

const dayOfWeekFirstLetter = {
  0: "S",
  1: "M",
  2: "T",
  3: "W",
  4: "T",
  5: "F",
  6: "S",
};

const RecurringActionHeader: ActionsComponent["recurring"] = ({ selected }) => {
  const [form, setForm] = useState<CalendarEvent>(selected);

  return (
    <label className="text-sm px-2 py-1 w-full bg-neutral-200 rounded-md justify-start flex flex-col gap-1">
      <div className="flex gap-1">
        <a className="pl-2 py-1">Repeating</a>
        <select
          value={form.recurring_settings?.frequencyType}
          className="bg-neutral-200 text-center"
          onChange={(event) => {
            const value = event.target.value;
            const newSettings: RecurringSettings | undefined =
              value === "never"
                ? undefined
                : value === "daily"
                ? {
                    frequencyType: value,
                    frequency: 1,
                    stop: form.recurring_settings?.stop ?? {
                      type: "frequency",
                      afterFrequency: 1,
                    },
                  }
                : value === "weekly"
                ? {
                    frequencyType: value,
                    days: [new Date(form.startDate).getDay()] as DaysOfWeek[],
                    stop: form.recurring_settings?.stop ?? {
                      type: "frequency",
                      afterFrequency: 1,
                    },
                  }
                : undefined;

            setForm({
              ...form,
              recurring_settings: newSettings,
            });
          }}
        >
          <option value={"never"}>never</option>
          <option value={"weekly"}>weekly</option>
          <option value={"daily"}>daily</option>
        </select>
        {
          <>
            {form.recurring_settings != undefined &&
              form.recurring_settings.frequencyType === "daily" &&
              form.recurring_settings.frequency != null && (
                <>
                  <a className="py-1">every</a>
                  <InputText
                    type="number"
                    className="text-sm text-black w-[56px] text-right"
                    value={form.recurring_settings.frequency}
                    min={1}
                    max={365}
                    onChange={(e) => {
                      const value = e.currentTarget.valueAsNumber;
                      const { recurring_settings } = form;
                      if (recurring_settings?.frequencyType === "daily")
                        recurring_settings.frequency =
                          value == Number.NaN ? 1 : value;

                      setForm({
                        ...form,
                        recurring_settings,
                      });
                    }}
                  />
                  <a className="py-1">days</a>
                </>
              )}
            {form.recurring_settings != undefined &&
              form.recurring_settings.frequencyType === "weekly" &&
              form.recurring_settings.days != null && (
                <>
                  <a className="py-1 pr-1">every</a>
                  {([0, 1, 2, 3, 4, 5, 6] as const).map((value) => {
                    return (
                      <InputText
                        key={value}
                        type="button"
                        className={`px-1 py-0 rounded-full font-mono  ${
                          form.recurring_settings?.frequencyType === "weekly"
                            ? form.recurring_settings.days.find(
                                (day) => day === value,
                              ) != null
                              ? "bg-primary-400 text-text-inverse font-bold"
                              : "bg-neutral-400 text-text-inverse font-semibold"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          const { recurring_settings } = form;
                          if (recurring_settings?.frequencyType === "weekly") {
                            const daysSet = new Set(recurring_settings.days);
                            if (daysSet.has(value)) daysSet.delete(value);
                            else daysSet.add(value);

                            setForm({
                              ...form,
                              recurring_settings: {
                                ...recurring_settings,
                                days: Array.from(daysSet),
                              },
                            });
                          }
                        }}
                        value={dayOfWeekFirstLetter[value]}
                      />
                    );
                  })}
                </>
              )}
          </>
        }
      </div>
      {form.recurring_settings != null && (
        <div className="flex gap-1 pb-1">
          <a className="pl-2">Stopping after</a>
          <select
            className="bg-neutral-200"
            value={form.recurring_settings.stop.type}
            onChange={(e) => {
              const value = e.target.value;
              const newStopSetting: StopConfig =
                value === "frequency"
                  ? { type: value, afterFrequency: 1 }
                  : {
                      type: "date",
                      afterDay: new Date(form.startDate + 24 * 3600 * 1000),
                    };

              setForm({
                ...form,
                recurring_settings: {
                  ...form.recurring_settings,
                  stop: newStopSetting,
                } as RecurringSettings,
              });
            }}
          >
            <option value={"date"}>the day</option>
            <option value={"frequency"}>repeating</option>
          </select>
          {form.recurring_settings.stop.type === "frequency" && (
            <>
              <InputText
                type="number"
                min={1}
                max={365}
                className="py-0 text-right w-[56px]"
                value={form.recurring_settings.stop.afterFrequency}
                onChange={(e) => {
                  const value = e.target.valueAsNumber;
                  if (form.recurring_settings?.stop.type === "frequency") {
                    form.recurring_settings.stop.afterFrequency = value;
                  }

                  setForm({ ...form });
                }}
              />
              <a className="pl-2">time(s)</a>
            </>
          )}
          {form.recurring_settings.stop.type === "date" && (
            <InputText
              type="date"
              value={form.recurring_settings.stop.afterDay
                .toISOString()
                .slice(0, 10)}
              onChange={(e) => {
                const value = e.target.valueAsDate;
                if (
                  form.recurring_settings?.stop.type === "date" &&
                  value != null
                ) {
                  form.recurring_settings.stop.afterDay = new Date(
                    value.getTime() + value.getTimezoneOffset() * 1000 * 60,
                  );
                }

                setForm({ ...form });
              }}
              className="py-0"
            />
          )}
        </div>
      )}
    </label>
  );
};

const actionsComponent = {
  spacing: () => {
    return <div>Spacing</div>;
  },
  recurring: RecurringActionHeader,
} satisfies ActionsComponent;
