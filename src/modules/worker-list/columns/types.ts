import { ReactNode } from 'react'
import { Worker } from '../../../api'

export interface ColumnDef {
  id: string
  label: string
  abbrev?: string
  width: number
  group: string
  filterGroup: string
  render: (w: Worker) => ReactNode
  sortKey?: string
}

export interface ColumnState {
  id: string
  width: number
}
