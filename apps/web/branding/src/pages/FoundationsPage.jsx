import {
  AlertTriangle,
  Archive,
  BookOpen,
  Check,
  Clock3,
  Eye,
  Map,
  Plus,
  Save,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Star,
  Users
} from "lucide-react";
import { Button, Chip, Field, PageHeader, Panel, Stat } from "../components/Ui.jsx";

const colors = [
  ["Deep Verdant", "#0F2B22"],
  ["Muted Emerald", "#2F6C58"],
  ["Misty Teal", "#2D4F56"],
  ["Moonlit Teal", "#9FC5C3"],
  ["Silverleaf", "#C7CDD1"],
  ["Antique Gold", "#C8A66A"],
  ["Dark Walnut", "#2B1E16"],
  ["Soft Parchment", "#EFE7D5"],
  ["Charcoal Stone", "#1A1D20"]
];

export default function FoundationsPage() {
  return (
    <div className="branding-page">
      <PageHeader
        eyebrow="Approved visual system"
        title="Silverleaf Dark"
        description="A clickable JSX brochure for the final Royal Archive design language. Components here are isolated from production and become the source for later migration."
        actions={<><Button variant="secondary" icon={Eye}>Preview shell</Button><Button icon={Save}>Freeze tokens</Button></>}
      >
        <div className="sl-inline-chips"><Chip tone="success">Approved</Chip><Chip>Dark mode</Chip><Chip tone="gold">Fantasy 7/10</Chip></div>
      </PageHeader>

      <section className="branding-hero-card">
        <div className="branding-hero-card__copy">
          <p className="sl-eyebrow">Royal archive · moonlit sanctuary</p>
          <h2>A premium campaign workspace, not a decorative skin.</h2>
          <p>One layout system. One spacing scale. One component contract. Themes change tokens, assets and atmosphere—never behavior.</p>
          <div className="branding-hero-card__actions">
            <Button icon={Plus}>Create archive entry</Button>
            <Button variant="secondary" icon={BookOpen}>Open journal</Button>
          </div>
        </div>
        <div className="branding-hero-card__ornament" aria-hidden="true">
          <span>✦</span>
          <strong>Silverleaf</strong>
          <small>Noble · Ancient · Organized</small>
        </div>
      </section>

      <div className="branding-grid branding-grid--3">
        <Panel eyebrow="Foundation" title="Palette">
          <div className="token-grid">
            {colors.map(([name, value]) => (
              <div className="token-swatch" key={name}>
                <span style={{ background: value }} />
                <strong>{name}</strong>
                <code>{value}</code>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Primitives" title="Buttons and chips">
          <div className="component-stack">
            <div className="component-row"><Button icon={Plus}>Primary action</Button><Button variant="secondary">Secondary</Button></div>
            <div className="component-row"><Button variant="ghost">Ghost</Button><Button variant="danger">Destructive</Button></div>
            <div className="component-row"><Button size="sm">Small</Button><Button size="lg">Large</Button><Button loading>Loading</Button></div>
            <div className="component-row"><Chip tone="success">Revealed</Chip><Chip tone="warning">Needs review</Chip><Chip tone="danger">GM secret</Chip></div>
          </div>
        </Panel>

        <Panel eyebrow="Forms" title="Inputs and states">
          <div className="component-stack">
            <Field label="Archive title" hint="Used in cards and breadcrumbs"><input className="sl-input" defaultValue="The Shattered Oath" /></Field>
            <Field label="Visibility"><select className="sl-input" defaultValue="revealed"><option value="revealed">Revealed to party</option><option value="gm">GM only</option></select></Field>
            <Field label="Slug" error="Slug must be unique"><input className="sl-input" defaultValue="the-shattered-oath" /></Field>
          </div>
        </Panel>
      </div>

      <div className="branding-grid branding-grid--stats">
        <Stat icon={ScrollText} value="86" label="Archive entries" hint="+7 this month" />
        <Stat icon={Users} value="47" label="Known NPCs" hint="18 allies" />
        <Stat icon={Clock3} value="28" label="Timeline events" hint="4 eras" />
        <Stat icon={Map} value="12" label="Campaign maps" hint="3 revealed" />
      </div>

      <div className="branding-grid branding-grid--2">
        <Panel eyebrow="Pattern" title="Archive entry card" actions={<Button size="sm" variant="ghost">View all</Button>}>
          <article className="archive-card-demo">
            <div className="archive-card-demo__art"><span>☾</span></div>
            <div className="archive-card-demo__body">
              <div className="archive-card-demo__meta"><Chip tone="success">Lore</Chip><span>Updated today</span></div>
              <h3>The Shattered Oath</h3>
              <p>A betrayal buried deep within elven history returns to reshape the alliances of Silverleaf Vale.</p>
              <div className="sl-inline-chips"><Chip>Elves</Chip><Chip>Betrayal</Chip><Chip>First Age</Chip></div>
            </div>
            <button className="archive-card-demo__star" type="button" aria-label="Favorite entry"><Star size={18} /></button>
          </article>
        </Panel>

        <Panel eyebrow="System states" title="Complete state language">
          <div className="state-grid">
            <div className="state-card"><Check size={23} /><strong>Complete</strong><span>Everything is ready.</span></div>
            <div className="state-card"><Archive size={23} /><strong>Empty</strong><span>Create the first entry.</span></div>
            <div className="state-card is-warning"><AlertTriangle size={23} /><strong>Recoverable error</strong><span>Retry without losing context.</span></div>
            <div className="state-card is-danger"><ShieldAlert size={23} /><strong>Forbidden</strong><span>Role-safe and explicit.</span></div>
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Layout contract" title="Expanded and collapsed sidebar are equal first-class states" className="layout-contract">
        <div className="layout-contract__visual">
          <div className="layout-mini-shell is-expanded"><span /><div><i /><i /><i /></div></div>
          <div className="layout-mini-shell is-collapsed"><span /><div><i /><i /><i /></div></div>
        </div>
        <div className="layout-contract__copy">
          <Sparkles size={22} aria-hidden="true" />
          <p>Content uses fluid columns and bounded reading widths. Closing the sidebar gives useful space back to the page; it never stretches text into unreadable lines or turns cards into oversized blocks.</p>
        </div>
      </Panel>
    </div>
  );
}
