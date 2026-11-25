// Test de l'encodage RFC 2822 / base64url (accents, emoji, injection d'en-tête). Lancer : node scripts/test-mime.mjs
import assert from "node:assert/strict";
import { construireMessage, encoderEnTete, encoderMessage } from "../src/lib/mime.ts";

const decodeUrl = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const sujet = "Candidature spontanée : décors, série « Été » 🌅";
const corps = "Bonjour Élise,\nJe vous écris à propos de votre série.\nÀ très bientôt,\nLéa";

// En-tête : mots encodés, décodables, aucun mot > 75 caractères
const h = encoderEnTete(sujet);
const mots = h.split("\r\n ");
for (const m of mots) {
  assert.match(m, /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
  assert.ok(m.length <= 75, `mot trop long (${m.length})`);
}
const decode = mots.map((m) => Buffer.from(m.slice(10, -2), "base64").toString("utf8")).join("");
assert.equal(decode, sujet);
assert.equal(encoderEnTete("Simple sujet ASCII"), "Simple sujet ASCII");
assert.doesNotMatch(encoderEnTete("a\r\nBcc: x@y.fr"), /\r\nBcc/);

// Message texte seul
const brut = encoderMessage({ a: "elise@example.org", sujet, corps });
assert.match(brut, /^[A-Za-z0-9_-]+$/, "base64url : ni +, ni /, ni =");
const msg = decodeUrl(brut).toString("utf8");
assert.match(msg, /^To: elise@example\.org\r\nSubject: =\?UTF-8\?B\?/);
assert.match(msg, /Content-Type: text\/plain; charset=UTF-8/);
const [, corpsB64] = msg.split("\r\n\r\n");
assert.equal(Buffer.from(corpsB64.replace(/\r\n/g, ""), "base64").toString("utf8"), corps.replace(/\n/g, "\r\n"));

// Multipart texte + html, expéditeur accentué
const multi = construireMessage({ a: "elise@example.org", sujet, corps: corps + "\nhttps://exemple.fr/portfolio", de: "lea@example.org", nomDe: "Léa Étoile", html: true, frontiere: "FR" });
assert.match(multi, /From: =\?UTF-8\?B\?[^?]+\?= <lea@example\.org>/);
assert.match(multi, /multipart\/alternative; boundary="FR"/);
assert.match(multi, /--FR\r\nContent-Type: text\/plain; charset=UTF-8/);
assert.match(multi, /--FR\r\nContent-Type: text\/html; charset=UTF-8/);
assert.ok(multi.endsWith("--FR--\r\n"));
const html = multi.split("Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n")[1].split("\r\n--FR--")[0];
const htmlTexte = Buffer.from(html.replace(/\r\n/g, ""), "base64").toString("utf8");
assert.match(htmlTexte, /<a href="https:\/\/exemple\.fr\/portfolio">/);
assert.match(htmlTexte, /Élise/);

assert.throws(() => construireMessage({ a: "pas-une-adresse", sujet: "x", corps: "y" }));
console.log("mime : OK");
