import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Eye,
  Link2,
  LockKeyhole,
  MapPin,
  MoreHorizontal,
  Network,
  Pencil,
  ScrollText,
  Star,
  UserRound
} from "lucide-react";
import {
  Button,
  Chip,
  IconButton,
  Panel,
  SilverleafLeafIcon
} from "../components/Ui.jsx";

const relatedItems = [
  { icon: Archive, title: "The Lost Sentinel", type: "Campaign" },
  { icon: MapPin, title: "Whispering Vale", type: "Location" },
  { icon: Network, title: "The Silverleaf Council", type: "Faction" },
  { icon: UserRound, title: "Lirael Moonwhisper", type: "NPC" },
  { icon: ScrollText, title: "Moonlit Concord", type: "Timeline Event" }
];

const connections = [
  { icon: UserRound, eyebrow: "NPC", title: "Lirael Moonwhisper", subtitle: "Elven guardian" },
  { icon: MapPin, eyebrow: "Location", title: "Silverleaf Conclave", subtitle: "Sacred site" },
  { icon: CalendarDays, eyebrow: "Session", title: "Veiled Truths", subtitle: "May 3, 2025" },
  { icon: ScrollText, eyebrow: "Timeline", title: "The Pact of Veils", subtitle: "~1,200 years ago" }
];

function RelationButton({ icon: Icon, title, type }) {
  return (
    <button type="button" className="lore-related-item">
      <span><Icon size={17} strokeWidth={1.35} aria-hidden="true" /></span>
      <strong>{title}</strong>
      <small>{type}</small>
      <ChevronRight size={15} strokeWidth={1.35} aria-hidden="true" />
    </button>
  );
}

