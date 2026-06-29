import { Link } from "react-router-dom";
import { BookOpen, Eye, FileQuestion, FileUp, MapPinned, NotebookPen, PenLine, Shield, UserRound, Wand2 } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";

const gmSteps = [
  ["1", "Создай мир", "Начни с мира или кампании: название, краткое описание и visibility уже достаточно.", "/editor", PenLine],
  ["2", "Добавь город или локацию", "Связи через world / country / city потом сами собирают структуру мира.", "/editor", MapPinned],
  ["3", "Создай NPC / врага", "NPC может быть обычным или боевым; PF2-поля появятся там, где нужны мастеру.", "/editor", Wand2],
  ["4", "Подключи карту", "Загрузи PNG/JPG/WebP как карту, затем поставь player-visible и GM-only объекты.", "/editor", MapPinned],
  ["5", "Импортируй Markdown", "Настоящий .md можно загрузить в форму создания статьи или массово перенести в vault.", "/editor", FileUp],
  ["6", "Проверь фантомные ссылки", "[[Будущая статья]] создаёт очередь ненаписанных материалов для подготовки.", "/missing", FileQuestion]
];

const playerSteps = [
  ["1", "Выбери мир", "Открой мир кампании и смотри только опубликованные мастером материалы.", "/category/worlds", MapPinned],
  ["2", "Открой портал мира", "В активном мире есть Player portal: текущий reveal, открытые статьи, карты и timeline.", "/category/worlds", Eye],
  ["3", "Веди Notes", "Личный блокнот находится на отдельной странице Notes. Заметку можно привязать к конкретной статье.", "/notes", NotebookPen],
  ["4", "Заполни персонажа", "Characters хранит PF2e-лист, приватные черновики и краткую карточку, которую можно открыть партии.", "/characters", UserRound],
  ["5", "Читай статьи", "Public-lore, известные NPC, карты и timeline доступны без мастерских заметок.", "/", BookOpen],
  ["6", "Открой карты", "На карте видны только player-visible объекты и ссылки на доступные статьи.", "/maps", MapPinned]
];

export default function GuidePage({ canEdit = false }) {
  const steps = canEdit ? gmSteps : playerSteps;

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">{canEdit ? "Быстрый старт мастера" : "Портал игрока"}</span>
        <h1>{canEdit ? "Как пользоваться кодексом" : "Что доступно игроку"}</h1>
        <p>{canEdit
          ? "Создание статей, импорт Markdown, карты и проверка player-safe материалов собраны в одном рабочем процессе. Игроки видят только опубликованную часть архива."
          : "Игрок видит опубликованные мастером материалы, личные заметки и свой PF2e-лист персонажа. Полный лист и краткая карточка управляются настройками видимости."}</p>
      </header>

      <section className="guide-action-strip">
        {canEdit && <Link to="/editor"><PenLine size={18} /><strong>Создать</strong><span>Quick Create</span></Link>}
        {canEdit && <Link to="/editor"><FileUp size={18} /><strong>Импорт</strong><span>MD / Obsidian</span></Link>}
        <Link to="/timeline"><BookOpen size={18} /><strong>Timeline</strong><span>События</span></Link>
        <Link to="/maps"><MapPinned size={18} /><strong>Карты</strong><span>Player-safe</span></Link>
        <Link to="/notes"><NotebookPen size={18} /><strong>Notes</strong><span>Личный блокнот</span></Link>
        <Link to="/characters"><UserRound size={18} /><strong>Characters</strong><span>PF2e лист</span></Link>
        <Link to="/category/worlds"><Eye size={18} /><strong>Миры</strong><span>Выбор мира</span></Link>
        {canEdit && <Link to="/missing"><FileQuestion size={18} /><strong>Ненаписанные</strong><span>Фантомные ссылки</span></Link>}
      </section>

      <section className="guide-grid guide-steps-grid">
        {steps.map(([num, title, text, href, Icon]) => (
          <article key={title}>
            <span className="guide-step-num">{num}</span>
            <Icon size={22} />
            <h2>{title}</h2>
            <p>{text}</p>
            <CodexButton as={Link} variant="secondary" size="sm" to={href}>Открыть</CodexButton>
          </article>
        ))}
      </section>

      <section className="builder-section guide-deep-dive">
        <article>
          <Shield size={22} />
          <h2>GM / Player режим</h2>
          <p>В player-режиме сервер скрывает GM-only статьи, draft-материалы, GM Secrets и секретные объекты карты.</p>
        </article>
        <article>
          <UserRound size={22} />
          <h2>Персонаж игрока</h2>
          <p>Лист персонажа хранит приватные черновики отдельно от краткой карточки для партии. Игрок сам включает видимость для GM и других игроков.</p>
        </article>
      </section>
    </div>
  );
}
