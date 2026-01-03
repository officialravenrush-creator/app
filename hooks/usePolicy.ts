import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export function usePolicy(slug: string) {
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("policy_documents")
        .select("id,title,content,version,effective_from")
        .eq("slug", slug)
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Policy fetch error:", error);
      }

      setPolicy(data);
      setLoading(false);
    })();
  }, [slug]);

  return { policy, loading };
}

