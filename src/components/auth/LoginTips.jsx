"use client";

import { useState } from "react";

const TIPS = [
  {
    title: "Know what is on the shelf",
    lead: "Stock in. Stock out. One ledger.",
    body: "Record receipts and issues as they happen so on-hand balances stay honest for every fertilizer bag, seed lot and farm tool.",
    callout: "Balances update with every movement",
  },
  {
    title: "Never oversell by accident",
    lead: "Available quantity, enforced.",
    body: "Issues above what you have on hand are rejected automatically — protecting the counter and the next customer.",
    callout: "Stock-outs blocked at the source",
  },
  {
    title: "Reorder before the shelf goes empty",
    lead: "Alerts that refresh with the ledger.",
    body: "Low and out-of-stock signals update after every receipt and issue so you can restock in time.",
    callout: "Act on low stock early",
  },
  {
    title: "Audit-ready history",
    lead: "Every movement leaves a trail.",
    body: "Append-only stock events and a searchable activity log keep the shop accountable for later review.",
    callout: "Corrections need a reason",
  },
];

export function LoginTips() {
  const [index, setIndex] = useState(0);
  const tip = TIPS[index];
  const total = TIPS.length;

  function prev() {
    setIndex((i) => (i - 1 + total) % total);
  }

  function next() {
    setIndex((i) => (i + 1) % total);
  }

  return (
    <aside className="login-card__tips" aria-label="Stock tips">
      <div className="login-card__tips-top">
        <span className="login-card__tips-tag">Stock tips</span>
        <span className="login-card__tips-count">
          {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </span>
      </div>

      <div key={index} className="login-card__tips-body">
        <h2>{tip.title}</h2>
        <p className="login-card__tips-lead">{tip.lead}</p>
        <p className="login-card__tips-text">{tip.body}</p>
      </div>

      <div className="login-card__tips-nav">
        <button type="button" className="login-card__tips-arrow" onClick={prev} aria-label="Previous tip">
          ‹
        </button>
        <div className="login-card__tips-dots" role="tablist" aria-label="Tip slides">
          {TIPS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Tip ${i + 1}`}
              className={`login-card__tips-dot ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button type="button" className="login-card__tips-arrow" onClick={next} aria-label="Next tip">
          ›
        </button>
      </div>

      <div className="login-card__callout">
        <span className="login-card__callout-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <p>{tip.callout}</p>
      </div>
    </aside>
  );
}
