"use client";

import {
  Column,
  ColumnDef,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CSSProperties, ReactNode, useMemo } from "react";
import Pagination from "./Pagination";

interface PageOptions {
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export interface DataTableColumn<TData> {
  key: keyof TData | string;
  title: ReactNode;
  render?: (value: unknown, row: TData, index: number) => ReactNode;
  fixed?: "left" | "right";
  width?: number;
}

interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  dataSource: TData[];
  pageOptions?: PageOptions;
  actionColumn?: DataTableColumn<TData>;
  loading?: boolean;
  emptyText?: string;
  minWidth?: number;
  actionColumnWidth?: number;
  fixedColumns?: {
    left?: string[];
    right?: string[];
  };
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string;
}

type TableColumnMeta = {
  fixed?: "left" | "right";
};

const getColumnId = <TData,>(column: ColumnDef<TData, unknown>): string | null => {
  if (typeof column.id === "string") return column.id;
  if ("accessorKey" in column && typeof column.accessorKey === "string") {
    return column.accessorKey;
  }
  return null;
};

export function DataTable<TData>({
  columns,
  dataSource,
  pageOptions,
  actionColumn,
  loading = false,
  emptyText = "暂无数据",
  minWidth = 600,
  actionColumnWidth = 120,
  fixedColumns,
  onRowClick,
  getRowClassName,
}: DataTableProps<TData>) {
  const tableData = useMemo(() => dataSource, [dataSource]);

  const mappedColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    return columns.map((column) => ({
      id: String(column.key),
      accessorFn: (row) => (row as Record<string, unknown>)[String(column.key)],
      header: () => column.title,
      cell: (ctx) => {
        if (column.render) {
          return column.render(ctx.getValue(), ctx.row.original, ctx.row.index);
        }
        const value = ctx.getValue();
        return value == null ? "-" : String(value);
      },
      size: column.width,
      meta: {
        fixed: column.fixed,
      } as TableColumnMeta,
    }));
  }, [columns]);

  const mappedActionColumn = useMemo<ColumnDef<TData, unknown> | null>(() => {
    if (!actionColumn) return null;
    return {
      id: String(actionColumn.key),
      header: () => actionColumn.title,
      cell: (ctx) => actionColumn.render?.(undefined, ctx.row.original, ctx.row.index) ?? null,
      size: actionColumn.width ?? actionColumnWidth,
      meta: {
        fixed: actionColumn.fixed ?? "right",
      } as TableColumnMeta,
    };
  }, [actionColumn, actionColumnWidth]);

  const allColumns = useMemo(() => {
    if (mappedActionColumn) {
      return [...mappedColumns, mappedActionColumn];
    }
    return mappedColumns;
  }, [mappedColumns, mappedActionColumn]);

  const actionColumnId = mappedActionColumn ? getColumnId(mappedActionColumn) : null;

  const columnPinning = useMemo<ColumnPinningState>(() => {
    const allColumnIds = allColumns
      .map((column) => getColumnId(column))
      .filter((id): id is string => !!id);

    const leftSet = new Set<string>(fixedColumns?.left ?? []);
    const rightSet = new Set<string>(fixedColumns?.right ?? []);

    allColumns.forEach((column) => {
      const id = getColumnId(column);
      const fixed = (column.meta as TableColumnMeta | undefined)?.fixed;
      if (!id || !fixed) return;
      if (fixed === "left") leftSet.add(id);
      if (fixed === "right") rightSet.add(id);
    });

    if (actionColumnId && !leftSet.has(actionColumnId) && !rightSet.has(actionColumnId)) {
      rightSet.add(actionColumnId);
    }

    leftSet.forEach((id) => {
      if (rightSet.has(id)) rightSet.delete(id);
    });

    return {
      left: allColumnIds.filter((id) => leftSet.has(id)),
      right: allColumnIds.filter((id) => rightSet.has(id)),
    };
  }, [actionColumnId, allColumns, fixedColumns]);

  const table = useReactTable({
    data: tableData,
    columns: allColumns,
    state: {
      columnPinning,
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const getPinnedStyles = (
    column: Column<TData, unknown>,
    bgColor: string,
  ): CSSProperties => {
    const pinned = column.getIsPinned();
    if (!pinned) return {};

    return {
      position: "sticky",
      left: pinned === "left" ? `${column.getStart("left")}px` : undefined,
      right: pinned === "right" ? `${column.getAfter("right")}px` : undefined,
      zIndex: 20,
      background: bgColor,
      boxShadow: pinned === "left" ? "2px 0 0 #dbeafe" : "-2px 0 0 #dbeafe",
    };
  };

  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-2xl shadow-sm border border-blue-100 max-w-full overflow-x-auto scrollbar-thin"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
      >
        <table className="w-full min-w-max text-left text-sm" style={{ minWidth: `${minWidth}px` }}>
          <thead className="bg-blue-50 text-blue-800 text-xs">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-3 py-2.5 font-medium whitespace-nowrap ${
                      header.column.id === actionColumnId ? "text-center" : ""
                    }`}
                    style={{
                      ...(header.column.id === actionColumnId ? { width: `${actionColumnWidth}px` } : {}),
                      ...getPinnedStyles(header.column, "#eff6ff"),
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-blue-50 hover:bg-blue-50/30 ${
                  onRowClick ? "cursor-pointer" : ""
                } ${getRowClassName ? getRowClassName(row.original) : ""}`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-3 py-2.5 whitespace-nowrap ${
                      cell.column.id === actionColumnId ? "text-center" : ""
                    }`}
                    style={{
                      ...(cell.column.id === actionColumnId ? { width: `${actionColumnWidth}px` } : {}),
                      ...getPinnedStyles(cell.column, "#ffffff"),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {(tableData.length === 0 || loading) && (
              <tr>
                <td colSpan={allColumns.length} className="p-8 text-center text-gray-400">
                  {loading ? "加载中..." : emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageOptions && pageOptions.total > pageOptions.pageSize && (
        <Pagination
          currentPage={pageOptions.currentPage}
          totalItems={pageOptions.total}
          pageSize={pageOptions.pageSize}
          onPageChange={pageOptions.onPageChange}
        />
      )}
    </div>
  );
}

export default DataTable;
