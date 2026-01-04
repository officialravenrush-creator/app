import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export function usePolicy(slug: string) {
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPolicy = async () => {
      console.log("[policy] fetching:", slug);
      setLoading(true);

      const { data, error } = await supabase
        .from("policy_documents")
        .select("id,title,content,version,effective_from")
        .eq("slug", slug)
        .eq("is_active", true)
        .single(); // ✅ simpler, deterministic

      if (cancelled) return;

      if (error) {
        console.error("[policy] error:", error.message);
        setPolicy(null);
      } else {
        console.log("[policy] loaded version:", data.version);
        setPolicy(data);
      }

      setLoading(false);
    };

    fetchPolicy();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { policy, loading };
}
