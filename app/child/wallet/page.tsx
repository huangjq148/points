 "use client";
 
 import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Search,
  ChevronRight,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { zhCN } from "date-fns/locale";
import Button from "@/components/ui/Button";
import { formatDate } from "@/utils/date";

registerLocale("zh-CN", zhCN);

interface LedgerItem {
  _id: string;
  type: "income" | "expense";
  name: string;
  points: number;
  date: string;
  icon: string;
}

export default function WalletPage() {
  const { currentUser } = useApp();
  const router = useRouter();

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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ledgerLimit.toString(),
      });
      if (ledgerStartDate) params.append("startDate", ledgerStartDate.toISOString());
      if (ledgerEndDate) params.append("endDate", ledgerEndDate.toISOString());
      if (ledgerKeyword) params.append("keyword", ledgerKeyword);

      const res = await fetch(`/api/ledger?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();
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
  }, [currentUser, ledgerLimit, ledgerStartDate, ledgerEndDate, ledgerKeyword]);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.token) {
        await fetchLedger(1);
      }
    };
    void loadData();
  }, [currentUser, fetchLedger]);

  // navigate helper
  const navigateTo = (path: string) => router.push(`/child/${path}`);

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => navigateTo("task")}
          variant="secondary"
          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 transition p-0"
        >
          <ChevronRight size={24} className="text-blue-600 rotate-180" />
        </Button>
         <h2 className="text-xl md:text-2xl font-bold text-blue-700">积分账本</h2>
       </div>
       <div className="card-child mb-4">
         <div className="text-center">
           <p className="text-blue-600 mb-2">当前余额</p>
           <div className="text-4xl font-bold text-blue-700">🪙 {currentUser?.availablePoints || 0}</div>
         </div>
       </div>
 
       {/* Filters */}
       <div className="mb-4 space-y-2">
         <div className="flex gap-2">
           <div className="relative flex-1">
             <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
             <DatePicker
              selected={ledgerStartDate}
              onChange={(date: Date | null) => setLedgerStartDate(date)}
              locale="zh-CN"
              dateFormat="yyyy-MM-dd"
              placeholderText="开始日期"
              className="w-full pl-8 pr-2 py-2 text-sm rounded-xl border border-blue-200 bg-white/80 backdrop-blur outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              wrapperClassName="w-full"
              isClearable
            />
           </div>
           <div className="relative flex-1">
             <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
             <DatePicker
              selected={ledgerEndDate}
              onChange={(date: Date | null) => setLedgerEndDate(date)}
              locale="zh-CN"
              dateFormat="yyyy-MM-dd"
              placeholderText="结束日期"
              className="w-full pl-8 pr-2 py-2 text-sm rounded-xl border border-blue-200 bg-white/80 backdrop-blur outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              wrapperClassName="w-full"
              isClearable
            />
           </div>
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
               ledgerData.map((item) => (
                 <div key={item._id} className="card-parent flex items-center gap-3">
                   <div
                     className={`text-2xl p-2 rounded-full ${item.type === "income" ? "bg-blue-50" : "bg-orange-50"}`}
                   >
                     {item.icon}
                   </div>
                   <div className="flex-1">
                     <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.date)}
                    </p>
                  </div>
                   <span className={`font-bold ${item.type === "income" ? "text-blue-600" : "text-orange-600"}`}>
                     {item.type === "income" ? "+" : "-"}
                     {item.points}
                   </span>
                 </div>
               ))
             ) : (
               <div className="text-center py-8 text-gray-500">暂无记录</div>
             )}
 
             {/* Pagination */}
             {Math.ceil(ledgerTotal / ledgerLimit) > 1 && (
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
                   {ledgerPage} / {Math.ceil(ledgerTotal / ledgerLimit)}
                 </span>
                 <Button
                   onClick={() => fetchLedger(ledgerPage + 1)}
                   disabled={ledgerPage === Math.ceil(ledgerTotal / ledgerLimit)}
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
     </>
   );
 }
