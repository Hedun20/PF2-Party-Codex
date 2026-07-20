import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  ImagePlus,
  Link2,
  Map,
  MapPin,
  Network,
  Plus,
  Save,
  ScrollText,
  Sparkles,
  Tag,
  UserRound,
  X
} from "lucide-react";
import {
  Button,
  Chip,
  Field,
  IconButton,
  Panel,
  SelectInput,
  TextareaInput,
  TextInput
} from "../components/Ui.jsx";

const facts = [
  "Pact of Veils signed in secret",
  "Silence bound the allied houses",
  "Breaking the oath caused the Sundering"
];

const entities = [
  { icon: Network, title: "Silverleaf Council", type: "Faction" },
  { icon: UserRound, title: "Lirael Moonwhisper", type: "NPC" },
  { icon: Network, title: "Moon-Touched Court", type: "Faction" }
];

const references = [
  { icon: ScrollText, label: "Timeline", title: "The Pact of Veils" },
  { icon: Map, label: "Map", title: "Whispering Vale" },
  { icon: BookOpen, label: "Session", title: "Session 10: Veiled Truths" }
];

function CompactRelation({ icon: Icon, title, meta, onRemove }) {
  return (
    <div className="entry-editor-relation">
      <span><Icon size={16} strokeWidth={1.35} /></span>
      <strong>{title}</strong>
      {meta ? <small>{meta}</small> : null}
      <button type="button" aria-label={`Remove ${title}`} onClick={onRemove}><X size={14} strokeWidth={1.4} /></button>
    </div>
  );
}

