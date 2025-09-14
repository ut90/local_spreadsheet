export type ScalarType = 'string' | 'int' | 'float' | 'bool' | 'null' | 'date' | 'unknown';

export interface Column {
  key: string; // dot-path
  label: string;
  visible: boolean;
}

export interface Cell {
  value: unknown;
  type: ScalarType;
}

export interface Row {
  id: string;
  cells: Record<string, Cell>;
  // Optional raw arrays for hierarchical groups (e.g., 自システムサーバー, 他システムサーバー)
  groupArrays?: Record<string, Array<Record<string, unknown>>>;
}

export interface GridModel {
  columns: Column[];
  rows: Row[];
}
