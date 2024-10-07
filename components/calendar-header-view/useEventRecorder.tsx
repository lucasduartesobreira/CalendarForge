import {
  Dispatch,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

type SavingState = {
  state: "saving";
  recording: false;
  startDate: number;
  endDate: number;
  spentTimeInMilliseconds: number;
};
type StoppedState = {
  state: "stopped";
  recording: false;
  startDate: null;
  endDate: null;
  spentTimeInMilliseconds: number;
};

type RecordingState = {
  state: "recording";
  recording: true;
  startDate: number;
  endDate: null;
  spentTimeInMilliseconds: number;
};

type State = StoppedState | RecordingState | SavingState;

type Actions = { type: "start" | "stop" | "finish" | "update" };

const EventRecorderCtx = createContext<[State, Dispatch<Actions>]>([
  {
    state: "stopped",
    recording: false,
    spentTimeInMilliseconds: 0,
    endDate: null,
    startDate: null,
  },
  () => {},
]);

const useEventRecorderSetup = () => {
  const [recordingState, dispatch] = useReducer(
    (recordingState: State, action: Actions): State => {
      const { type } = action;
      const { state } = recordingState;

      if (type === "update" && state === "recording") {
        const { startDate, spentTimeInMilliseconds } = recordingState;
        return {
          state: "recording",
          recording: true,
          startDate,
          endDate: null,
          spentTimeInMilliseconds: spentTimeInMilliseconds + 1000,
        };
      }

      if (type === "start" && state === "stopped") {
        return {
          state: "recording",
          recording: true,
          startDate: Date.now(),
          spentTimeInMilliseconds: 0,
          endDate: null,
        };
      }

      if (type === "stop" && state === "recording") {
        const { startDate, spentTimeInMilliseconds } = recordingState;
        return {
          state: "saving",
          recording: false,
          startDate,
          endDate: startDate + spentTimeInMilliseconds,
          spentTimeInMilliseconds: 0,
        };
      }

      return {
        state: "stopped",
        recording: false,
        startDate: null,
        endDate: null,
        spentTimeInMilliseconds: 0,
      };
    },
    {
      recording: false,
      state: "stopped",
      startDate: null,
      endDate: null,
      spentTimeInMilliseconds: 0,
    },
  );

  const { recording, state } = useMemo(() => recordingState, [recordingState]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (recording) {
        dispatch({ type: "update" });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  return [recordingState, dispatch] as const;
};

export const useEventRecorder = (eventHandlers?: {
  onSaving?: (state: SavingState, dispatch: Dispatch<Actions>) => void;
  onStopped?: (state: StoppedState, dispatch: Dispatch<Actions>) => void;
  onRecording?: (state: RecordingState, dispatch: Dispatch<Actions>) => void;
}) => {
  const recordingStateContext = useContext(EventRecorderCtx);

  const [recordingState, dispatch] = useMemo(
    () => recordingStateContext,
    [recordingStateContext],
  );

  useEffect(() => {
    if (eventHandlers == null) return;

    const { onSaving, onStopped, onRecording } = eventHandlers;

    const { state } = recordingState;
    if (onSaving && state === "saving") {
      onSaving(recordingState, dispatch);
    }

    if (onStopped && state === "stopped") {
      onStopped(recordingState, dispatch);
    }

    if (onRecording && state === "recording") {
      onRecording(recordingState, dispatch);
    }
  }, [recordingState]);

  return recordingStateContext;
};

export const EventRecorderProvider = ({ children }: PropsWithChildren<{}>) => {
  const [recordingState, dispatch] = useEventRecorderSetup();
  return (
    <EventRecorderCtx.Provider value={[recordingState, dispatch]}>
      {children}
    </EventRecorderCtx.Provider>
  );
};
