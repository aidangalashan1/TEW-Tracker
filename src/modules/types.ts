import { ReactNode } from 'react'

export type SizeTier = 'card' | 'small' | 'medium' | 'large'

export interface ModuleRenderProps<T = unknown> {
  data: T
  width: number
  height: number
  tier: SizeTier
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

export interface ModuleDefinition<T = unknown> {
  id: string
  name: string
  description: string
  icon: string
  defaultSize: { w: number; h: number }
  minW: number
  minH: number
  maxW?: number
  maxH?: number
  supportsPageView?: boolean
  hideFromDashboard?: boolean
  render: (props: ModuleRenderProps<T>) => ReactNode
  /** Fetch data required by this module. Called by the shell; result passed via `render` props.data. */
  fetchData?: (fedUid: number) => Promise<T>
}

/**
 * Derives the data type a module component expects, straight from its props
 * parameter. Annotate a module as `ModuleDefinition<ModuleData<typeof Comp>>`
 * so `fetchData`'s return type is checked against what the component renders —
 * the annotation can't drift from the component.
 */
export type ModuleData<C extends (...args: any) => any> =
  Parameters<C>[0] extends ModuleRenderProps<infer T> ? T : never

export interface LayoutItem {
  i: string
  moduleId: string
  x: number
  y: number
  w: number
  h: number
  config?: Record<string, any>
}

export interface PageLayout {
  page: string
  items: LayoutItem[]
}
