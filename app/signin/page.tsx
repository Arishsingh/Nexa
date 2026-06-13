"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function NexaMark({
  size = 28,
  color = "#f2f1ee",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      stroke={color}
      strokeWidth="2.6"
    >
      <circle cx="17" cy="17" r="13.5" />
      <line x1="3.5" y1="17" x2="30.5" y2="17" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/dashboard");
      else setChecking(false);
    });
  }, []);

  async function signInWithGithub() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "read:user repo",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  if (checking) {
    return <div className="min-h-screen" style={{ background: "#000" }} />;
  }

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "#000",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      }}
    >
      <div className="flex flex-col flex-1 min-w-0 px-10 py-10">
        <a href="/" className="flex items-center gap-2.5 mb-auto">
          <NexaMark size={26} />
          <span
            className="text-[18px] font-semibold tracking-tight"
            style={{ color: "#f2f1ee" }}
          >
            Nexa
          </span>
        </a>

        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-sm mx-auto">
          <div className="w-full">
            <h1
              className="text-[26px] font-semibold tracking-[-0.02em] mb-1.5"
              style={{ color: "#f2f1ee" }}
            >
              Welcome back
            </h1>
            <p className="text-[14px] mb-9" style={{ color: "#6e6d68" }}>
              Sign in to explore your repositories.
            </p>

            <button
              onClick={signInWithGithub}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl text-[14.5px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ height: 50, background: "#f2f1ee", color: "#111" }}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
              ) : (
                <GithubIcon />
              )}
              {loading ? "Redirecting…" : "Continue with GitHub"}
            </button>

            <p
              className="text-center text-[12px] mt-6"
              style={{ color: "#3a3936" }}
            >
              By signing in you agree to our{" "}
              <span
                className="underline cursor-pointer"
                style={{ color: "#6e6d68" }}
              >
                Terms
              </span>{" "}
              and{" "}
              <span
                className="underline cursor-pointer"
                style={{ color: "#6e6d68" }}
              >
                Privacy Policy
              </span>
              .
            </p>
          </div>
        </div>

        <p
          className="text-[12px] text-center mt-auto"
          style={{ color: "#3a3936" }}
        >
          © 2026 Nexa
        </p>
      </div>

      <div
        className="hidden lg:block relative flex-1 m-3 rounded-2xl overflow-hidden"
        style={{ maxWidth: "55%" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/signup.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)",
          }}
        />
      </div>
    </div>
  );
}