export default function LoreEntryPage() {
  return (
    <div className="lore-entry-page">
      <header className="lore-entry-heading">
        <div className="lore-entry-heading__copy">
          <p className="sl-eyebrow">Lore entry · revealed record</p>
          <h1>The Shattered Oath</h1>
          <p className="lore-entry-heading__subtitle">A betrayal buried deep within elven history.</p>
          <div className="lore-entry-heading__meta">
            <Chip tone="success">Lore</Chip>
            <Chip tone="gold"><Eye size={13} strokeWidth={1.4} /> Revealed to Party</Chip>
            <span><CalendarDays size={14} strokeWidth={1.35} /> Updated May 10, 2025</span>
            <span><UserRound size={14} strokeWidth={1.35} /> by DM Lirael</span>
            <span><BookOpen size={14} strokeWidth={1.35} /> History</span>
          </div>
        </div>
        <div className="lore-entry-heading__actions">
          <IconButton label="Favorite entry" icon={Star} />
          <IconButton label="More entry actions" icon={MoreHorizontal} />
        </div>
      </header>

      <div className="lore-entry-layout">
        <main className="lore-entry-main">
          <section className="lore-entry-hero" aria-label="Moonlit ruins of the Silverleaf sanctuary">
            <span className="lore-entry-hero__moon" />
            <span className="lore-entry-hero__horizon" />
            <span className="lore-entry-hero__arch lore-entry-hero__arch--left" />
            <span className="lore-entry-hero__arch lore-entry-hero__arch--center" />
            <span className="lore-entry-hero__arch lore-entry-hero__arch--right" />
            <span className="lore-entry-hero__reflection" />
            <div className="lore-entry-hero__caption">
              <SilverleafLeafIcon size={19} />
              <span>Ruins of Velianis · Whispering Vale</span>
            </div>
          </section>

          <article className="lore-entry-prose">
            <p className="lore-entry-lead">
              <span className="lore-entry-dropcap">I</span>
              n the twilight of the First Age, the elven realm of Silverleaf stood as a beacon of harmony between nature and magic. Yet even in that age of grace, pride took root—and with it, the seeds of ruin.
            </p>
            <p>
              The Shattered Oath was not born of open war, but of a secret accord—an oath sworn in silence by those who believed the ends would justify the means. When that oath was broken, it fractured not only alliances, but the very soul of a people.
            </p>

            <blockquote className="lore-entry-quote">
              <span>“</span>
              <div>
                <p>Better a broken promise than a broken world.</p>
                <cite>— Inscription found in the ruins of Velianis</cite>
              </div>
            </blockquote>

            <section className="lore-entry-section">
              <div className="lore-entry-section__title">
                <span />
                <h2>The Pact of Veils</h2>
                <span />
              </div>
              <p>
                The Pact of Veils was a clandestine agreement between the Silverleaf Council and shadowed emissaries from the Moon-Touched Court. Its purpose: to seal away an ancient threat lurking beneath the Whispering Vale.
              </p>
              <p>
                In exchange for their aid, the Council promised to turn a blind eye to certain “necessary” acts—acts that bent the natural order and sowed discord among kin.
              </p>
            </section>

            <aside className="lore-entry-callout">
              <span className="lore-entry-callout__sigil"><SilverleafLeafIcon size={28} /></span>
              <div>
                <p className="sl-eyebrow">The cost of secrets</p>
                <h3>A truth preserved at the price of memory</h3>
                <p>The Pact held for centuries, but its cost was hidden in plain sight. Entire lineages were sacrificed, memories were erased, and the truth buried beneath generations of carefully woven lies.</p>
              </div>
            </aside>

            <div className="lore-entry-taxonomy">
              <span><MapPin size={16} strokeWidth={1.35} /><small>Region</small><strong>Silverleaf Vale</strong></span>
              <span><Network size={16} strokeWidth={1.35} /><small>Faction</small><strong>Silverleaf Council</strong></span>
              <span><Clock3 size={16} strokeWidth={1.35} /><small>Era</small><strong>First Age</strong></span>
              <span><LockKeyhole size={16} strokeWidth={1.35} /><small>Danger</small><strong>High</strong></span>
              <span><BookOpen size={16} strokeWidth={1.35} /><small>Theme</small><strong>Betrayal</strong></span>
            </div>
          </article>

          <section className="lore-connections">
            <div className="lore-connections__heading">
              <p className="sl-eyebrow">Connections</p>
              <Button variant="secondary" size="sm" icon={Network}>View All</Button>
            </div>
            <div className="lore-connections__grid">
              {connections.map(({ icon: Icon, eyebrow, title, subtitle }) => (
                <button type="button" className="lore-connection-card" key={title}>
                  <span className="lore-connection-card__icon"><Icon size={21} strokeWidth={1.3} /></span>
                  <span>
                    <small>{eyebrow}</small>
                    <strong>{title}</strong>
                    <em>{subtitle}</em>
                  </span>
                  <ChevronRight size={15} strokeWidth={1.35} />
                </button>
              ))}
            </div>
          </section>
        </main>

        <aside className="lore-entry-sidebar">
          <Panel eyebrow="Actions" title="Entry Controls" className="lore-actions-panel">
            <div className="lore-action-stack">
              <Button icon={Pencil}>Edit Entry</Button>
              <div className="lore-action-grid">
                <Button variant="secondary" size="sm" icon={Eye}>Reveal</Button>
                <Button variant="secondary" size="sm" icon={Link2}>Copy Link</Button>
                <Button variant="secondary" size="sm" icon={BookOpen}>Journal</Button>
                <Button variant="secondary" size="sm" icon={Network}>Relations</Button>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Related content" title="Known Connections" className="lore-related-panel">
            <div className="lore-related-list">
              {relatedItems.map((item) => <RelationButton key={item.title} {...item} />)}
            </div>
          </Panel>

          <Panel eyebrow="Entry details" title="Archive Record" className="lore-details-panel">
            <dl className="lore-detail-list">
              <div><dt>Type</dt><dd>Lore</dd></div>
              <div><dt>Visibility</dt><dd><Eye size={14} strokeWidth={1.35} /> Revealed</dd></div>
              <div><dt>Created</dt><dd>Apr 28, 2025</dd></div>
              <div><dt>Updated</dt><dd>May 10, 2025</dd></div>
              <div><dt>Word count</dt><dd>1,024 words</dd></div>
            </dl>
            <div className="sl-inline-chips">
              <Chip tone="success">Elves</Chip>
              <Chip tone="gold">Betrayal</Chip>
              <Chip>Ancient</Chip>
            </div>
          </Panel>

          <section className="lore-secret-panel">
            <header>
              <div>
                <p className="sl-eyebrow">GM notes</p>
                <h2>Secret Record</h2>
              </div>
              <LockKeyhole size={20} strokeWidth={1.35} />
            </header>
            <p>The full truth is darker than what the party knows. The Moon-Touched Court demanded more than secrecy—they demanded blood.</p>
            <p>The truth about the Vale’s guardian will be a future reveal.</p>
            <small>Hidden from players</small>
          </section>
        </aside>
      </div>
    </div>
  );
}
