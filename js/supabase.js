// Supabase connection

const SUPABASE_URL = 'https://tmdqjsbpgpvpwqryckcb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eqidn56P_QNeWZ2ivnicKw_l7SHccTf';

const sb = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
