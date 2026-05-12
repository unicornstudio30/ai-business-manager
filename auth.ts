import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Comma-separated list of emails allowed to sign in.
// Set ALLOWED_EMAILS in Vercel env vars: "saidur@unicorn-studio.com,you@gmail.com"
const ALLOWED = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      // If no allowlist configured, allow any Google account (only when ALLOWED_EMAILS is empty).
      if (ALLOWED.length === 0) return true;
      return ALLOWED.includes(email);
    },
    async session({ session, token }) {
      if (session.user && token.sub) (session.user as any).id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
});
