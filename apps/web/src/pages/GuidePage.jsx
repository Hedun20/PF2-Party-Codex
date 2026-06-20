import { Link } from "react-router-dom";
import { BookOpen, Eye, FileQuestion, FileUp, MapPinned, PenLine, Shield, Wand2 } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";

const steps = [
  ["1", "Создай мир", "Начни с мира или кампании. Не заполняй всё сразу: название, краткое описание и visibility достаточно.", "/editor", PenLine],
  ["2", "Добавь город или локацию", "Город, страна и локация связываются через поля world / country / city и потом сами собираются в структуру.", "/editor", MapPinned],
  ["3", "Создай NPC / врага", "NPC может быть обычным или боевым. PF2-поля появляются только когда они реально нужны мастеру.", "/editor", Wand2],
  ["4", "Подключи карту", "Загрузи PNG/JPG/WebP как карту, затем поставь пины или области и привяжи их к статьям.", "/editor", MapPinned],
  ["5", "Импортируй Markdown", "Настоящий .md можно массово записать в vault или сначала загрузить в форму создания статьи.", "/editor", FileUp],
  ["6", "Проверь фантомные ссылки", "[[Будущая статья]] создаёт очередь ненаписанных статей — удобно для подготовки между сессиями.", "/missing", FileQuestion]
];

export default function GuidePage() {
  return (
    <div className="page-stack">
      <header className="list-header guide-hero article-page-header">
        <div>
          <span className="kicker">Быстрый старт мастера</span>
          <h1>Как пользоваться кодексом</h1>
          <p>Короткий onboarding: создать статью, импортировать Markdown, поставить карту и отделить player-visible от GM-only.</p>
        </div>
        <CodexButton as={Link} to="/editor"><PenLine size={16} /> <span>Создать первую статью</span></CodexButton>
      </header>

      <section className="guide-action-strip">
        <Link to="/editor"><PenLine size={18} /><strong>Создать</strong><span>Quick Create</span></Link>
        <Link to="/editor"><FileUp size={18} /><strong>Импорт</strong><span>MD / Obsidian</span></Link>
        <Link to="/timeline"><BookOpen size={18} /><strong>Timeline</strong><span>События</span></Link>
        <Link to="/missing"><FileQuestion size={18} /><strong>Ненаписанные</strong><span>Фантомные ссылки</span></Link>
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
          <p>В player-режиме сервер скрывает статьи `visibility: gm`, draft-статьи, GM Secrets и GM-only объекты карты. Проверяй режимом игрока перед сессией.</p>
        </article>
        <article>
          <FileUp size={22} />
          <h2>Obsidian-ссылки</h2>
          <p>Файл вида `obsidian://open?...` — это ярлык, а не текст статьи. Открой Obsidian, нажми правой кнопкой по заметке, выбери “Show in system explorer / Показать в папке” и загрузи настоящий `.md`.</p>
        </article>
        <article>
          <Eye size={22} />
          <h2>Редактор</h2>
          <p>В статье кнопка “Редактировать” находится справа. Внутри есть два рабочих режима: визуальный редактор для мастера и raw Markdown для точной ручной правки.</p>
        </article>
      </section>
    </div>
  );
}
