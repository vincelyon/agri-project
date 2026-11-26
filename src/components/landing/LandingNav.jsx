import Link from "next/link";

export function LandingNav({ brand }) {
  return (
    <header className="lp-nav lp-nav--simple">
      <div className="lp-nav__brand">
        <span className="lp-nav__mark" aria-hidden="true">
          A
        </span>
        <span className="lp-nav__name">{brand}</span>
      </div>
      <Link href="/login" className="lp-nav__login">
        Login
      </Link>
    </header>
  );
}
