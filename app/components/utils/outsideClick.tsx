import { RefObject, useEffect, useRef } from "react";
import { Option } from "@/utils/option";

const OutsideClick = <Fn extends () => void>({
  doSomething,
  refs,
  children,
}: {
  doSomething: Fn;
  refs: Option<RefObject<any>[]>;
  children: any;
}) => {
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
        ref.current &&
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

  return <div ref={ref}>{children}</div>;
};

export default OutsideClick;
