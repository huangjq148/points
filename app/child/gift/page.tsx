 "use client";
 
 import { useState, useEffect } from "react";
 import { useApp } from "@/context/AppContext";
 import { useChild } from "@/components/ChildShell";
 import { useRouter } from "next/navigation";
 import {
   Calendar as CalendarIcon,
   Search,
   ChevronRight,
   Gift,
   Wallet,
 } from "lucide-react";
 import DatePicker from "react-datepicker";
 import "react-datepicker/dist/react-datepicker.css";
 import { registerLocale } from "react-datepicker";
 import { zhCN } from "date-fns/locale";
 import Button from "@/components/ui/Button";
import { formatDate } from "@/utils/date";

registerLocale("zh-CN", zhCN);
 
 export interface Order {
   _id: string;
   rewardName: string;
   rewardIcon: string;
   pointsSpent: number;
   status: "pending" | "verified" | "cancelled";
   verificationCode: string;
   createdAt: string;
   verifiedAt?: string;
 }
 
 export default function GiftPage() {
   const { currentUser } = useApp();
   const { showMessage } = useChild();
   const router = useRouter();
 
   const [orders, setOrders] = useState<Order[]>([]);
   const [giftSearchQuery, setGiftSearchQuery] = useState("");
   const [giftDate, setGiftDate] = useState<Date | null>(null);
   const [giftStatusFilter, setGiftStatusFilter] = useState<"all" | "pending" | "verified" | "cancelled">("pending");
   const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);
 
   const fetchOrders = useCallback(async () => {
    if (!currentUser) return;
    const res = await fetch(`/api/orders?childId=${currentUser.id}`, {
      headers: {
        Authorization: `Bearer ${currentUser?.token}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      setOrders(data.orders);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser, fetchOrders]);
 
   const filteredOrders = (() => {
     let filtered = orders;
     if (giftSearchQuery) {
       filtered = filtered.filter((o) => o.rewardName.toLowerCase().includes(giftSearchQuery.toLowerCase()));
     }
     if (giftDate) {
       const filterDate = giftDate.toDateString();
       filtered = filtered.filter((o) => new Date(o.createdAt).toDateString() === filterDate);
     }
     if (giftStatusFilter !== "all") {
       filtered = filtered.filter((o) => o.status === giftStatusFilter);
     }
     return filtered;
   })();
 
   const handleCancelOrder = async (order: Order) => {
     const res = await fetch("/api/orders", {
       method: "PUT",
       headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
       body: JSON.stringify({
         orderId: order._id,
         action: "cancel",
       }),
     });
     const data = await res.json();
     if (data.success) {
       fetchOrders();
       setShowOrderDetail(null);
       showMessage(`已撤销兑换，${order.pointsSpent} 积分已退回`);
     } else {
       showMessage(data.message);
     }
   };
 
   // navigate helper
   const navigateTo = (path: string) => router.push(`/child/${path}`);
 
   return (
     <>
       {showOrderDetail && (
         <div className="modal-overlay" onClick={() => setShowOrderDetail(null)}>
           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
             <div className="text-center mb-6">
               <div className="text-6xl mb-4 shadow-lg rounded-2xl p-4 bg-white inline-block">
                 {showOrderDetail.rewardIcon}
               </div>
               <h3 className="text-2xl font-bold text-gray-800 mb-1">{showOrderDetail.rewardName}</h3>
               <div className="flex justify-center gap-2 mb-4">
                 <span className="badge badge-primary">-{showOrderDetail.pointsSpent} 积分</span>
                 <span
                   className={`badge ${
                     showOrderDetail.status === "verified"
                       ? "badge-success"
                       : showOrderDetail.status === "cancelled"
                         ? "badge-error"
                         : "badge-warning"
                   }`}
                 >
                   {showOrderDetail.status === "verified"
                     ? "已核销"
                     : showOrderDetail.status === "cancelled"
                       ? "已取消"
                       : "待核销"}
                 </span>
               </div>
 
               {showOrderDetail.status === "pending" && (
                 <div className="bg-yellow-50 p-4 rounded-xl mb-4 border border-yellow-100">
                   <p className="text-yellow-800 text-sm mb-1">请向家长出示核销码</p>
                   <p className="font-mono text-3xl font-bold text-yellow-800 tracking-wider">
                     {showOrderDetail.verificationCode}
                   </p>
                 </div>
               )}
 
               <div className="text-sm text-gray-500 space-y-1 bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span>兑换时间</span>
                  <span>{formatDate(showOrderDetail.createdAt)}</span>
                </div>
                {showOrderDetail.verifiedAt && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>核销时间</span>
                    <span>{formatDate(showOrderDetail.verifiedAt)}</span>
                  </div>
                )}
              </div>
             </div>
 
             <Button
               onClick={() => setShowOrderDetail(null)}
               variant="ghost"
               fullWidth
               className="py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
             >
               关闭
             </Button>
             {showOrderDetail.status === "pending" && (
               <Button
                 onClick={() => handleCancelOrder(showOrderDetail)}
                 variant="ghost"
                 fullWidth
                 className="py-3 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 mt-2"
               >
                 撤销兑换
               </Button>
             )}
           </div>
         </div>
       )}
 
       <div className="flex items-center gap-2 mb-4">
         <Button
           onClick={() => navigateTo("store")}
           variant="ghost"
           className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 transition p-0"
         >
           <ChevronRight size={24} className="text-blue-600 rotate-180" />
         </Button>
         <h2 className="text-xl md:text-2xl font-bold text-blue-700">我的礼物</h2>
         <div className="ml-auto flex gap-2">
           <Button
             onClick={() => navigateTo("wallet")}
             variant="secondary"
             size="sm"
             className="bg-green-100 text-green-700 hover:bg-green-200"
           >
             <Wallet size={16} className="mr-1" />
             钱包
           </Button>
         </div>
       </div>
 
       {/* 礼物筛选区 */}
       <div className="mb-4 flex flex-col gap-2">
         <div className="flex flex-row gap-2">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input
               type="text"
               placeholder="搜索礼物..."
               value={giftSearchQuery}
               onChange={(e) => setGiftSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur"
             />
           </div>
           <div className="relative flex-1">
             <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
             <DatePicker
              selected={giftDate}
              onChange={(date: Date | null) => setGiftDate(date)}
              locale="zh-CN"
              dateFormat="yyyy-MM-dd"
              placeholderText="兑换日期"
              className="w-full pl-10 pr-2 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              wrapperClassName="w-full"
              isClearable
            />
           </div>
         </div>
         <div className="flex p-1 bg-white/50 backdrop-blur rounded-xl border border-blue-100 overflow-x-auto">
           {(["all", "pending", "verified", "cancelled"] as const).map((status) => (
             <Button
               key={status}
               onClick={() => setGiftStatusFilter(status)}
               variant="ghost"
               className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition whitespace-nowrap ${
                 giftStatusFilter === status ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-500"
               }`}
             >
               {status === "all"
                 ? "全部"
                 : status === "pending"
                   ? "未核销"
                   : status === "verified"
                     ? "已核销"
                     : "已取消"}
             </Button>
           ))}
         </div>
       </div>
 
       <div className="grid grid-cols-2 gap-3">
         {filteredOrders.length > 0 ? (
           filteredOrders.map((order) => (
             <div
               key={order._id}
               className={`card-child flex flex-col gap-2 p-3 items-center text-center cursor-pointer hover:shadow-md transition active:scale-95 ${
                 order.status === "verified"
                   ? "bg-green-50 border-green-200"
                   : order.status === "cancelled"
                     ? "bg-gray-50 border-gray-200 opacity-75"
                     : "bg-white border-blue-100"
               }`}
               onClick={() => setShowOrderDetail(order)}
             >
               <div className="text-3xl mb-1">{order.rewardIcon}</div>
               <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{order.rewardName}</h3>
               <div className="flex flex-col gap-1 w-full">
                 <div className="flex items-center justify-center gap-1">
                   <span
                     className={`w-2 h-2 rounded-full ${
                       order.status === "verified"
                         ? "bg-green-500"
                         : order.status === "cancelled"
                           ? "bg-gray-400"
                           : "bg-yellow-500"
                     }`}
                   />
                   <span className="text-xs text-gray-500">
                     {order.status === "verified"
                       ? "已核销"
                       : order.status === "cancelled"
                         ? "已取消"
                         : "待核销"}
                   </span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-black/5 pt-1 mt-1">
                  <span>🪙 {order.pointsSpent}</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
               </div>
             </div>
           ))
         ) : (
           <div className="col-span-2 text中心 py-12 text-gray-500">
             <Gift size={48} className="mx-auto mb-2 opacity-50" />
             <p>还没兑换过礼物哦</p>
             <Button
               onClick={() => navigateTo("store")}
               variant="ghost"
               className="text-blue-500 mt-2"
             >
               去商城看看
             </Button>
           </div>
         )}
       </div>
     </>
   );
 }
