export default function GuidePage() {
  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Туториал мастера</span>
        <h1>Как пользоваться кодексом</h1>
        <p>Короткая инструкция для запуска, структуры, карт, пинов и player/GM режима.</p>
      </header>
      <section className="guide-grid">
        <article>
          <h2>1. Запуск</h2>
          <p>Запусти `scripts/start-wiki.bat` или команду `npm run start`. Пока окно сервера открыто, игроки могут заходить на `http://localhost:3050` или LAN URL.</p>
        </article>
        <article>
          <h2>2. Структура</h2>
          <p>Основная логика: мир {"->"} страна {"->"} город {"->"} локации, NPC, враги, квесты. Поля `world`, `country`, `city` создают вложенность автоматически.</p>
        </article>
        <article>
          <h2>3. Markdown</h2>
          <p>Файлы лежат в `vault`. Можно создавать через конструктор или копировать шаблоны из `vault/_templates`.</p>
        </article>
        <article>
          <h2>4. Карты</h2>
          <p>PNG/JPG кладутся в `vault/images`. В статье укажи `mapImage`, а пины можно поставить визуально через “Создать статью”.</p>
        </article>
        <article>
          <h2>5. Секреты</h2>
          <p>Секции `## GM Secrets` и статьи `visibility: gm` скрываются в режиме игрока на сервере.</p>
        </article>
        <article>
          <h2>6. Проверка</h2>
          <p>Открывай “Контроль vault”, чтобы найти битые ссылки, отсутствующие карты и статьи без связей.</p>
        </article>
      </section>
    </div>
  );
}