export default function CreateEntryPage() {
  const [title, setTitle] = useState("The Shattered Oath");
  const [summary, setSummary] = useState("A betrayal buried deep within elven history.");
  const [body, setBody] = useState("In the twilight of the First Age, the elven realm of Silverleaf stood as a beacon of harmony between nature and magic. Yet even in that age of grace, pride took root—and with it, the seeds of ruin.\n\nThe Shattered Oath was not born of open war, but of a secret accord—an oath sworn in silence by those who believed the ends would justify the means. When that oath was broken, it fractured not only alliances, but the very soul of a people.\n\n“Better a broken promise than a broken world.”\n\nThe Pact of Veils was a clandestine agreement between the Silverleaf Council and shadowed emissaries from the Moon-Touched Court.");
  const [visibility, setVisibility] = useState("revealed");
  const [tags, setTags] = useState(["Elves", "Betrayal", "Ancient"]);
  const slug = useMemo(() => title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), [title]);
  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);

  return (
    <div className="entry-editor-page">
      <header className="entry-editor-heading">
        <div>
          <p className="sl-eyebrow">Campaign Archive · new record</p>
          <h1>Create Archive Entry</h1>
          <p>Record the legends, people, and places of your world.</p>
        </div>
        <div className="entry-editor-heading__actions">
          <Button variant="secondary">Cancel</Button>
          <Button variant="secondary" icon={Save}>Save Draft</Button>
          <Button icon={Sparkles}>Publish Entry</Button>
        </div>
      </header>

      <div className="entry-editor-layout">
        <main className="entry-editor-main">
          <Panel eyebrow="Archive identity" title="Record Details" className="entry-editor-identity">
            <div className="entry-editor-fields entry-editor-fields--identity">
              <Field label="Title">
                <TextInput value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Entry title" />
              </Field>
              <Field label="Slug / Identifier" hint="Generated from the title">
                <TextInput value={slug} readOnly aria-label="Entry slug" />
              </Field>
              <Field label="Entry Type">
                <SelectInput defaultValue="lore" aria-label="Entry type">
                  <option value="lore">Lore</option>
                  <option value="npc">NPC</option>
                  <option value="location">Location</option>
                  <option value="faction">Faction</option>
                </SelectInput>
              </Field>
              <Field label="Category">
                <SelectInput defaultValue="history" aria-label="Entry category">
                  <option value="history">History</option>
                  <option value="culture">Culture</option>
                  <option value="mystery">Mystery</option>
                  <option value="religion">Religion</option>
                </SelectInput>
              </Field>
              <Field label="World">
                <SelectInput defaultValue="silverleaf" aria-label="Entry world">
                  <option value="silverleaf">Silverleaf Vale</option>
                  <option value="eldoria">Eldoria</option>
                </SelectInput>
              </Field>
              <Field label="Visibility">
                <SelectInput value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Entry visibility">
                  <option value="gmOnly">GM Only</option>
                  <option value="hidden">Hidden</option>
                  <option value="public">Public</option>
                  <option value="revealed">Revealed to Party</option>
                </SelectInput>
              </Field>
            </div>

            <Field label="Tags" hint="Use tags to connect entries across the archive">
              <div className="entry-editor-tags">
                {tags.map((tag) => <Chip key={tag} tone={tag === "Betrayal" ? "gold" : tag === "Elves" ? "success" : "neutral"}>{tag}<button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags((current) => current.filter((item) => item !== tag))}><X size={12} /></button></Chip>)}
                <button type="button" className="entry-editor-add-tag" onClick={() => setTags((current) => current.includes("First Age") ? current : [...current, "First Age"])}><Plus size={14} /> Add Tag</button>
              </div>
            </Field>

            <Field label="Summary" hint={`${summary.length} / 300 characters`}>
              <TextInput value={summary} onChange={(event) => setSummary(event.target.value.slice(0, 300))} aria-label="Entry summary" />
            </Field>
          </Panel>

          <div className="entry-editor-composer">
            <Panel eyebrow="Hero image" title="Archive Illustration" className="entry-editor-image-panel">
              <div className="entry-editor-image">
                <span className="entry-editor-image__moon" />
                <span className="entry-editor-image__arch" />
                <span className="entry-editor-image__ground" />
                <div><ImagePlus size={28} strokeWidth={1.25} /><strong>Moonlit Ruins</strong><small>Recommended 16:9 · 1920 × 1080</small></div>
              </div>
              <Button variant="secondary" size="sm" icon={ImagePlus}>Change Image</Button>
            </Panel>

            <Panel eyebrow="Article body" title="Chronicle Editor" className="entry-editor-body-panel">
              <div className="entry-editor-toolbar" role="toolbar" aria-label="Editor formatting">
                <SelectInput defaultValue="paragraph" aria-label="Text style">
                  <option value="paragraph">Paragraph</option>
                  <option value="heading2">Heading 2</option>
                  <option value="heading3">Heading 3</option>
                  <option value="quote">Quote</option>
                </SelectInput>
                <span className="entry-editor-toolbar__divider" />
                <button type="button"><strong>B</strong></button>
                <button type="button"><em>I</em></button>
                <button type="button"><u>U</u></button>
                <button type="button"><Link2 size={16} /></button>
                <button type="button"><BookOpen size={16} /></button>
              </div>
              <TextareaInput value={body} onChange={(event) => setBody(event.target.value)} aria-label="Article body" />
              <footer className="entry-editor-body-footer">
                <span>{wordCount} words</span>
                <span>Draft saved just now</span>
                <Eye size={15} strokeWidth={1.35} />
              </footer>
            </Panel>
          </div>

          <div className="entry-editor-links-grid">
            <Panel eyebrow="Key facts" title="Known Truths">
              <div className="entry-editor-relation-list">
                {facts.map((fact) => <CompactRelation key={fact} icon={Check} title={fact} onRemove={() => {}} />)}
              </div>
              <Button variant="secondary" size="sm" icon={Plus}>Add Fact</Button>
            </Panel>

            <Panel eyebrow="Linked entities" title="People & Factions">
              <div className="entry-editor-relation-list">
                {entities.map(({ icon, title: entityTitle, type }) => <CompactRelation key={entityTitle} icon={icon} title={entityTitle} meta={type} onRemove={() => {}} />)}
              </div>
              <Button variant="secondary" size="sm" icon={Plus}>Link Entity</Button>
            </Panel>

            <Panel eyebrow="References" title="Archive Links">
              <div className="entry-editor-reference-list">
                {references.map(({ icon: Icon, label, title: referenceTitle }) => (
                  <button type="button" key={referenceTitle}>
                    <Icon size={16} strokeWidth={1.35} />
                    <small>{label}</small>
                    <strong>{referenceTitle}</strong>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" icon={Plus}>Add Reference</Button>
            </Panel>
          </div>
        </main>

        <aside className="entry-editor-sidebar">
          <Panel eyebrow="Live preview" title="Party View" className="entry-preview-panel">
            <div className="entry-preview-art">
              <span className="entry-preview-art__moon" />
              <span className="entry-preview-art__arch" />
            </div>
            <div className="entry-preview-copy">
              <p className="sl-eyebrow">Lore · History</p>
              <h2>{title || "Untitled Entry"}</h2>
              <p>{summary || "Add a summary to preview this archive entry."}</p>
              <div className="sl-inline-chips">{tags.slice(0, 3).map((tag) => <Chip key={tag}>{tag}</Chip>)}</div>
            </div>
          </Panel>

          <Panel eyebrow="Reveal settings" title="Player Visibility">
            <Field label="Visibility">
              <SelectInput value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Preview visibility">
                <option value="gmOnly">GM Only</option>
                <option value="hidden">Hidden</option>
                <option value="public">Public</option>
                <option value="revealed">Revealed to Party</option>
              </SelectInput>
            </Field>
            <label className="entry-editor-check"><input type="checkbox" /> Hide until conditions are met</label>
            <Button variant="secondary" size="sm" icon={Eye}>Manage Conditions</Button>
          </Panel>

          <Panel eyebrow="Timeline" title="Linked Event">
            <CompactRelation icon={ScrollText} title="The Pact of Veils" meta="~1,200 years ago" onRemove={() => {}} />
            <Button variant="secondary" size="sm" icon={Plus}>Add Timeline Event</Button>
          </Panel>

          <Panel eyebrow="GM notes" title="Private Context">
            <TextareaInput placeholder="Add private notes, reminders, or secrets about this entry..." aria-label="GM notes" />
          </Panel>

          <Panel eyebrow="Publishing" title="Checklist" className="entry-checklist-panel">
            <ul className="entry-publish-checklist">
              <li className="is-complete"><Check size={14} /> Title and summary complete</li>
              <li className="is-complete"><Check size={14} /> Hero image added</li>
              <li className="is-complete"><Check size={14} /> Body content reviewed</li>
              <li><span /> Key facts added</li>
              <li><span /> Linked entities verified</li>
              <li><span /> Reveal settings confirmed</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
