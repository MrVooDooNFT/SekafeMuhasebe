import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://godjxtanvfvsecyaujdy.supabase.co";
const supabaseAnonKey = "sb_publishable_kNiW8Smi3732lzo_Xo93Sw_xJem-1I2";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
