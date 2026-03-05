import { nodeRegistry } from "../registry/index.ts";
import { genericNodes } from "./generic.ts";
import { accountingNodes } from "./accounting.ts";

export function registerAllNodes(): void {
  for (const def of [...genericNodes, ...accountingNodes]) {
    nodeRegistry.register(def);
  }
}
