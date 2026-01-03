import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";
import { useAuth } from "./useAuth";

export function usePolicy(slug: string) {
  const { loading: authLoading } = useAuth(); // 👈 KEY LINE
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // 🔥 DO NOT QUERY YET

    let cancelled = false;

    const fetchPolicy = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("policy_documents")
        .select("id,title,content,version,effective_from")
        .eq("slug", slug)
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .single(); // 👈 IMPORTANT (not maybeSingle)

      if (!cancelled) {
        if (error) {
          console.error("Policy fetch error:", error);
          setPolicy(null);
        } else {
          setPolicy(data);
        }
        setLoading(false);
      }
    };

    fetchPolicy();

    return () => {
      cancelled = true;
    };
  }, [slug, authLoading]);

  return { policy, loading };
}
