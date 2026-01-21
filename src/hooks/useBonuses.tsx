import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";

interface BonusData {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export function useBonuses() {
  const { profile, isAuthenticated } = useTelegramAuthContext();
  const [bonusData, setBonusData] = useState<BonusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBonuses = useCallback(async () => {
    if (!isAuthenticated || !profile?.id) {
      setBonusData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("user_bonuses")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setBonusData({
          id: data.id,
          balance: data.balance || 0,
          totalEarned: data.total_earned || 0,
          totalSpent: data.total_spent || 0,
        });
      } else {
        // Create initial bonus record if doesn't exist
        const { data: newData, error: insertError } = await supabase
          .from("user_bonuses")
          .insert({ profile_id: profile.id, balance: 0 })
          .select()
          .single();

        if (insertError) throw insertError;

        setBonusData({
          id: newData.id,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
        });
      }
    } catch (err: any) {
      console.error("Error fetching bonuses:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, profile?.id]);

  const spendBonuses = async (amount: number): Promise<boolean> => {
    if (!bonusData || amount <= 0 || amount > bonusData.balance) {
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from("user_bonuses")
        .update({
          balance: bonusData.balance - amount,
          total_spent: bonusData.totalSpent + amount,
        })
        .eq("id", bonusData.id);

      if (updateError) throw updateError;

      setBonusData(prev => prev ? {
        ...prev,
        balance: prev.balance - amount,
        totalSpent: prev.totalSpent + amount,
      } : null);

      return true;
    } catch (err: any) {
      console.error("Error spending bonuses:", err);
      return false;
    }
  };

  const addBonuses = async (amount: number): Promise<boolean> => {
    if (!bonusData || amount <= 0) {
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from("user_bonuses")
        .update({
          balance: bonusData.balance + amount,
          total_earned: bonusData.totalEarned + amount,
        })
        .eq("id", bonusData.id);

      if (updateError) throw updateError;

      setBonusData(prev => prev ? {
        ...prev,
        balance: prev.balance + amount,
        totalEarned: prev.totalEarned + amount,
      } : null);

      return true;
    } catch (err: any) {
      console.error("Error adding bonuses:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchBonuses();
  }, [fetchBonuses]);

  return {
    balance: bonusData?.balance || 0,
    totalEarned: bonusData?.totalEarned || 0,
    totalSpent: bonusData?.totalSpent || 0,
    isLoading,
    error,
    spendBonuses,
    addBonuses,
    refetch: fetchBonuses,
  };
}
