import { None, Option, Some } from "@/utils/option";
import {
  Dispatch,
  PropsWithChildren,
  RefObject,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import UpdateEventForm from "../event-update-form/updateEvent";
import { CreateEventForm } from "../event-create-form/createEvent";
import { CreateCalendarForm } from "../calendar-create-form/createCalendar";
import UpdateCalendarForm from "../calendar-update-form/updateCalendar";
import { UseStateReturn } from "@/utils/types";
import { CalendarEvent, CreateEvent } from "@/services/events/events";
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
      onChangeForm,
    }: {
      initialForm: CreateEvent;
      setOpen: Dispatch<SetStateAction<boolean>>;
      onChangeForm?: (form: CreateEvent) => void;
    }) => (
      <CreateEventForm
        setOpen={setOpen}
        initialForm={initialForm}
        blockdRefs={None()}
        onChangeForm={onChangeForm}
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
      onChangeForm?: (form: object) => void;
    }) => JSX.Element;
  }
>;

type FormInput<T extends keyof typeof forms> = {
  updateEvent: CalendarEvent;
  createEvent: CreateEvent;
  createCalendar: CreateCalendar;
  updateCalendar: Calendar;
}[T];
type FormCtx = Option<{
  formType: keyof typeof forms;
  formInput: object;
  refsBlocked: Option<RefObject<any>>;
  onChangeForm?: (form: any) => void;
  onClose?: () => void;
}>;

const initialFormState: CreateEvent = {
  title: "",
  endDate: Date.now() + 60 * 60 * 1000,
  startDate: Date.now(),
  description: "",
  calendar_id: "",
  notifications: [],
  color: "#7a5195",
};

const initialCalendar: CreateCalendar = {
  name: "",
  timezone: 0,
  default: false,
};

const defaultForm = {
  createEvent: initialFormState,
  createCalendar: initialCalendar,
  updateCalendar: null,
  updateEvent: null,
} as const satisfies {
  [Key in keyof typeof forms]: Key extends `update${string}`
    ? null
    : FormInput<Key>;
};

const formCtx = createContext<UseStateReturn<FormCtx>>([None(), () => {}]);

export const useFormHandler = () => {
  const [form, setForm] = useContext(formCtx);

  const isFormSet = useMemo(() => form.isSome(), [form]);

  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    refsBlocked: Option<RefObject<any>>,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input: FormInput<FormType>,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input: Partial<FormInput<FormType>>,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input: Partial<FormInput<FormType>>,
    refsBlocked: Option<RefObject<any>>,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input: Partial<FormInput<FormType>>,
    refsBlocked: Option<RefObject<any>>,
    onChangeForm: (form: FormInput<FormType>) => void,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input: Partial<FormInput<FormType>>,
    refsBlocked: Option<RefObject<any>>,
    onChangeForm: (form: FormInput<FormType>) => void,
    onClose: () => void,
  ): void;
  function setActiveForm<FormType extends keyof typeof forms>(
    formType: FormType,
    input?: Partial<FormInput<FormType>>,
    refsBlocked: Option<RefObject<any>> = None(),
    onChangeForm?: (form: FormInput<FormType>) => void,
    onClose?: () => void,
  ) {
    const dForm = defaultForm[formType];
    if (dForm == null && input == null) {
      return;
    }
    const fixedDForm = dForm ?? {};
    const fixedInput = input ?? {};
    setForm(() =>
      Some({
        formType,
        formInput: { ...fixedDForm, ...fixedInput },
        refsBlocked,
        onChangeForm,
        onClose,
      }),
    );
  }

  const forceReset = (filter?: (form: FormCtx) => boolean) => {
    if (filter == null || filter(form)) setForm(None());
  };

  return { setActiveForm, isFormSet, forceReset };
};
export const FormHandler = ({ children }: PropsWithChildren) => {
  const [activeForm, setForm] = useState<FormCtx>(None());

  return (
    <formCtx.Provider value={[activeForm, setForm]}>
      {children}
      {activeForm
        .map(({ formType, formInput, refsBlocked, onChangeForm, onClose }) => {
          const Form = forms[formType].form;

          return (
            <Form
              key={"main-form"}
              initialForm={formInput as any}
              setOpen={() => {
                onClose?.();
                setForm(None());
              }}
              refsBlocked={refsBlocked}
              onChangeForm={onChangeForm}
            />
          );
        })
        .unwrapOrElse(() => (
          <></>
        ))}
    </formCtx.Provider>
  );
};
