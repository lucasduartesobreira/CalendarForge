import { None, Option, Some } from "@/utils/option";
import {
  Dispatch,
  PropsWithChildren,
  RefObject,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";
import UpdateEventForm from "../event-update-form/updateEvent";
import { CreateEventForm } from "../event-create-form/createEvent";
import { CreateCalendarForm } from "../calendar-create-form/createCalendar";
import UpdateCalendarForm from "../calendar-update-form/updateCalendar";
import { UseStateReturn } from "@/utils/types";
import { CalendarEvent } from "@/services/events/events";
import { Calendar, CreateCalendar } from "@/services/calendar/calendar";

const forms = {
  updateEvent: {
    form: ({
      initialForm,
      setOpen,
    }: {
      initialForm: CalendarEvent;
      setOpen: Dispatch<SetStateAction<boolean>>;
    }) => <UpdateEventForm setOpen={setOpen} initialForm={initialForm} />,
  },
  createEvent: {
    form: ({
      initialForm,
      setOpen,
    }: {
      initialForm: CalendarEvent;
      setOpen: Dispatch<SetStateAction<boolean>>;
    }) => (
      <CreateEventForm
        setOpen={setOpen}
        initialForm={initialForm}
        blockdRefs={None()}
      />
    ),
  },
  updateCalendar: {
    form: ({
      initialForm,
      setOpen,
    }: {
      initialForm: Calendar;
      setOpen: Dispatch<SetStateAction<boolean>>;
    }) => (
      <UpdateCalendarForm
        setOpen={setOpen}
        initialCalendar={initialForm}
        refs={None()}
      />
    ),
  },
  createCalendar: {
    form: ({
      setOpen,
    }: {
      initialForm: CreateCalendar;
      setOpen: Dispatch<SetStateAction<boolean>>;
      refsBlocked: Option<RefObject<any>>;
    }) => <CreateCalendarForm setOpen={setOpen} refs={None()} />,
  },
} as const satisfies Record<
  string,
  {
    form: (props: {
      initialForm: any;
      setOpen: Dispatch<SetStateAction<boolean>>;
      refsBlocked: Option<RefObject<any>>;
    }) => JSX.Element;
  }
>;

type FormInput<T extends keyof typeof forms> = {
  updateEvent: CalendarEvent;
  createEvent: CalendarEvent;
  createCalendar: CreateCalendar;
  updateCalendar: Calendar;
}[T];
type FormCtx = Option<{
  formType: keyof typeof forms;
  formInput: object;
  refsBlocked: Option<RefObject<any>>;
}>;

const defaultForm = {
  createEvent: {} as CalendarEvent,
  createCalendar: {} as CreateCalendar,
  updateCalendar: null,
  updateEvent: null,
} as const satisfies {
  [Key in keyof typeof forms]: Key extends `update${string}`
    ? null
    : FormInput<Key>;
};

const formCtx = createContext<UseStateReturn<FormCtx>>([None(), () => {}]);

export const useFormHandler = () => {
  const [, setForm] = useContext(formCtx);

  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    refsBlocked: Option<RefObject<any>>,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input: FormInput<FormType>,
    refsBlocked: Option<RefObject<any>>,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input?: FormInput<FormType>,
    refsBlocked: Option<RefObject<any>> = None(),
  ) {
    const initialForm = input ?? defaultForm[formType];
    if (initialForm != null) {
      setForm((form) =>
        form.isSome()
          ? form
          : Some({
              formType,
              formInput: initialForm,
              refsBlocked,
            }),
      );
    }
  }

  return setActiveForm;
};
export const FormHandler = ({ children }: PropsWithChildren) => {
  const [activeForm, setForm] = useState<FormCtx>(None());

  return (
    <formCtx.Provider value={[activeForm, setForm]}>
      {children}
      {activeForm
        .map(({ formType, formInput, refsBlocked }) => {
          const Form = forms[formType].form;

          return (
            <Form
              key={"main-form"}
              initialForm={formInput as any}
              setOpen={() => setForm(None())}
              refsBlocked={refsBlocked}
            />
          );
        })
        .unwrapOrElse(() => (
          <></>
        ))}
    </formCtx.Provider>
  );
};
