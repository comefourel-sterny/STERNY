// Configuration Supabase
const SUPABASE_URL = 'https://rkffpmuhyvwwgfbdqmqr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZmZwbXVoeXZ3d2dmYmRxbXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjkwMjksImV4cCI6MjA4Njc0NTAyOX0.v9gbwYukkXxDBWzGZTrEQkmZfy_lRtDamgmKYSSV2yI';

// Configuration Stripe (clé publique — mode test)
// Remplacer par ta clé pk_test_... depuis https://dashboard.stripe.com/test/apikeys
const STRIPE_PUBLIC_KEY = 'pk_test_51T869KAVZJvO2mcMCLiJ0xzOHzfAoKTPgjCabvWasBzvAeTvUq6BK04xDvRKAsJR2RNNj8sJ692Fg4Q9CoCM3CeZ00ZCQCXkiZ';

// Configuration Mapbox
const MAPBOX_TOKEN = 'pk.eyJ1IjoiY29tZWZvdXJlbCIsImEiOiJjbWx2Mmo4Nm4wMzJvM2NzYW5qYjNiMDAxIn0.9cGaskeyo5VLTt4kbeO95g';

// Ne change rien en dessous
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);