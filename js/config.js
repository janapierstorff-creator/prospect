// Supabase-Zugangsdaten für die Warteliste.
// Zu finden in Supabase unter: Project Settings → API.
// Der "anon public" Key darf öffentlich sein: Die Tabelle erlaubt per Row Level Security
// nur das Eintragen, nicht das Lesen (siehe supabase/schema.sql).
// Solange die Felder leer sind, laufen die Formulare im Testmodus (nichts wird gespeichert).
window.PF_CONFIG = {
  supabaseUrl: "https://jtzgzudoywtzryigtdgk.supabase.co",
  supabaseAnonKey: "sb_publishable_hfRrPenW5LGiwSWcS_Mlxg_O4PlfFWc",
  table: "waitlist"
};
