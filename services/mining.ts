import { supabase } from "../supabase/client";

export async function startMining(userId: string) {
  await supabase.from("mining_data")
    .update({
      mining_active: true,
      last_start: new Date()
    })
    .eq("user_id", userId);
}

export async function stopMining(userId: string) {
  await supabase.from("mining_data")
    .update({
      mining_active: false
    })
    .eq("user_id", userId);
}
