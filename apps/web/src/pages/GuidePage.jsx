import { Link } from "react-router-dom";
import { BookOpen, Eye, FileQuestion, FileUp, Globe2, MapPinned, PenLine, Shield, Wand2 } from "lucide-react";

const steps = [
  ["1", "GM запускает локально", "Мастер открывает localhost и получает полный доступ к vault, редактору и секретам.", "/guide", Shield],
  ["2", "Игроки заходят по LAN", "Игрокам даётся адрес вида http://192.168.x.x:3050. Они видят только player-visible слой.", "/guide", Globe2],
  ["3", "Создай мир / локацию", "Сначала минимум: тип, название, привязка и summary. Остальное раскрывается по необходимости.", "/editor", PenLine],
  ["4", "Типизируй лор", "Для лора выбирай подтип: фракция, культ, бог, артефакт, история, план или магия.", "/editor", Wand2],
  ["5", "Подключи карту", "Загрузи PNG/JPG/WebP как mapImage, затем поставь пины или области и привяжи их к статьям.", "/maps", MapPinned],
  ["6", "Импортируй Markdown", "Настоящий .md можно массово записать в vault или сначала загрузить в форму создания статьи.", "/editor", FileUp],
  ["7", "Проверь фантомные ссылки", "[[Будущая статья]] создаёт очередь ненаписанных статей — удобно для подготовки между сессиями.", "/missing", FileQuestion]
];

export default function GuidePage({ session }) {
  const canEdit = Boolean(session?.canEdit);
  return (
    <div className="page-stack">
      <header className="list-header guide-hero article-page-header">
        <div>
          <span className="kicker">Быстрый старт мастера</span>
          <h1>Как пользоваться кодексом</h1>
          <p>PF2 Party Codex работает как локальный сервер мастера: localhost — GM, LAN URL — игроки. Vault хранится локально и не должен попадать в GitHub.</p>
        </div>
        {canEdit ? <Link className="upload-button" to="/editor"><PenLine size={16} /> Создать первую статью</Link> : <Link className="upload-button" to="/category/worlds"><Eye size={16} /> Смотреть как игрок</Link>}
      </header>

      <section className="guide-action-strip">
        {canEdit && <Link to="/editor"><PenLine size={18} /><strong>Создать</strong><span>Quick Create</span></Link>}
        {canEdit && <Link to="/editor"><FileUp size={18} /><strong>Импорт</strong><span>MD / Obsidian</span></Link>}
        <Link to="/timeline"><BookOpen size={18} /><strong>Timeline</strong><span>События</span></Link>
        <Link to="/maps"><MapPinned size={18} /><strong>Карты</strong><span>Maps Hub</span></Link>
        <Link to="/missing"><FileQuestion size={18} /><strong>Ненаписанные</strong><span>Фантомные ссылки</span></Link>
      </section>

      <section className="guide-grid guide-steps-grid">
        {steps.map(([num, title, text, href, Icon]) => (
          <article key={title}>
            <span className="guide-step-num">{num}</span>
            <Icon size={22} />
            <h2>{title}</h2>
            <p>{text}</p>
            {(canEdit || !["/editor"].includes(href)) && <Link className="upload-button" to={href}>Открыть</Link>}
          </article>
        ))}
      </section>

      <section className="builder-section guide-deep-dive">
        <article>
          <Shield size={22} />
          <h2>GM / Player доступ</h2>
          <p><strong>localhost</strong> и <strong>127.0.0.1</strong> считаются машиной мастера. LAN-адреса считаются игроками. Backend блокирует запись в vault для player-запросов.</p>
        </article>
        <article>
          <FileUp size={22} />
          <h2>Vault и GitHub</h2>
          <p><code>vault/</code> — локальные данные кампании. В GitHub должен попадать код приложения, а не секреты, карты и лор мастера. При первом запуске сервер создаст нужные папки vault.</p>
        </article>
        <article>
          <Eye size={22} />
          <h2>Секреты</h2>
          <p>Player mode скрывает <code>visibility: gm</code>, draft-статьи, <code>## GM Secrets</code>, <code>:::gm</code> и <code>[secret]...[/secret]</code> блоки, а также GM-only объекты карты.</p>
        </article>
      </section>
    </div>
  );
}
