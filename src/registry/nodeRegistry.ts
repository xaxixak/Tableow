import type { NodeDefinition, NodeCategory } from '@/types/index.ts'

class NodeRegistry {
  private definitions = new Map<string, NodeDefinition>()
  private categories = new Map<string, NodeCategory>()

  registerCategory(category: NodeCategory): void {
    this.categories.set(category.id, category)
  }

  register(definition: NodeDefinition): void {
    this.definitions.set(definition.type, definition)
  }

  unregister(type: string): void {
    this.definitions.delete(type)
  }

  get(type: string): NodeDefinition | undefined {
    return this.definitions.get(type)
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.definitions.values())
  }

  getCategory(id: string): NodeCategory | undefined {
    return this.categories.get(id)
  }

  getAllCategories(): NodeCategory[] {
    return Array.from(this.categories.values())
  }

  getByCategory(): Map<string, NodeDefinition[]> {
    const grouped = new Map<string, NodeDefinition[]>()
    for (const def of this.definitions.values()) {
      const list = grouped.get(def.category) ?? []
      list.push(def)
      grouped.set(def.category, list)
    }
    return grouped
  }
}

export const nodeRegistry = new NodeRegistry()
export { NodeRegistry }
