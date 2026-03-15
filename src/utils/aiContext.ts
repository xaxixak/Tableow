import type { Workflow } from "../types/index.ts";
import type { LaneDefinition } from "../types/grid.ts";

/**
 * AI-readable context auto-generated on save/export.
 *
 * IMPORTANT: This is factual data only — no assumptions.
 * Parent-child lanes may or may not be variants of the same flow.
 * AI must compare edge flows (not just names) to decide if lanes are the same process.
 * User behavior is unpredictable — never assume structure implies intent.
 */
export interface AIContext {
  /** Guidance for AI on how to interpret this data */
  guidance: string[];
  /** Total counts */
  stats: {
    nodes: number;
    edges: number;
    lanes: number;
    stages: number;
    customNodeTypes: number;
  };
  /** Unique document types used (by label, deduplicated) */
  documentTypes: string[];
  /** Stage progression (leaf stages, ordered) */
  stageFlow: string[];
  /** Lane hierarchy with factual analysis */
  laneAnalysis: LaneAnalysis[];
  /** Pairwise label overlap between sibling lanes (shared names ≠ same process) */
  siblingComparisons: SiblingComparison[];
  /** Edge flow summary — how documents connect */
  edgeFlowSummary: EdgeFlowEntry[];
}

export interface LaneAnalysis {
  /** Lane label */
  name: string;
  /** Parent lane label (null if top-level) */
  parent: string | null;
  /** Direct children lane labels */
  children: string[];
  /** Document types placed in this lane (and its descendants) */
  documentTypes: string[];
  /** Number of nodes in this lane (and its descendants) */
  nodeCount: number;
}

export interface SiblingComparison {
  /** Parent lane label (lanes are siblings under this parent) */
  parent: string;
  /** The two sibling lane labels being compared */
  laneA: string;
  laneB: string;
  /** Document type names that appear in both lanes (WARNING: same name does NOT mean same process — compare edge flows to verify) */
  sharedLabels: string[];
  /** Document type names only in laneA */
  onlyInA: string[];
  /** Document type names only in laneB */
  onlyInB: string[];
}

export interface EdgeFlowEntry {
  /** Step label (e.g., "STEP 1") or edge type */
  step: string;
  /** Source document label */
  from: string;
  /** Target document label */
  to: string;
  /** How many edges have this same from→to pattern */
  count: number;
}

/**
 * Analyze a workflow and generate AI-readable context.
 * Reports FACTS only — label overlap, differences, edge flows.
 * Does NOT assume parent-child = same module.
 */
export function generateAIContext(workflow: Workflow): AIContext {
  const { nodes, edges, gridConfig, customNodeTypes, metadata } = workflow;
  const lanes = gridConfig?.lanes ?? [];
  const stages = gridConfig?.stages ?? [];
  const placements = gridConfig?.placements ?? [];

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Unique document types
  const docTypeLabels = [...new Set(
    nodes.map((n) => n.data?.label).filter(Boolean)
  )] as string[];

  // Ordered leaf stages
  const leafStages = stages
    .filter((s) => !stages.some((child) => child.parentId === s.id))
    .sort((a, b) => a.order - b.order);
  const stageFlow = leafStages.map((s) => s.label);

  // Lane analysis
  const laneAnalysis = buildLaneAnalysis(lanes, placements, nodeById);

  // Sibling comparisons
  const siblingComparisons = buildSiblingComparisons(lanes, placements, nodeById);

  // Edge flow summary
  const edgeFlowSummary = buildEdgeFlowSummary(edges, nodeById);

  // Generate guidance warnings
  const guidance = buildGuidance(laneAnalysis, siblingComparisons, metadata.name);

  return {
    guidance,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      lanes: lanes.length,
      stages: stages.length,
      customNodeTypes: customNodeTypes?.length ?? 0,
    },
    documentTypes: docTypeLabels.sort(),
    stageFlow,
    laneAnalysis,
    siblingComparisons,
    edgeFlowSummary,
  };
}

