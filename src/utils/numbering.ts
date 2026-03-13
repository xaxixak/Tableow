import type { NodeDefinition, CategoryDefinition } from "../types/index.ts";
import type { WorkflowEdge } from "../types/workflow.ts";

/**
 * Get the next available category number, with hierarchical support.
 *
 * - Top-level (no parentNumber): returns C1, C2, C3, ...
 * - Subcategory (parentNumber="C4"): returns C4.1, C4.2, ...
 * - Deeper nesting (parentNumber="C4.1"): returns C4.1.1, C4.1.2, ...
 */
export function getNextCategoryNumber(
  existingCategories: CategoryDefinition[],
  parentNumber?: string
): string {
  if (!parentNumber) {
    // Top-level category: find max C{n} among top-level categories
    if (existingCategories.length === 0) return "C1";

    const numbers = existingCategories
      .map((cat) => {
        const match = cat.number.match(/^C(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const maxNumber = Math.max(...numbers, 0);
    return `C${maxNumber + 1}`;
  }

  // Subcategory: find max direct child index under parentNumber
  // e.g., parentNumber="C4" → look for C4.1, C4.2, ... → return C4.{max+1}
  const escapedParent = parentNumber.replace(/\./g, "\\.");
  const childPattern = new RegExp(`^${escapedParent}\\.(\\d+)$`);

  const childNumbers = existingCategories
    .map((cat) => {
      const match = cat.number.match(childPattern);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const maxChild = Math.max(...childNumbers, 0);
  return `${parentNumber}.${maxChild + 1}`;
}

/**
 * Get the next available node number for a given category (C1-001, C4.1-002, ...).
 * @param categoryNumber - Category number (e.g., "C1" or "C4.1")
 * @param existingNodes - Array of all custom node definitions
 * @returns Next node number (e.g., "C4.1-015" if highest in C4.1 is C4.1-014)
 */
export function getNextNodeNumber(
  categoryNumber: string,
  existingNodes: NodeDefinition[]
): string {
  // Filter nodes that belong to this category
  const categoryNodes = existingNodes.filter(
    (node) => node.categoryNumber === categoryNumber
  );

  if (categoryNodes.length === 0) {
    return `${categoryNumber}-001`;
  }

  // Extract numeric parts from node numbers in this category
  // Handles both C1-001 and C4.1-001 formats
  const numbers = categoryNodes
    .map((node) => {
      if (!node.number) return 0;
      const match = node.number.match(/^C[\d.]+-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const maxNumber = Math.max(...numbers, 0);
  const nextNumber = maxNumber + 1;

  // Pad with zeros (e.g., 001, 002, ..., 010, 011, ...)
  return `${categoryNumber}-${nextNumber.toString().padStart(3, "0")}`;
}

/**
 * Get the next available edge number (E1, E2, E3, ...).
 * @param existingEdges - Array of all workflow edges
 * @returns Next edge number (e.g., "E12" if highest is E11)
 */
export function getNextEdgeNumber(existingEdges: WorkflowEdge[]): string {
  if (existingEdges.length === 0) {
    return "E1";
  }

  // Extract numeric parts from all edge numbers
  const numbers = existingEdges
    .map((edge) => {
      if (!edge.data?.number) return 0;
      const match = edge.data.number.match(/^E(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const maxNumber = Math.max(...numbers, 0);
  return `E${maxNumber + 1}`;
}
