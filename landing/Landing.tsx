import { Blocks, GitBranch, History, Table2, FolderTree } from "lucide-react";

const FEATURES = [
  {
    icon: Blocks,
    title: "Block editor",
    body: "Headings, lists, checkboxes, callouts, code and embeds, composed the way you'd write on paper instead of fighting a toolbar.",
  },
  {
    icon: FolderTree,
    title: "Nested pages",
    body: "Pages live inside pages, as deep as a thought needs to go. Nothing is flattened into a single endless document.",
  },
  {
    icon: Table2,
    title: "Databases",
    body: "Turn any page into a table or a board the moment a list starts wanting to become a system.",
  },
  {
    icon: GitBranch,
    title: "Backlinks & graph",
    body: "See every page that mentions this one, and the shape of your whole notebook at a glance.",
  },
  {
    icon: History,
    title: "History & backups",
    body: "Every page remembers where it's been. Export a full, readable backup whenever you like.",
  },
];

export function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-wrap landing-header__inner">
          <a className="landing-wordmark" href="#top">Notes</a>
          <nav className="landing-nav" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#inside">Inside the notebook</a>
          </nav>
          <a className="btn btn--primary landing-cta" href="/app/">Open Notes</a>
        </div>
      </header>

      <main id="top">
        <section className="landing-hero landing-wrap">
          <h1 className="landing-headline">Write it down. Keep it yours.</h1>
          <p className="landing-lede">
            A block editor, nested pages, databases, backlinks and a graph of how your ideas
            connect. Stored on this machine first, synced only if you choose.
          </p>
          <div className="landing-cta-row">
            <a className="btn btn--primary" href="/app/">Open Notes</a>
            <a className="btn btn--outline" href="#inside">See how it works</a>
          </div>
        </section>

        <section className="landing-mockup-stage landing-wrap" id="inside">
          <div className="landing-mockup-glow" aria-hidden="true" />
          <div className="landing-mockup-frame">
            <iframe
              className="landing-mockup"
              title="Notes, open to a sample notebook"
              src="/app/?demo=1&page=demo-page-daily-journal"
            />
          </div>
        </section>

        <section className="landing-band" id="features">
          <div className="landing-wrap">
            <h2 className="landing-section-title">Everything a notebook should do, nothing it shouldn't.</h2>
            <ul className="landing-features">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="landing-feature">
                  <span className="landing-feature__icon"><Icon size={18} /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-band landing-band--cta">
          <div className="landing-wrap landing-cta-section">
            <h2 className="landing-section-title center">Start your notebook.</h2>
            <p className="landing-lede center">Free, local-first, and yours to keep. Sync later if you want to.</p>
            <div className="landing-cta-row center">
              <a className="btn btn--primary" href="/app/">Open Notes</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer__inner">
          <span className="landing-wordmark">Notes</span>
          <p>A quiet place to think.</p>
        </div>
      </footer>
    </div>
  );
}
