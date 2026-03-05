import type { Workflow } from '@/types/index.ts'

/**
 * Serialize a workflow to a JSON string.
 */
export function workflowToJSON(workflow: Workflow): string {
  return JSON.stringify(workflow, null, 2)
}

/**
 * Parse a JSON string into a Workflow object.
 * Throws if the JSON is invalid or doesn't match the expected shape.
 */
export function workflowFromJSON(json: string): Workflow {
  const parsed = JSON.parse(json) as unknown
  validateWorkflow(parsed)
  return parsed as Workflow
}

/**
 * Validate that a parsed object has the expected Workflow shape.
 * Throws a descriptive error if validation fails.
 */
export function validateWorkflow(data: unknown): asserts data is Workflow {
  if (data === null || typeof data !== 'object') {
    throw new Error('Workflow must be an object')
  }

  const obj = data as Record<string, unknown>

  if (!obj.metadata || typeof obj.metadata !== 'object') {
    throw new Error('Workflow must have a metadata object')
  }

  const meta = obj.metadata as Record<string, unknown>
  if (typeof meta.id !== 'string' || typeof meta.name !== 'string') {
    throw new Error('Workflow metadata must have id and name strings')
  }

  if (!Array.isArray(obj.nodes)) {
    throw new Error('Workflow must have a nodes array')
  }

  if (!Array.isArray(obj.edges)) {
    throw new Error('Workflow must have an edges array')
  }

  // gridConfig is optional — validate shape if present
  if (obj.gridConfig !== undefined) {
    if (typeof obj.gridConfig !== 'object' || obj.gridConfig === null) {
      throw new Error('Workflow gridConfig must be an object if present')
    }
    const gc = obj.gridConfig as Record<string, unknown>
    if (!Array.isArray(gc.lanes) || !Array.isArray(gc.stages) || !Array.isArray(gc.placements)) {
      throw new Error('gridConfig must have lanes, stages, and placements arrays')
    }
  }
}

/**
 * Download a workflow as a JSON file via browser file save dialog.
 */
export function downloadWorkflow(workflow: Workflow, filename?: string): void {
  const json = workflowToJSON(workflow)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `${workflow.metadata.name.replace(/\s+/g, '-').toLowerCase()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Load a workflow from a File object (e.g. from a file input).
 */
export function loadWorkflowFromFile(file: File): Promise<Workflow> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const workflow = workflowFromJSON(reader.result as string)
        resolve(workflow)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse workflow JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
