import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Welcome back
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Log in
      </h1>

      <div className="mt-12">
        <LoginForm next={next} />
      </div>

      <p className="mt-10 font-serif text-sm text-oak-gall-soft">
        New here?{" "}
        <Link
          href="/signup"
          className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Sign up as a stagiaire
        </Link>
        .
      </p>
    </div>
  );
}
