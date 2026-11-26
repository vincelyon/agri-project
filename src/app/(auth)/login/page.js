import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth.js";
import { getSettings } from "@/services/settings.js";
import { loginAction } from "@/app/actions/auth.js";
import { ActionForm, TextField, SubmitButton } from "@/components/forms/ActionForm.jsx";
import { LoginTips } from "@/components/auth/LoginTips.jsx";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const settings = await getSettings();
  const brand = settings.shopName || "Agri-Input Stock Manager";

  return (
    <main className="login-stage">
      <div className="login-stage__bg" aria-hidden="true">
        <img
          src="/agri-stock-hero.jpg"
          alt=""
          className="login-stage__image"
          width={1920}
          height={1080}
        />
        <div className="login-stage__veil" />
      </div>

      <div className="login-card">
        <section className="login-card__form" aria-labelledby="login-heading">
          <div className="login-card__brand">
            <span className="login-card__mark" aria-hidden="true">
              A
            </span>
            <p className="login-card__brand-name">{brand}</p>
          </div>

          <h1 id="login-heading" className="login-card__title">
            Welcome back
          </h1>
          <p className="login-card__subtitle">Sign in to open your shop ledger.</p>

          <ActionForm action={loginAction} submit={null} className="login-form">
            <TextField
              name="email"
              label="Email address"
              type="email"
              autoComplete="username"
              required
              placeholder="you@shop.example"
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
            <SubmitButton className="login-form__submit" pendingLabel="Signing in…">
              Sign in
            </SubmitButton>
          </ActionForm>

          <Link href="/" className="login-card__home">
            ← Back to home
          </Link>
        </section>

        <LoginTips />
      </div>
    </main>
  );
}
