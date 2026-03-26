"use client";

import {
  Column,
  ColumnDef,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CSSProperties, ReactNode, useCallback, useMemo } from "react";
import Pagination from "./Pagination";
import {
  CONTROL_PANEL_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
} from "./controlStyles";

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
  // 行选择相关属性
  rowSelection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: TData[]) => void;
    getRowKey: (row: TData) => string;
  };
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
  rowSelection,
}: DataTableProps<TData>) {
  const tableData = useMemo(() => dataSource, [dataSource]);

  // 计算是否全选
  const isAllSelected = useMemo(() => {
    if (!rowSelection || tableData.length === 0) return false;
    return tableData.every(row => rowSelection.selectedRowKeys.includes(rowSelection.getRowKey(row)));
  }, [rowSelection, tableData]);

  const isIndeterminate = useMemo(() => {
    if (!rowSelection || tableData.length === 0) return false;
    const selectedCount = tableData.filter(row => rowSelection.selectedRowKeys.includes(rowSelection.getRowKey(row))).length;
    return selectedCount > 0 && selectedCount < tableData.length;
  }, [rowSelection, tableData]);

  // 处理全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (!rowSelection) return;
    if (isAllSelected) {
      // 取消全选：移除当前页所有行的选中状态
      const currentPageKeys = new Set(tableData.map(row => rowSelection.getRowKey(row)));
      const newSelectedKeys = rowSelection.selectedRowKeys.filter(key => !currentPageKeys.has(key));
      const newSelectedRows = rowSelection.selectedRowKeys
        .map(key => tableData.find(row => rowSelection.getRowKey(row) === key))
        .filter((row): row is TData => row !== undefined && !currentPageKeys.has(rowSelection.getRowKey(row)));
      rowSelection.onChange(newSelectedKeys, newSelectedRows);
    } else {
      // 全选：添加当前页所有行
      const currentPageKeys = tableData.map(row => rowSelection.getRowKey(row));
      const newSelectedKeys = Array.from(new Set([...rowSelection.selectedRowKeys, ...currentPageKeys]));
      const newSelectedRows = tableData.filter(row => newSelectedKeys.includes(rowSelection.getRowKey(row)));
      rowSelection.onChange(newSelectedKeys, newSelectedRows);
    }
  }, [rowSelection, isAllSelected, tableData]);

  // 处理单行选择
  const handleSelectRow = useCallback((row: TData, checked: boolean) => {
    if (!rowSelection) return;
    const rowKey = rowSelection.getRowKey(row);
    let newSelectedKeys: string[];
    let newSelectedRows: TData[];
    
    if (checked) {
      newSelectedKeys = [...rowSelection.selectedRowKeys, rowKey];
      newSelectedRows = [...rowSelection.selectedRowKeys.map(key => 
        tableData.find(r => rowSelection.getRowKey(r) === key) || row
      ).filter((r, i, arr) => 
        rowSelection.selectedRowKeys[i] !== rowKey || arr.findIndex(ar => rowSelection.getRowKey(ar) === rowSelection.selectedRowKeys[i]) === i
      ), row];
    } else {
      newSelectedKeys = rowSelection.selectedRowKeys.filter(key => key !== rowKey);
      newSelectedRows = tableData.filter(r => newSelectedKeys.includes(rowSelection.getRowKey(r)));
    }
    
    rowSelection.onChange(newSelectedKeys, newSelectedRows);
  }, [rowSelection, tableData]);

  // 构建选择列
  const selectionColumn: ColumnDef<TData, unknown> | null = useMemo(() => {
    if (!rowSelection) return null;
    return {
      id: "selection",
      header: () => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) {
                el.indeterminate = isIndeterminate;
              }
            }}
            onChange={handleSelectAll}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      cell: (ctx) => {
        const row = ctx.row.original;
        const rowKey = rowSelection.getRowKey(row);
        const isSelected = rowSelection.selectedRowKeys.includes(rowKey);
        return (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelectRow(row, e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      },
      size: 48,
      meta: {
        fixed: "left",
      } as TableColumnMeta,
    };
  }, [rowSelection, isAllSelected, isIndeterminate, handleSelectAll, handleSelectRow]);

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
    const cols: ColumnDef<TData, unknown>[] = [];
    if (selectionColumn) cols.push(selectionColumn);
    cols.push(...mappedColumns);
    if (mappedActionColumn) cols.push(mappedActionColumn);
    return cols;
  }, [mappedColumns, mappedActionColumn, selectionColumn]);

  const actionColumnId = mappedActionColumn ? getColumnId(mappedActionColumn) : null;
  const selectionColumnId = selectionColumn ? getColumnId(selectionColumn) : null;

  const columnPinning = useMemo<ColumnPinningState>(() => {
    const allColumnIds = allColumns
      .map((column) => getColumnId(column))
      .filter((id): id is string => !!id);

    const leftSet = new Set<string>(fixedColumns?.left ?? []);
    const rightSet = new Set<string>(fixedColumns?.right ?? []);

    // 如果选择列存在，强制固定在左侧
    if (selectionColumnId) {
      leftSet.add(selectionColumnId);
    }

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
  }, [actionColumnId, selectionColumnId, allColumns, fixedColumns]);

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
        className={`max-w-full min-w-0 overflow-x-auto ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_CLASS}`}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
      >
        <table
          className="w-full text-left text-sm"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead className="bg-slate-50/90 text-slate-600 text-xs uppercase tracking-wider">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 font-semibold whitespace-nowrap ${
                      header.column.id === actionColumnId ? "text-center" : ""
                    } ${header.column.id === selectionColumnId ? "text-center w-12" : ""}`}
                    style={{
                      ...(header.column.id === actionColumnId ? { width: `${actionColumnWidth}px` } : {}),
                      ...(header.column.id === selectionColumnId ? { width: "48px" } : {}),
                      ...getPinnedStyles(header.column, "#f9fafb"),
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={`transition-colors duration-150 hover:bg-slate-50/80 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                } ${onRowClick ? "cursor-pointer" : ""} ${
                  getRowClassName ? getRowClassName(row.original) : ""
                }`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                  className={`px-4 py-3 whitespace-nowrap text-slate-700 ${
                    cell.column.id === actionColumnId ? "text-center" : ""
                  } ${cell.column.id === selectionColumnId ? "text-center w-12" : ""}`}
                    style={{
                      ...(cell.column.id === actionColumnId ? { width: `${actionColumnWidth}px` } : {}),
                      ...(cell.column.id === selectionColumnId ? { width: "48px" } : {}),
                      ...getPinnedStyles(cell.column, index % 2 === 0 ? "#ffffff" : "#f8fafc"),
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
                  <div className="flex flex-col items-center gap-2 text-slate-400">
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
