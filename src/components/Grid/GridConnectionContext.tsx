import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useWorkflowStore } from "../../store/workflowStore.ts";

interface ConnectingFrom {
  nodeId: string;
  portName: string;
  portType: "input" | "output";
}

interface GridConnectionContextValue {
  connectingFrom: ConnectingFrom | null;
  mousePos: { x: number; y: number };
  startConnection: (
    nodeId: string,
    portName: string,
    portType: "input" | "output"
  ) => void;
  completeConnection: (
    nodeId: string,
    portName: string,
    portType: "input" | "output"
  ) => void;
  cancelConnection: () => void;
  setMousePos: (pos: { x: number; y: number }) => void;
}

const GridConnectionContext =
  createContext<GridConnectionContextValue | null>(null);

export function useGridConnection() {
  const ctx = useContext(GridConnectionContext);
  if (!ctx)
    throw new Error(
      "useGridConnection must be used within GridConnectionProvider"
    );
  return ctx;
}

export function GridConnectionProvider({ children }: { children: ReactNode }) {
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const [connectingFrom, setConnectingFrom] = useState<ConnectingFrom | null>(
    null
  );
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const startConnection = useCallback(
    (nodeId: string, portName: string, portType: "input" | "output") => {
      setConnectingFrom({ nodeId, portName, portType });
    },
    []
  );

  const completeConnection = useCallback(
    (nodeId: string, portName: string, portType: "input" | "output") => {
      const from = connectingFrom;
      if (!from) return;

      // Can only connect output → input or input → output
      if (from.portType === portType) return;
      if (from.nodeId === nodeId) return;

      const source = from.portType === "output" ? from.nodeId : nodeId;
      const sourceHandle =
        from.portType === "output" ? from.portName : portName;
      const target = from.portType === "output" ? nodeId : from.nodeId;
      const targetHandle =
        from.portType === "output" ? portName : from.portName;

      onConnect({
        source,
        sourceHandle,
        target,
        targetHandle,
      });

      setConnectingFrom(null);
    },
    [connectingFrom, onConnect]
  );

  const cancelConnection = useCallback(() => {
    setConnectingFrom(null);
  }, []);

  return (
    <GridConnectionContext.Provider
      value={{
        connectingFrom,
        mousePos,
        startConnection,
        completeConnection,
        cancelConnection,
        setMousePos,
      }}
    >
      {children}
    </GridConnectionContext.Provider>
  );
}
