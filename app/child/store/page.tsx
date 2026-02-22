  "use client";
 
 import { useState, useEffect, useCallback } from "react";
 import { useApp } from "@/context/AppContext";
 import { useChild } from "@/components/ChildShell";
 import { useRouter } from "next/navigation";
 import { Gift } from "lucide-react";
 import Button from "@/components/ui/Button";
 import { Pagination } from "@/components/ui";
 import ConfirmModal from "@/components/ConfirmModal";
 import confetti from "canvas-confetti";
 
 export interface Reward {
   _id: string;
   name: string;
   icon: string;
   points: number;
   type: string;
   stock: number;
 }
 
 export default function StorePage() {
   const { currentUser } = useApp();
   const { showMessage } = useChild();
   const router = useRouter();
   
   const [rewards, setRewards] = useState<Reward[]>([]);
   const [rewardSearchQuery, setRewardSearchQuery] = useState("");
  // Derived rewards
   const [showConfirmRedeem, setShowConfirmRedeem] = useState<Reward | null>(null);
   const [page, setPage] = useState(1);
   const [total, setTotal] = useState(0);
   const limit = 10;
 
   const fetchRewards = useCallback(async (pageNum: number = 1) => {
    if (!currentUser?.token) return;
    const res = await fetch(`/api/rewards?isActive=true&page=${pageNum}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      setRewards(data.rewards);
      setTotal(data.total);
    }
  }, [currentUser, limit]);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.token) {
        await fetchRewards(page);
      }
    };
    void loadData();
  }, [currentUser, fetchRewards, page]);

  const filteredRewards = (() => {
    if (rewardSearchQuery) {
      return rewards.filter((r) => r.name.toLowerCase().includes(rewardSearchQuery.toLowerCase()));
    }
    return rewards;
  })();

  const handleRedeemReward = async () => {
    if (!showConfirmRedeem) return;
    const reward = showConfirmRedeem;

    if ((currentUser?.availablePoints || 0) < reward.points) {
      showMessage("积分不足，继续加油！💪");
      setShowConfirmRedeem(null);
      return;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
      body: JSON.stringify({
        rewardId: reward._id,
      }),
    });
     const data = await res.json();
     if (data.success) {
       confetti({
         particleCount: 100,
         spread: 70,
         origin: { y: 0.6 },
         colors: ["#22c55e", "#fde047", "#fbbf24"],
       });
       showMessage(`兑换成功！找爸妈领取吧~\n核销码: ${data.verificationCode}`);
       
       // Refresh rewards to update stock
       fetchRewards();
     } else {
       showMessage(data.message);
     }
     setShowConfirmRedeem(null);
   };
 
   // navigate helper
   const navigateTo = (path: string) => router.push(`/child/${path}`);
 
    return (
      <>
        <ConfirmModal
          isOpen={!!showConfirmRedeem}
          onClose={() => setShowConfirmRedeem(null)}
          onConfirm={handleRedeemReward}
          title="兑换确认"
          message={`确定要消耗 ${showConfirmRedeem?.points} 积分兑换 "${showConfirmRedeem?.name}" 吗？`}
          confirmText="确认兑换"
          cancelText="我再想想"
          type="info"
        />

        {/* 搜索栏 */}
        <div className="mb-4">
         <input
           type="text"
           placeholder="搜索礼物..."
           value={rewardSearchQuery}
           onChange={(e) => setRewardSearchQuery(e.target.value)}
           className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white/80 backdrop-blur"
         />
       </div>
 
       <div className="grid grid-cols-2 gap-4">
        {filteredRewards.length > 0 ? (
          filteredRewards.map((reward) => (
            <div
              key={reward._id}
              className={`reward-card flex-col text-center ${reward.stock <= 0 ? "opacity-50" : ""}`}
            >
              <div className="reward-icon mx-auto mb-3">{reward.icon}</div>
              <p className="font-bold text-gray-800">{reward.name}</p>
              <p className="text-lg text-yellow-600 font-bold my-2">🪙 {reward.points}</p>
              <p className={`text-xs mb-3 ${reward.stock > 0 ? "text-green-500" : "text-red-500"}`}>
                库存: {reward.stock}
              </p>
              <Button
                onClick={() => setShowConfirmRedeem(reward)}
                disabled={reward.stock <= 0}
                variant={reward.stock > 0 ? "primary" : "secondary"}
                size="sm"
                fullWidth
              >
                {reward.stock > 0 ? "兑换" : "已售罄"}
              </Button>
            </div>
          ))
        ) : (
          <div className="col-span-2 card text-center py-12 text-gray-500">
            <Gift size={48} className="mx-auto mb-2 opacity-50" />
            <p>暂无商品</p>
          </div>
        )}
      </div>
      
      {total > limit && (
        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={limit}
          onPageChange={setPage}
        />
      )}
      </>
    );
  }
