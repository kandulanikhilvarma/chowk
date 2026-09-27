// Runs before first paint so a saved theme never flashes the wrong colors.
// It has to stay inline: an external file would land after the first paint.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

// script-src allows this one inline script by hash, not by nonce. A nonce would force every
// page into dynamic rendering, because a per-request value cannot be baked into static HTML.
// tests/unit/csp.test.ts recomputes the digest and fails if the script above changes.
export const THEME_SCRIPT_HASH = "sha256-V5qJba2Pfl34pHXr5tflSMB61vARUx4poZzLZG+ElkI=";
