import { useEffect, useRef } from "react";

const OutsideClick = <Fn extends () => void>({
  doSomething,
  children,
}: {
  doSomething: Fn;
  children: any;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
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
