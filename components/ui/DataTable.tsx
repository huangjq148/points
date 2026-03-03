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
      boxShadow: pinned === "left" 
        ? "4px 0 8px -4px rgba(0, 0, 0, 0.1)" 
        : "-4px 0 8px -4px rgba(0, 0, 0, 0.1)",
    };
  };

  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-full overflow-x-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
      >
        <table className="w-full min-w-max text-left text-sm" style={{ minWidth: `${minWidth}px` }}>
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 font-semibold whitespace-nowrap ${
                      header.column.id === actionColumnId ? "text-center" : ""
                    }`}
                    style={{
                      ...(header.column.id === actionColumnId ? { width: `${actionColumnWidth}px` } : {}),
                      ...getPinnedStyles(header.column, "#f9fafb"),
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={`transition-colors duration-150 hover:bg-blue-50/50 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                } ${onRowClick ? "cursor-pointer" : ""} ${
                  getRowClassName ? getRowClassName(row.original) : ""
                }`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 whitespace-nowrap text-gray-700 ${
                      cell.column.id === actionColumnId ? "text-center" : ""
                    }`}
                    style={{
                      ...(cell.column.id === actionColumnId ? { width: `${actionColumnWidth}px` } : {}),
                      ...getPinnedStyles(cell.column, index % 2 === 0 ? "#ffffff" : "#f9fafb"),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {(tableData.length === 0 || loading) && (
              <tr>
                <td colSpan={allColumns.length} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm">{loading ? "加载中..." : emptyText}</span>
                  </div>
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
