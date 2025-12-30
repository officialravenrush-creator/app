import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useAuth } from "./useAuth";

export function usePrivacyPolicy() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("policy_acceptance")
        .select("*")
        .eq("user_id", user.id)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .single();

      if (!data || new Date(data.expires_at) < new Date()) {
        setRequired(true);
      }

      setLoading(false);
    })();
  }, [user]);

  const accept = async () => {
    if (!user) return;

    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + 7);

    await supabase.from("policy_acceptance").insert({
      user_id: user.id,
      accepted_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    setRequired(false);
  };

  const reject = async () => {
    await supabase.auth.signOut();
  };

  return {
    loading,
    required,
    accept,
    reject,
  };
}
