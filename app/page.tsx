import Link from "next/link";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.2em] text-amber-deep uppercase">
      {children}
    </p>
  );
}

function HeadlineSwash() {
  return (
    <svg
      viewBox="0 0 220 16"
      className="h-3 w-40 sm:w-56 text-amber"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12C40 2 80 2 110 8C140 14 180 14 218 4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CurvedDivider({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 80"
      className={`block w-full text-cream ${flip ? "rotate-180" : ""}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0,0 C480,80 960,80 1440,0 L1440,80 L0,80 Z" fill="currentColor" />
    </svg>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="font-display text-3xl italic text-amber">{n}</span>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-cream">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          AI Opportunity Audit
        </span>
        <Link
          href="/audit"
          className="rounded-full border border-ink/15 px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
        >
          Start your audit
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-cream">
        <div
          aria-hidden="true"
          className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <div className="relative mx-auto w-full max-w-4xl px-6 py-20 text-center sm:px-10 sm:py-28">
          <Eyebrow>AI Opportunity Audit</Eyebrow>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-ink sm:text-6xl">
            Find exactly where AI pays for itself
            <span className="relative mt-1 block text-amber-deep">
              in your business — then we build it.
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0">
                <HeadlineSwash />
              </span>
            </span>
          </h1>
          <h2 className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-ink-soft sm:text-xl">
            A reviews-reading audit of your actual business — not a generic quiz.
            You get a priced, provisional estimate to build it, up front.
          </h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="rounded-full bg-ink px-8 py-4 text-base font-medium text-cream shadow-[0_1px_0_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:bg-espresso hover:shadow-lg"
            >
              Start your free audit
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full px-8 py-4 text-base font-medium text-ink-soft transition-colors hover:text-ink"
            >
              See how it works ↓
            </a>
          </div>
        </div>
      </section>

      <CurvedDivider />

      {/* Positioning pillars */}
      <section className="bg-cream-deep py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 sm:grid-cols-3 sm:px-10">
          {[
            {
              title: "Not another AI quiz",
              body: "No score out of 10, no generic tips. We study your actual business — the reviews-reading, “how did you know that?” moment is the whole point.",
            },
            {
              title: "We build it — we don't sell you tools",
              body: "Every audit ends in something we build for you, not a list of subscriptions to buy and manage yourself.",
            },
            {
              title: "Priced before anything is final",
              body: "You get a provisional estimate straight out of the audit, confirmed on a short discovery call — never a surprise invoice.",
            },
          ].map((pillar) => (
            <div key={pillar.title}>
              <h3 className="font-display text-xl font-semibold text-ink">
                {pillar.title}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-ink-soft">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-10">
          <div className="text-center">
            <Eyebrow>How it works</Eyebrow>
            <p className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Three steps, one sitting.
            </p>
          </div>
          <div className="mt-16 space-y-12">
            {[
              {
                title: "Tell us about your business",
                body: "A couple of quick questions — trade, location, size, your website. Two minutes, not a form.",
              },
              {
                title: "We go and look for ourselves",
                body: "We research your business and your niche for real — your reviews, your site, what actually costs businesses like yours time and money.",
              },
              {
                title: "You get a priced estimate to build it",
                body: "A short report on what we found, and exactly what it costs to fix — provisional until we talk it through on a call.",
              },
            ].map((step, i) => (
              <div key={step.title} className="flex gap-6 sm:gap-8">
                <StepNumber n={i + 1} />
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-[15px] leading-7 text-ink-soft">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA band */}
      <section className="bg-espresso py-20 text-center sm:py-24">
        <div className="mx-auto w-full max-w-2xl px-6 sm:px-10">
          <p className="font-display text-3xl font-semibold text-cream sm:text-4xl">
            See where AI actually pays for itself in your business.
          </p>
          <p className="mt-4 text-[15px] leading-7 text-cream/60">
            Free, provisional, and no pressure — the estimate isn&apos;t final until we
            talk it through together.
          </p>
          <Link
            href="/audit"
            className="mt-8 inline-block rounded-full bg-amber px-8 py-4 text-base font-medium text-espresso transition-all hover:-translate-y-0.5 hover:bg-amber-deep hover:shadow-lg"
          >
            Start your free audit
          </Link>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-10 text-center text-xs text-ink-soft sm:px-10">
        © {new Date().getFullYear()} AI Opportunity Audit. Provisional estimates,
        confirmed on a discovery call before any work begins.
      </footer>
    </div>
  );
}
