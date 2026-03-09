  "use client";

 import { useState, useEffect, useCallback, useMemo } from "react";
 import { useApp } from "@/context/AppContext";
 import { Search } from "lucide-react";
 import { Button, DatePicker } from "@/components/ui";
 import { formatDate } from "@/utils/date";
 import request from "@/utils/request";

interface LedgerItem {
  _id: string;
  type: "income" | "expense" | "deduction" | "reward";
  name: string;
  points: number;
  date: string;
  icon: string;
}

export default function WalletPage() {
  const { currentUser } = useApp();

  // Ledger State
  const [ledgerData, setLedgerData] = useState<LedgerItem[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLimit] = useState(10);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerStartDate, setLedgerStartDate] = useState<Date | null>(null);
  const [ledgerEndDate, setLedgerEndDate] = useState<Date | null>(null);
  const [ledgerKeyword, setLedgerKeyword] = useState("");

  const fetchLedger = useCallback(async (page = 1) => {
    if (!currentUser?.token) return;
    setLedgerLoading(true);
    try {
      const params = {
        page,
        limit: ledgerLimit,
        ...(ledgerStartDate && { startDate: ledgerStartDate.toISOString() }),
        ...(ledgerEndDate && { endDate: ledgerEndDate.toISOString() }),
        ...(ledgerKeyword && { keyword: ledgerKeyword }),
      };

      const data = await request(`/api/ledger`, { params });
      if (data.success) {
        setLedgerData(data.data);
        setLedgerTotal(data.pagination.total);
        setLedgerPage(page);
      }
    } catch (error) {
      console.error("Fetch ledger error:", error);
    } finally {
      setLedgerLoading(false);
    }
  }, [currentUser?.token, ledgerLimit, ledgerStartDate, ledgerEndDate, ledgerKeyword]);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.token) {
        await fetchLedger(1);
      }
    };
    void loadData();
  }, [currentUser, fetchLedger]);

  const totalPages = useMemo(
    () => Math.ceil(ledgerTotal / ledgerLimit),
    [ledgerLimit, ledgerTotal],
  );

  return (
    <div className="pb-8">
      <div className="card-child mb-4">
        <div className="text-center">
          <p className="text-blue-600 mb-2">当前余额</p>
          <div className="text-4xl font-bold text-blue-700">🪙 {currentUser?.availablePoints || 0}</div>
        </div>
      </div>
 
       <div className="mb-4 space-y-2">
         <div className="flex gap-2">
           <DatePicker
            selected={ledgerStartDate}
            onChange={(date: Date | null) => setLedgerStartDate(date)}
            placeholderText="开始日期"
            className="border-blue-200"
          />
          <DatePicker
            selected={ledgerEndDate}
            onChange={(date: Date | null) => setLedgerEndDate(date)}
            placeholderText="结束日期"
            className="border-blue-200"
          />
         </div>
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
           <input
             type="text"
             placeholder="搜索记录..."
             value={ledgerKeyword}
             onChange={(e) => setLedgerKeyword(e.target.value)}
             className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-blue-200 bg-white/80 backdrop-blur"
           />
         </div>
       </div>
 
       <div className="space-y-3">
         {ledgerLoading ? (
           <div className="text-center py-8">
             <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
           </div>
         ) : (
           <>
             {ledgerData.length > 0 ? (
                              ledgerData.map((item) => {
                               // 根据类型确定样式
                               const isIncome = item.type === "income";
                               const isDeduction = item.type === "deduction";
                               const isReward = item.type === "reward";
                               const bgColor = isIncome ? "bg-blue-50" : isDeduction ? "bg-red-50" : isReward ? "bg-green-50" : "bg-orange-50";
                               const textColor = isIncome ? "text-blue-600" : isDeduction ? "text-red-600" : isReward ? "text-green-600" : "text-orange-600";
                               const sign = isIncome || isReward ? "+" : "-";
               
                               // 根据类型确定显示名称
                               let displayName = item.name;
                               if (isDeduction) {
                                 displayName = `家长扣除：${item.name}`;
                               } else if (isReward) {
                                 displayName = `家长奖励：${item.name}`;
                               }
               
                               return (
                                 <div key={item._id} className="card-parent flex items-center gap-3">
                                   <div className={`text-2xl p-2 rounded-full ${bgColor}`}>
                                     {item.icon}
                                   </div>
                                   <div className="flex-1">
                                     <p className="font-medium text-gray-800">
                                       {displayName}
                                     </p>
                                     <p className="text-xs text-gray-500">
                                       {formatDate(item.date)}
                                     </p>
                                   </div>
                                   <span className={`font-bold ${textColor}`}>
                                     {sign}{item.points}
                                   </span>
                                 </div>
                               );
                             })             ) : (
               <div className="text-center py-8 text-gray-500">暂无记录</div>
             )}
 
             {/* Pagination */}
             {totalPages > 1 && (
               <div className="flex justify-center gap-2 mt-4">
                 <Button
                   onClick={() => fetchLedger(ledgerPage - 1)}
                   disabled={ledgerPage === 1}
                   variant="secondary"
                   size="sm"
                   className="h-8 px-3 py-1 rounded-lg"
                 >
                   上一页
                 </Button>
                  <span className="px-3 py-1 text-gray-600">
                    {ledgerPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => fetchLedger(ledgerPage + 1)}
                    disabled={ledgerPage === totalPages}
                    variant="secondary"
                    size="sm"
                    className="h-8 px-3 py-1 rounded-lg"
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}
