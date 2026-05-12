import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <form
          action={async () => {
            "use server";
            const sp = await searchParams;
            await signIn("google", { redirectTo: sp.from || "/" });
          }}
          className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm"
        >
          <div className="text-center mb-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Unicorn Studio</div>
            <h1 className="text-2xl font-semibold text-stone-900">AI Business Manager</h1>
            <p className="text-sm text-stone-600 mt-2">
              Sign in with the Google account on the allowlist.
            </p>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-md bg-stone-900 px-4 py-3 text-sm font-medium text-white hover:bg-stone-800"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" />
            </svg>
            Continue with Google
          </button>
          <p className="text-xs text-stone-500 text-center mt-4">
            If your email isn&apos;t allowlisted, sign-in will fail silently.
          </p>
        </form>
      </div>
    </div>
  );
}
