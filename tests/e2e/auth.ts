import { createServerClient } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";

// Posting and chatting need real accounts. The two test accounts are email and password users made in the
// Supabase dashboard (Authentication > Users > Add user, auto confirm). Their details live in .env.local only.
const accounts = {
  seller: { email: process.env.E2E_SELLER_EMAIL, password: process.env.E2E_SELLER_PASSWORD },
  buyer: { email: process.env.E2E_BUYER_EMAIL, password: process.env.E2E_BUYER_PASSWORD },
};

export const hasTestAccounts = Object.values(accounts).every((a) => a.email && a.password);

// Signs in with the same cookie code the app uses, then hands those cookies to the browser.
export async function signIn(context: BrowserContext, who: keyof typeof accounts, baseURL: string) {
  const jar = new Map<string, string>();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { email, password } = accounts[who];
  const { error } = await supabase.auth.signInWithPassword({ email: email!, password: password! });
  if (error) throw new Error(`test sign-in for ${who} failed: ${error.message}`);
  await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: baseURL })));
}
