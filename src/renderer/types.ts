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
}

export interface GridModel {
  columns: Column[];
  rows: Row[];
}

