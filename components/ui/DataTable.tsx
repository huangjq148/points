"use client";

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import Pagination from "./Pagination";

interface PageOptions {
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  dataSource: TData[];
  pageOptions?: PageOptions;
  actionColumn?: ColumnDef<TData, any>;
  loading?: boolean;
  emptyText?: string;
  minWidth?: number;
  actionColumnWidth?: number;
}

export function DataTable<TData>({
  columns,
  dataSource,
  pageOptions,
  actionColumn,
  loading = false,
  emptyText = "暂无数据",
  minWidth = 600,
  actionColumnWidth = 120,
}: DataTableProps<TData>) {
  const tableData = useMemo(() => dataSource, [dataSource]);

  const allColumns = useMemo(() => {
    if (actionColumn) {
      return [...columns, actionColumn];
    }
    return columns;
  }, [columns, actionColumn]);

  const table = useReactTable({
    data: tableData,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasActionColumn = !!actionColumn;

  return (
    <div className="space-y-4">
      <div 
        className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-x-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
      >
        <table 
          className="w-full text-left"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead className="bg-blue-50 text-blue-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th 
                    key={header.id} 
                    className={`p-4 font-medium whitespace-nowrap ${
                      header.column.id === "actions" 
                        ? "sticky right-0 bg-blue-50 z-10 text-center" 
                        : ""
                    }`}
                    style={header.column.id === "actions" ? { width: `${actionColumnWidth}px` } : undefined}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-blue-50 hover:bg-blue-50/30">
                {row.getVisibleCells().map((cell) => (
                  <td 
                    key={cell.id} 
                    className={`p-4 ${
                      cell.column.id === "actions" 
                        ? "sticky right-0 bg-white border-l border-blue-50 text-center" 
                        : ""
                    }`}
                    style={cell.column.id === "actions" ? { width: `${actionColumnWidth}px` } : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {(tableData.length === 0 || loading) && (
              <tr>
                <td 
                  colSpan={allColumns.length} 
                  className="p-8 text-center text-gray-400"
                >
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