function buildLaneAnalysis(
  lanes: LaneDefinition[],
  placements: { nodeId: string; laneId: string }[],
  nodeById: Map<string, { id: string; data?: { label?: string } }>
): LaneAnalysis[] {
  return lanes
    .sort((a, b) => a.order - b.order)
    .map((lane) => {
      const children = lanes
        .filter((l) => l.parentId === lane.id)
        .sort((a, b) => a.order - b.order);

      const descendantIds = getAllDescendantIds(lane.id, lanes);
      const allLaneIds = [lane.id, ...descendantIds];
      const docTypes = getDocTypesForLanes(allLaneIds, placements, nodeById);
      const nodeCount = countNodesForLanes(allLaneIds, placements);

      const parentLane = lane.parentId
        ? lanes.find((l) => l.id === lane.parentId)
        : null;

      return {
        name: lane.label,
        parent: parentLane?.label ?? null,
        children: children.map((c) => c.label),
        documentTypes: docTypes,
        nodeCount,
      };
    });
}

function buildSiblingComparisons(
  lanes: LaneDefinition[],
  placements: { nodeId: string; laneId: string }[],
  nodeById: Map<string, { id: string; data?: { label?: string } }>
): SiblingComparison[] {
  const comparisons: SiblingComparison[] = [];

  // Group lanes by parentId
  const byParent = new Map<string, LaneDefinition[]>();
  for (const lane of lanes) {
    if (!lane.parentId) continue;
    const existing = byParent.get(lane.parentId) ?? [];
    existing.push(lane);
    byParent.set(lane.parentId, existing);
  }

  for (const [parentId, siblings] of byParent.entries()) {
    if (siblings.length < 2) continue;

    const parentLane = lanes.find((l) => l.id === parentId);
    if (!parentLane) continue;

    // Get doc types for each sibling (including its descendants)
    const siblingDocTypes = new Map<string, Set<string>>();
    for (const sib of siblings) {
      const descendantIds = getAllDescendantIds(sib.id, lanes);
      const allIds = [sib.id, ...descendantIds];
      const docs = getDocTypesForLanes(allIds, placements, nodeById);
      siblingDocTypes.set(sib.label, new Set(docs));
    }

    // Pairwise comparison
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i];
        const b = siblings[j];
        const docsA = siblingDocTypes.get(a.label)!;
        const docsB = siblingDocTypes.get(b.label)!;

        const sharedLabels = [...docsA].filter((d) => docsB.has(d));
        const onlyInA = [...docsA].filter((d) => !docsB.has(d));
        const onlyInB = [...docsB].filter((d) => !docsA.has(d));

        comparisons.push({
          parent: parentLane.label,
          laneA: a.label,
          laneB: b.label,
          sharedLabels: sharedLabels.sort(),
          onlyInA: onlyInA.sort(),
          onlyInB: onlyInB.sort(),
        });
      }
    }
  }

  return comparisons;
}

function buildEdgeFlowSummary(
  edges: Workflow["edges"],
  nodeById: Map<string, { id: string; data?: { label?: string } }>
): EdgeFlowEntry[] {
  // Group edges by step+from+to pattern
  const patterns = new Map<string, EdgeFlowEntry>();

  for (const edge of edges) {
    const srcNode = nodeById.get(edge.source);
    const tgtNode = nodeById.get(edge.target);
    const fromLabel = srcNode?.data?.label ?? "?";
    const toLabel = tgtNode?.data?.label ?? "?";
    const step = (edge.data as { label?: string })?.label ?? edge.type ?? "default";

    const key = `${step}|${fromLabel}|${toLabel}`;
    const existing = patterns.get(key);
    if (existing) {
      existing.count++;
    } else {
      patterns.set(key, { step, from: fromLabel, to: toLabel, count: 1 });
    }
  }

  return [...patterns.values()].sort((a, b) => {
    // Sort by step name, then by from
    if (a.step !== b.step) return a.step.localeCompare(b.step);
    return a.from.localeCompare(b.from);
  });
}

