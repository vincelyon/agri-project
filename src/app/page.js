import Link from "next/link";
import { getSettings } from "@/services/settings.js";
import { LandingNav } from "@/components/landing/LandingNav.jsx";

export const metadata = {
  title: "Agri-Input Stock Manager",
  description: "Reliable stock tracking for agricultural input shops and farming cooperatives.",
};

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Track every unit",
    text: "Receipts and issues update on-hand balances in one ledger transaction.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Never oversell",
    text: "Stock-out requests above available quantity are rejected automatically.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 20 19H4L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 10v4M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Reorder in time",
    text: "Low and out-of-stock alerts refresh after every movement.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4.5L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Audit-ready history",
    text: "Append-only movements and a searchable activity trail for the shop.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4h10v14l-2-1.5H7V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 9h4M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default async function LandingPage() {
  const settings = await getSettings();
  const brand = settings.shopName || "Agri-Input Stock Manager";
  const shortBrand = brand.length > 28 ? "Agri Stock" : brand;

  return (
    <main className="lp">
      <LandingNav brand={shortBrand} />

      <section className="lp-hero" aria-label="Introduction">
        <div className="lp-hero__media" aria-hidden="true">
          <img
            src="/agri-stock-hero.jpg"
            alt=""
            className="lp-hero__image"
            width={1920}
            height={1080}
            fetchPriority="high"
          />
          <div className="lp-hero__veil" />
        </div>

        <div className="lp-hero__body">
          <p className="lp-hero__eyebrow">Stock ledger for agro-input shops</p>
          <h1 className="lp-hero__brand">
            Agri-Input <em>Stock Manager</em>
          </h1>
          <p className="lp-hero__headline">Know what is on the shelf — every day.</p>
          <p className="lp-hero__support">
            Track fertilizers, seeds, pesticides and farm tools in one digital ledger: receipts,
            issues, reorder alerts and audit history for a single shop or cooperative.
          </p>
          <p className="lp-hero__values">Accurate · Accountable · Always current</p>

          <div className="lp-hero__cta">
            <Link href="/login" className="lp-btn lp-btn--solid">
              Login
            </Link>
          </div>
        </div>

        <div className="lp-hero__features" aria-label="Highlights">
          {FEATURES.map((f) => (
            <article key={f.title} className="lp-hero__feature">
              <span className="lp-hero__feature-icon">{f.icon}</span>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
