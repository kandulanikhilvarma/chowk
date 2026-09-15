// Items Chowk does not allow (see /terms). Checked on the post form and again in the server action.
// ponytail: keyword list with an allow list for common false hits. It stops honest mistakes, not
// determined sellers; reports and the admin queue catch the rest.
const GROUPS: Record<string, string[]> = {
  weapons: ["gun", "guns", "pistol", "revolver", "rifle", "shotgun", "firearm", "bullets", "ammunition", "cartridges", "katta", "desi katta"],
  drugs: ["ganja", "charas", "weed", "marijuana", "cannabis", "cocaine", "heroin", "mdma", "lsd", "opium", "afeem", "smack"],
  "protected wildlife": ["ivory", "elephant tusk", "tiger skin", "tiger claw", "leopard skin", "rhino horn", "pangolin", "star tortoise", "hathi dant"],
  "prescription medicine": ["codeine", "tramadol", "alprazolam", "nitrazepam", "sleeping pills", "oxytocin", "steroids", "mifepristone"],
  "fake or copied goods": ["first copy", "master copy", "replica", "7a quality", "fake id", "fake certificate", "fake notes", "clone phone"],
};

const ALLOW = [
  "toy gun", "water gun", "nerf gun", "glue gun", "massage gun", "spray gun", "gun metal", "ink cartridges",
  "toner cartridges", "weed remover", "weed killer", "weed trimmer",
];

const normalize = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

export function findProhibited(text: string): { group: string; term: string } | null {
  let t = normalize(text);
  for (const phrase of ALLOW) t = t.replaceAll(` ${phrase} `, " ");
  for (const [group, terms] of Object.entries(GROUPS)) {
    const term = terms.find((w) => t.includes(` ${w} `));
    if (term) return { group, term };
  }
  return null;
}
