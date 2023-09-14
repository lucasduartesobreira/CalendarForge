import { PropsWithChildren, RefObject, useEffect, useRef } from "react";
import { Option } from "@/utils/option";

const OutsideClick = <Fn extends () => void>({
  doSomething,
  refs,
  children,
  ...props
}: {
  doSomething: Fn;
  refs: Option<RefObject<any>[]>;
  children: PropsWithChildren;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      const validateOtherRefs =
        !refs.isSome() ||
        refs
          .unwrap()
          .every(
            (otherRef) =>
              otherRef.current && !otherRef.current.contains(event.target),
          );
      if (
        ref.current != null &&
        !ref.current.contains(event.target) &&
        validateOtherRefs
      ) {
        doSomething();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  });

  return (
    <div {...props} ref={ref}>
      {children}
    </div>
  );
};

export default OutsideClick;
