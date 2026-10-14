import { getDb } from "./db/client.ts";

/** Small key/value store in the database (not secrets: those stay in files with mode 600). */
export function getSetting(key: string): string | undefined {
  const r = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return r?.value;
}
export function setSetting(key: string, value: string) {
  getDb().prepare("INSERT INTO settings (key, value, updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(key, value, new Date().toISOString());
}
export function deleteSetting(key: string) {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}

/** Brimlo (@brimloidle). Used until you pick another channel in the dashboard or with own_channel_set. */
export const DEFAULT_OWN_CHANNEL_ID = "UCXf8abbaSiOThD3YhX8nGjQ";

/** Your channel: env YOUTUBE_OWN_CHANNEL > dashboard/own_channel_set choice > default. */
export const ownChannelId = () => process.env.YOUTUBE_OWN_CHANNEL?.trim() || getSetting("own_channel_id") || DEFAULT_OWN_CHANNEL_ID;

export const YPP = { subs: 1000, watchHours: 8000 };
