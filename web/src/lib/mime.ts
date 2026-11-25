// Encodage d'un mail en RFC 2822 puis base64url, pour l'API Gmail (drafts.create et messages.send).
// Sans dépendance : tourne dans le navigateur et sous Node (voir web/scripts/test-mime.mjs).

const enc = new TextEncoder();

export function base64(octets: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** base64url sans remplissage, comme l'exige le champ `raw` de l'API Gmail. */
export function base64url(octets: Uint8Array): string {
  return base64(octets).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const base64urlTexte = (t: string) => base64url(enc.encode(t));

/** Retire les sauts de ligne : empêche l'injection d'en-têtes dans un sujet ou une adresse collés. */
const uneLigne = (t: string) => t.replace(/[\r\n]+/g, " ").trim();

const ASCII_SUR = /^[\x20-\x7e]*$/;

/**
 * En-tête non ASCII : mots encodés `=?UTF-8?B?…?=` (RFC 2047). Chaque mot reste sous 75 caractères
 * et ne coupe jamais un caractère en deux (découpe par point de code).
 */
export function encoderEnTete(texte: string): string {
  const t = uneLigne(texte);
  if (ASCII_SUR.test(t)) return t;
  const mots: string[] = [];
  let courant = "";
  const ferme = () => {
    if (courant) mots.push(`=?UTF-8?B?${base64(enc.encode(courant))}?=`);
    courant = "";
  };
  for (const ch of t) {
    if (enc.encode(courant + ch).length > 42) ferme(); // 42 octets -> 56 caractères base64 : large marge sous 75
    courant += ch;
  }
  ferme();
  return mots.join("\r\n ");
}

/** Corps encodé en base64, lignes de 76 caractères. */
function corpsBase64(texte: string): string {
  return (base64(enc.encode(texte.replace(/\r?\n/g, "\r\n"))).match(/.{1,76}/g) ?? []).join("\r\n");
}

const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Rendu HTML simple d'un texte brut : paragraphes, retours à la ligne, liens cliquables. */
export function texteVersHtml(texte: string): string {
  const corps = echapper(texte.replace(/\r\n/g, "\n"))
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1">$1</a>')
    .replace(/\n/g, "<br>\r\n");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">${corps}</div>`;
}

export interface MailBrut {
  a: string;
  sujet: string;
  corps: string;
  /** Adresse d'envoi affichée ; Gmail ne la garde que si c'est l'adresse du compte ou un alias vérifié. */
  de?: string;
  nomDe?: string;
  html?: boolean;
  /** Fixe la frontière multipart (tests). */
  frontiere?: string;
}

export const adresseValide = (a: string) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(a.trim());

function adresseEnTete(adresse: string, nom?: string): string {
  const a = uneLigne(adresse);
  const n = nom ? uneLigne(nom) : "";
  if (!n) return a;
  return ASCII_SUR.test(n) ? `"${n.replace(/["\\]/g, "")}" <${a}>` : `${encoderEnTete(n)} <${a}>`;
}

/** Message RFC 2822 complet (en-têtes + corps), lignes terminées par CRLF. */
export function construireMessage(m: MailBrut): string {
  if (!adresseValide(m.a)) throw new Error("Adresse du destinataire invalide.");
  const en: string[] = [];
  if (m.de && adresseValide(m.de)) en.push(`From: ${adresseEnTete(m.de, m.nomDe)}`);
  en.push(`To: ${uneLigne(m.a)}`, `Subject: ${encoderEnTete(m.sujet)}`, "MIME-Version: 1.0");
  if (!m.html) {
    en.push("Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64");
    return `${en.join("\r\n")}\r\n\r\n${corpsBase64(m.corps)}\r\n`;
  }
  const f = m.frontiere ?? `=_va_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  en.push(`Content-Type: multipart/alternative; boundary="${f}"`);
  const partie = (type: string, texte: string) =>
    `--${f}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${corpsBase64(texte)}\r\n`;
  return `${en.join("\r\n")}\r\n\r\n${partie("text/plain", m.corps)}${partie("text/html", texteVersHtml(m.corps))}--${f}--\r\n`;
}

/** Valeur du champ `raw` de l'API Gmail. */
export const encoderMessage = (m: MailBrut) => base64urlTexte(construireMessage(m));
