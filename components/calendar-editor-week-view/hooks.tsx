import { useContext, useMemo } from "react";
import { SelectedEvents, SelectedRefs } from "./contexts";

export const useResetSelection = () => {
  const selectedEventsCtx = useContext(SelectedEvents);
  const selectedEventsRef = useContext(SelectedRefs);

  const removeSelected = useMemo(
    () => () => {
      selectedEventsCtx
        .map(([, setSelectedEvents]) =>
          selectedEventsRef.map(([, setSelectedRefs]) => ({
            setSelectedRefs,
            setSelectedEvents,
          })),
        )
        .flatten()
        .map(({ setSelectedRefs, setSelectedEvents }) => {
          setSelectedEvents(() => {
            return new Map();
          });
          setSelectedRefs(() => {
            return new Map();
          });
        });
    },
    [selectedEventsRef, selectedEventsCtx],
  );

  return removeSelected;
};
