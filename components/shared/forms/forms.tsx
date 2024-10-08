import OutsideClick from "@/components/utils/outsideClick";
import {
  HTMLButtonExtended,
  HTMLDivExtended,
  HTMLFormExtended,
  RequiredPropsWithChildren,
} from "@/utils/types";
import { PropsWithChildren, RefObject, useEffect, useMemo } from "react";
import { Option } from "@/utils/option";
import { useShortcut } from "@/hooks/useShortcut";
import { ShortcutBuilder } from "@/utils/shortcuts";

export const PopupForm = ({
  setOpen,
  refs,
  children,
  onSubmit,
  backgroundDiv,
  closeOnSubmit = true,
  innerRef,
  ...props
}: RequiredPropsWithChildren<
  HTMLFormExtended<{
    setOpen: (value: boolean) => void;
    refs: Option<RefObject<any>[]>;
    onSubmit: () => void;
    backgroundDiv?: HTMLDivExtended<HTMLDivElement>;
    closeOnSubmit?: boolean;
    innerRef?: RefObject<any>;
  }>
>) => {
  const handleOnSubmit = useMemo(
    () => () => {
      onSubmit();
      if (closeOnSubmit) setOpen(false);
    },
    [onSubmit, closeOnSubmit, setOpen],
  );

  return (
    <OutsideClick
      {...backgroundDiv}
      doSomething={() => {
        setOpen(false);
      }}
      refs={refs}
      className={`${backgroundDiv?.className} z-[10000] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}
    >
      <div className="flex">
        <form
          {...props}
          onSubmit={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            handleOnSubmit();
          }}
          ref={innerRef}
          className={`text-neutral-500 bg-white rounded-xl shadow-lg overflow-hidden relative flex flex-col gap-2 p-4 justify-center ${props.className} `}
        >
          {children}
        </form>
      </div>
    </OutsideClick>
  );
};

export const InputText = ({
  ...props
}: React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>) => {
  return (
    <input
      {...props}
      className={`${props.className} text-black px-2 py-1 bg-neutral-200 rounded-md`}
    />
  );
};

const InputButton = ({
  ...props
}: React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>) => {
  return (
    <input
      {...props}
      className={`${props.className} text-white bg-primary-500 rounded-md`}
    />
  );
};

export const FormHeader = ({
  onDelete,
  setOpen,
  children,
}: PropsWithChildren<{
  onDelete?: () => void;
  setOpen: (value: boolean) => void;
}>) => {
  return (
    <div className="w-full absolute top-0 h-[16px] text-xs left-0 bg-neutral-300 flex items-center">
      {children}
      {onDelete != null && (
        <button
          className="ml-auto mr-2 text-red-500"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </button>
      )}
      <button
        className={`${
          onDelete == null ? "ml-auto" : ""
        } mr-3 text-neutral-500 text-xs`}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }}
      >
        X
      </button>
    </div>
  );
};

const DeleteButton = ({
  setOpen,
  className,
  onDelete,
  text,
  closeOnDelete = true,
  ...props
}: HTMLButtonExtended<{
  setOpen: (value: boolean) => void;
  onDelete: () => void;
  text: string;
  closeOnDelete?: boolean;
}>) => {
  return (
    <button
      {...props}
      className={`${className} bg-red-500 font-semibold text-sm text-text-inverse rounded-xl px-2 py-1`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
        if (closeOnDelete) setOpen(false);
      }}
    >
      {text}
    </button>
  );
};

const WarningButton = ({
  setOpen,
  className,
  onWarning: onWarning,
  text,
  ...props
}: HTMLButtonExtended<{
  setOpen: (value: boolean) => void;
  onWarning: () => void;
  text: string;
}>) => {
  return (
    <button
      {...props}
      className={`bg-amber-500 font-semibold rounded-xl text-text-inverse px-2 py-1 text-sm ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onWarning();
        setOpen(false);
      }}
    >
      {text}
    </button>
  );
};

const TertiaryButton = ({
  setOpen,
  className,
  onWarning: onWarning,
  text,
  ...props
}: HTMLButtonExtended<{
  setOpen: (value: boolean) => void;
  onWarning: () => void;
  text: string;
}>) => {
  return (
    <button
      {...props}
      className={`bg-white border-2 border-primary-500 text-primary-500 rounded-xl px-2 py-1 text-sm ${className} `}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onWarning();
        setOpen(false);
      }}
    >
      {text}
    </button>
  );
};

export const InputButtons = {
  Primary: InputButton,
  Delete: DeleteButton,
  Warning: WarningButton,
  Tertiary: TertiaryButton,
};
