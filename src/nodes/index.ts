import { nodeRegistry } from "../registry/index.ts";
import { genericNodes } from "./generic.ts";
import { accountingNodes } from "./accounting.ts";
import { procurementNodes } from "./procurement.ts";
import { salesNodes } from "./sales.ts";
import { inventoryNodes } from "./inventory.ts";
import { hrNodes } from "./hr.ts";
import { financeNodes } from "./finance.ts";

export function registerAllNodes(): void {
  for (const def of [
    ...genericNodes,
    ...accountingNodes,
    ...procurementNodes,
    ...salesNodes,
    ...inventoryNodes,
    ...hrNodes,
    ...financeNodes,
  ]) {
    nodeRegistry.register(def);
  }
}
