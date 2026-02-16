// Configuration Supabase
const SUPABASE_URL = 'https://cvtpuusnzziqfdgbmiph.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dHB1dXNuenppcWZkZ2JtaXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzUyMzYsImV4cCI6MjA4NDI1MTIzNn0.qct2yYT2frzdOs04ma-NLYsP4Y0MbLTg9FfLiXgFqvo';

// Ne change rien en dessous
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);