function buildGuidance(
  laneAnalysis: LaneAnalysis[],
  siblingComparisons: SiblingComparison[],
  workflowName: string
): string[] {
  const guidance: string[] = [];

  guidance.push(
    `This is auto-generated analysis of workflow "${workflowName}". All data below is factual — no assumptions about user intent.`
  );

  guidance.push(
    "WARNING: Parent-child lane grouping does NOT necessarily mean same module or same flow. Users group lanes for various reasons — do not assume structure implies intent."
  );

  guidance.push(
    "WARNING: Two lanes sharing document type NAMES does not mean they are the same process. Same label (e.g. \"Invoice\") can represent completely different workflows. You MUST compare the edge flows (edgeFlowSummary) to determine if lanes actually follow the same sequence of steps."
  );

  guidance.push(
    "HOW TO DETERMINE if sibling lanes are the same module: (1) Check siblingComparisons for shared vs unique label names. (2) Then compare edge flows — if both lanes connect the same documents in the same step order, they are likely variants of one module. If the step sequence differs, treat them as separate modules even if they share names."
  );

  if (siblingComparisons.length === 0) {
    const hasGroups = laneAnalysis.some((l) => l.children.length > 0);
    if (!hasGroups) {
      guidance.push(
        "All lanes are independent (no parent-child grouping). Each lane is its own process flow."
      );
    }
  }

  guidance.push(
    "Use edgeFlowSummary to understand the actual step sequence. Edges with count > 1 indicate the same transition pattern appears across multiple lanes — but verify by checking which lanes contain those edges."
  );

  // Add lane-hierarchy-as-routing guidance when nested lanes exist
  const maxDepth = getMaxLaneDepth(laneAnalysis);
  if (maxDepth >= 2) {
    guidance.push(
      "LANE HIERARCHY HINT: When lanes are nested, sibling lanes under the same parent OFTEN represent variants of the same process — " +
      "they may share the same input screen with a selector (dropdown, radio, etc.) to choose between them. " +
      "Consider whether sub-lanes are better represented as options/selectors on a shared page rather than separate screens. " +
      "However, this is a pattern hint, not a rule — verify by comparing the actual edge flows between siblings."
    );
  }

  return guidance;
}

// --- Helpers ---

function getAllDescendantIds(parentId: string, allLanes: LaneDefinition[]): string[] {
  const result: string[] = [];
  const findChildren = (pid: string) => {
    for (const l of allLanes) {
      if (l.parentId === pid) {
        result.push(l.id);
        findChildren(l.id);
      }
    }
  };
  findChildren(parentId);
  return result;
}

function getDocTypesForLanes(
  laneIds: string[],
  placements: { nodeId: string; laneId: string }[],
  nodeById: Map<string, { id: string; data?: { label?: string } }>
): string[] {
  const idSet = new Set(laneIds);
  const nodeIds = placements
    .filter((p) => idSet.has(p.laneId))
    .map((p) => p.nodeId);

  const labels = new Set<string>();
  for (const nid of nodeIds) {
    const node = nodeById.get(nid);
    if (node?.data?.label) labels.add(node.data.label);
  }
  return [...labels].sort();
}

function countNodesForLanes(
  laneIds: string[],
  placements: { nodeId: string; laneId: string }[]
): number {
  const idSet = new Set(laneIds);
  return placements.filter((p) => idSet.has(p.laneId)).length;
}

function getMaxLaneDepth(laneAnalysis: LaneAnalysis[]): number {
  let maxDepth = 0;
  for (const lane of laneAnalysis) {
    let depth = 0;
    let current: LaneAnalysis | undefined = lane;
    while (current?.parent) {
      depth++;
      current = laneAnalysis.find((l) => l.name === current!.parent);
    }
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}
