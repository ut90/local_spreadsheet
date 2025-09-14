import React from 'react';
import DataEditor, { GridCellKind, type GridCell, type GridColumn, type Item } from "glide-data-grid";
import "glide-data-grid/dist/index.css";
import type { GridModel } from "../types";

type Props = {
  grid: GridModel;
};

export const GridView: React.FC<Props> = ({ grid }) => {
  const columns = React.useMemo<GridColumn[]>(
    () =>
      grid.columns.map((c) => ({
        title: c.label,
        id: c.key,
        grow: 1,
      })),
    [grid.columns]
  );

  const getCellContent = React.useCallback(
    ([col, row]: Item): GridCell => {
      const colKey = grid.columns[col]?.key ?? "";
      const r = grid.rows[row];
      const cell = r.cells[colKey];
      const value = cell?.value;
      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        data: value == null ? "" : String(value),
        displayData: value == null ? "" : String(value),
      };
    },
    [grid]
  );

  return (
    <div style={{ height: 400 }}>
      <DataEditor
        columns={columns}
        getCellContent={getCellContent}
        rows={grid.rows.length}
        smoothScrollX
        smoothScrollY
        rowMarkers="number"
      />
    </div>
  );
};

