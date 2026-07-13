export interface LayoutItemData {
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
  items: LayoutItemData[]
}
