import { useState } from "react";
import {
  BookOpen,
  Clock3,
  Eye,
  LayoutDashboard,
  Map,
  MapPin,
  MoreHorizontal,
  Pencil,
  Save,
  Search,
  ScrollText,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";
import {
  ArchiveCard,
  Button,
  Chip,
  DialogCard,
  Field,
  IconButton,
  PageHeader,
  Panel,
  SelectInput,
  SidebarNavItem,
  Stat,
  TableRow,
  Tabs,
  TextareaInput,
  TextInput
} from "../components/Ui.jsx";

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
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="branding-page">
      <PageHeader
        eyebrow="Silverleaf design system"
        title="Silverleaf Dark"
        description="The isolated component workshop for the final Royal Archive interface. Approved components remain locked; review candidates stay here until visual sign-off."
        actions={<><Button variant="secondary" icon={Eye}>Preview Shell</Button><Button variant="secondary" icon={Save}>Freeze Tokens</Button></>}
      >
        <div className="sl-inline-chips"><Chip tone="success">Primary approved</Chip><Chip>Dark mode</Chip><Chip tone="gold">Fantasy interface</Chip></div>
      </PageHeader>

      <section className="branding-hero-card">
        <div className="branding-hero-card__copy">
          <p className="sl-eyebrow">Royal archive · moonlit sanctuary</p>
          <h2>A premium campaign workspace, not a decorative skin.</h2>
          <p>One component grammar, one icon language and one frame system. Pages will be assembled from approved parts rather than restyled individually.</p>
          <div className="branding-hero-card__actions">
            <Button>Create New Entry</Button>
            <Button variant="secondary" icon={BookOpen}>Open Journal</Button>
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
            {colors.map(([name, color]) => (
              <div className="token-swatch" key={name}>
                <span style={{ background: color }} />
                <strong>{name}</strong>
                <code>{color}</code>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Core actions" title="Primary & Secondary">
          <div className="component-stack">
            <div className="component-row"><Button>Create New Entry</Button></div>
            <div className="component-row"><Button variant="secondary" icon={BookOpen}>View Journal</Button></div>
            <div className="sl-component-contract">
              <strong>Primary approved · Secondary v3 review candidate</strong>
              <span>Both actions use the same 248 × 56 px footprint and align perfectly in action groups.</span>
              <span>Secondary keeps a quiet transparent interior and a single restrained hairline frame.</span>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Core forms" title="Text Field & Custom Select">
          <div className="component-stack">
            <Field label="Archive search" hint="Fluid width: shrinks with an open sidebar">
              <TextInput icon={Search} placeholder="Search your archive..." aria-label="Archive search" />
            </Field>
            <Field label="Entry type" hint="Custom listbox: no browser-native white popup">
              <SelectInput defaultValue="lore" aria-label="Entry type">
                <option value="lore">Lore Entry</option>
                <option value="npc">NPC</option>
                <option value="location">Location</option>
              </SelectInput>
            </Field>
            <div className="sl-component-contract">
              <strong>Form shell v3 review candidates</strong>
              <span>Responsive width, one 48 px field height and the same restrained teal-gold hairline.</span>
              <span>The dropdown menu is fully custom and uses the Silverleaf surface, icons and selection state.</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="branding-grid branding-grid--2">
        <Panel eyebrow="Navigation" title="Sidebar Item">
          <div className="sl-core-showcase">
            <div className="sl-sidebar-sample">
              <SidebarNavItem icon={LayoutDashboard}>Dashboard</SidebarNavItem>
              <SidebarNavItem icon={BookOpen} active>Campaign Archive</SidebarNavItem>
              <SidebarNavItem icon={Users}>Characters</SidebarNavItem>
              <SidebarNavItem icon={MapPin}>Locations</SidebarNavItem>
            </div>
            <div className="sl-component-contract">
              <strong>Unified icon and navigation grammar</strong>
              <span>All interface icons use the same 1.45 stroke weight and antique-gold tone.</span>
              <span>The active state relies on atmosphere and a narrow marker instead of a generic rounded block.</span>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Content" title="Archive Card & Chips">
          <ArchiveCard
            icon={Map}
            eyebrow="Location"
            title="Whispering Vale"
            description="A moonlit sanctuary where old roads, ancient promises and forgotten names meet."
            meta={<><span>Updated today</span><span>Public entry</span></>}
          >
            <div className="sl-inline-chips"><Chip tone="success">Exploration</Chip><Chip>Elven</Chip><Chip tone="gold">Ancient</Chip></div>
          </ArchiveCard>
        </Panel>
      </div>

      <div className="branding-grid branding-grid--2">
        <Panel eyebrow="Interaction" title="Tabs, Textarea & Icon Buttons">
          <div className="component-stack">
            <Tabs
              active={activeTab}
              onChange={setActiveTab}
              items={[
                { value: "overview", label: "Overview" },
                { value: "journal", label: "Journal" },
                { value: "relations", label: "Relations" }
              ]}
            />
            <Field label="GM notes" hint="Shared Silverleaf field frame">
              <TextareaInput placeholder="Add private notes, reminders or secrets..." aria-label="GM notes" />
            </Field>
            <div className="component-row">
              <IconButton label="Edit" icon={Pencil} />
              <IconButton label="More actions" icon={MoreHorizontal} active />
              <IconButton label="Delete" icon={Trash2} />
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Dense data" title="Table Row & Dialog">
          <div className="sl-second-layer-grid">
            <div className="sl-table-sample">
              <TableRow
                icon={BookOpen}
                title="The Shattered Oath"
                subtitle="Lore entry · History"
                meta={<Chip tone="success">Revealed</Chip>}
                actions={<IconButton label="More" icon={MoreHorizontal} />}
              />
              <TableRow
                icon={MapPin}
                title="Whispering Vale"
                subtitle="Location · Silverleaf"
                meta={<Chip>Draft</Chip>}
                actions={<IconButton label="Edit" icon={Pencil} />}
              />
            </div>
            <DialogCard
              eyebrow="Destructive action"
              title="Delete Archive Entry?"
              description="The entry will move to Trash and remain recoverable until the campaign archive is emptied."
              actions={<><Button size="sm" variant="ghost">Cancel</Button><Button size="sm" variant="danger">Delete</Button></>}
            />
          </div>
        </Panel>
      </div>

      <div className="branding-grid branding-grid--stats">
        <Stat icon={ScrollText} value="86" label="Archive entries" hint="+7 this month" />
        <Stat icon={Users} value="47" label="Known NPCs" hint="18 allies" />
        <Stat icon={Clock3} value="28" label="Timeline events" hint="4 eras" />
        <Stat icon={Map} value="12" label="Campaign maps" hint="3 revealed" />
      </div>

      <Panel eyebrow="Layout contract" title="Expanded and Collapsed Sidebar Are Equal First-Class States" className="layout-contract">
        <div className="layout-contract__visual">
          <div className="layout-mini-shell is-expanded"><span /><div><i /><i /><i /></div></div>
          <div className="layout-mini-shell is-collapsed"><span /><div><i /><i /><i /></div></div>
        </div>
        <div className="layout-contract__copy">
          <Sparkles size={22} strokeWidth={1.45} aria-hidden="true" />
          <p>Content uses fluid columns and bounded reading widths. Closing the sidebar gives useful space back to the page; it never clips controls or stretches text into unreadable lines.</p>
        </div>
      </Panel>
    </div>
  );
}
