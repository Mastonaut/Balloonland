// Generator js/maske.js iz SVG maski — pokreni nakon svake izmjene maski:
//   node napravi-maske.mjs
// Ugrađene maske omogućavaju da kreator radi i kad se sajt otvori direktno
// iz foldera (file://), gdje browser blokira fetch().
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dir = "img/kreator";
const out = {};
for (const f of readdirSync(dir)) {
  if (f.endsWith("-mask.svg")) {
    const key = f.replace("-mask.svg", "");
    out[key] = readFileSync(join(dir, f), "utf8");
    console.log("ugrađena maska:", key);
  }
}
writeFileSync(
  "js/maske.js",
  "// AUTOMATSKI GENERISANO — ne uređuj ručno. Pokreni: node napravi-maske.mjs\n" +
  "window.KREATOR_MASKE = " + JSON.stringify(out) + ";\n"
);
console.log("js/maske.js zapisan (" + Object.keys(out).length + " maski)");
