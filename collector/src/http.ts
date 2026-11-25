import robotsParser from "robots-parser";

export const USER_AGENT = "veille-animation/1.0 (usage personnel)";
const INTERVALLE_MS = 3000;
const TIMEOUT_MS = 20000;

const dernierAppel = new Map<string, number>();
const robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>();
const pageCache = new Map<string, string>();

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Une requête toutes les 3 s par domaine. */
export async function attendreTour(url: string): Promise<void> {
  const hote = new URL(url).host;
  const prochain = (dernierAppel.get(hote) ?? 0) + INTERVALLE_MS;
  const attente = prochain - Date.now();
  // réserve le créneau avant d'attendre, pour que des appels concurrents s'étalent
  dernierAppel.set(hote, Math.max(prochain, Date.now()));
  if (attente > 0) await dormir(attente);
}

async function brut(url: string, accept = "*/*"): Promise<Response> {
  await attendreTour(url);
  return fetch(url, {
    headers: { "user-agent": USER_AGENT, accept, "accept-language": "fr,en;q=0.8" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
}

export async function robotsAutorise(url: string): Promise<boolean> {
  const origine = new URL(url).origin;
  if (!robotsCache.has(origine)) {
    try {
      const res = await brut(`${origine}/robots.txt`, "text/plain");
      if (res.status >= 500) robotsCache.set(origine, robotsParser(`${origine}/robots.txt`, "User-agent: *\nDisallow: /"));
      else if (!res.ok) robotsCache.set(origine, null); // 4xx : pas de robots.txt, tout est permis (RFC 9309)
      else robotsCache.set(origine, robotsParser(`${origine}/robots.txt`, await res.text()));
    } catch {
      robotsCache.set(origine, null);
    }
  }
  const r = robotsCache.get(origine);
  return r ? r.isAllowed(url, USER_AGENT) !== false : true;
}

/** Récupère une page en respectant robots.txt, le rythme par domaine et un timeout. */
export async function recupererTexte(url: string): Promise<string> {
  const cache = pageCache.get(url);
  if (cache !== undefined) return cache;
  if (!(await robotsAutorise(url))) throw new Error("interdit par robots.txt");
  const res = await brut(url, "text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.5");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const texte = await res.text();
  pageCache.set(url, texte);
  return texte;
}
