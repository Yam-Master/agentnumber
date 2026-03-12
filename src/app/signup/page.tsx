"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex flex-col items-center gap-3 mb-8">
          <LogoMark size={48} />
          <span className="text-xl font-bold tracking-widest uppercase">
            AGENT<span className="text-accent">[NUMBER]</span>
          </span>
        </Link>

        <div className="border-3 border-border p-8">
          <h1 className="text-lg font-bold uppercase tracking-widest text-center mb-6">
            Create Account
          </h1>

          <button
            onClick={handleGoogleSignup}
            className="w-full border-3 border-border bg-transparent hover:bg-surface text-foreground font-bold py-3 uppercase tracking-wider text-sm transition-colors mb-4"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-foreground uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            <input
              type="email"
              placeholder="EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-foreground/40 text-sm uppercase tracking-wider focus:outline-none focus:border-accent"
            />
            <input
              type="password"
              placeholder="PASSWORD (MIN 6 CHARS)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-foreground/40 text-sm uppercase tracking-wider focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          {error && (
            <p className="text-accent text-sm text-center mt-3">{error}</p>
          )}

          <p className="text-sm text-foreground text-center mt-6 uppercase tracking-wider">
            Have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
