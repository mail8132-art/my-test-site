# OG GROUP — brand experience

Одностраничный сайт-визитка группы компаний. Собран без сборщика: открывается
двойным щелчком по `index.html`.

## Запуск

```
site/index.html          → просто открыть в браузере (Chrome, Edge, Firefox, Safari)
```

Сервер не нужен: шрифты, GSAP, ScrollTrigger и Lenis лежат локально.
Если браузер блокирует локальные шрифты (`file://`), поднимите любой статический
сервер в папке `site/`:

```
npx serve site        # или: python -m http.server --directory site 8080
```

## Структура

```
site/
├─ index.html          разметка, SEO-мета, JSON-LD, инлайн-SVG (знак, пластины)
├─ styles.css          дизайн-система: токены брендбука → CSS-переменные, секции, адаптив
├─ script.js           прелоадер, курсор, split-text, скролл-сценарии, фильтры, форма
├─ vendor/             gsap 3.12.5, ScrollTrigger, Lenis 1.1.20 (UMD, локально)
├─ assets/fonts/       Manrope 300–800, Inter 300–600 (OFL)
├─ assets/favicon.svg
├─ assets/og-cover.svg
├─ ART_DIRECTION.md    почему сделано именно так
└─ ASSETS.md           что заменить/добавить к продакшену
```

## Дизайн-токены

Все значения — из брендбука 1.0, менять только вместе с книгой:

```css
--ink:      #101113   /* OG Black      */
--graphite: #292B2F   /* Graphite      */
--silver:   #C7C9CC   /* Platinum Silver */
--paper:    #F2F3F4   /* Soft White    */
--steel:    #777B80   /* Steel Grey    */
```

Шрифты: `Manrope` (заголовки, подписи), `Inter` (текст). Сетка — 12 колонок,
поля `clamp(1.25rem, 4.2vw, 4.5rem)`, максимум контента 1680 px.

## Анимация

| Слой | Технология | Файл |
|---|---|---|
| Плавный скролл | Lenis + ScrollTrigger | `script.js → Core.initScroll` |
| Прелоадер (счётчик, вычерчивание знака, занавес) | GSAP timeline | `Preloader` |
| Появление первого экрана | **CSS-анимации** (не зависит от JS) | `styles.css → html.is-revealed` |
| Заголовки (split-text по строкам) | собственный сплиттер без плагинов | `Splitter` |
| Reveal секций, параллакс, счётчики | GSAP + ScrollTrigger | `Scroll` |
| Инверсия строк экспертизы, hover карточек | CSS transitions | `styles.css` |
| Кастомный курсор + magnetic | rAF + GSAP | `Cursor`, `UI.magnetic` |
| Оверлей проекта | CSS-переход панели | `Works.modal` |

Первый экран намеренно не зависит от GSAP: если скрипты не загрузятся, заголовок
и кнопки всё равно видны (класс `anim-armed` добавляется только после старта JS).

## Доступность

- семантические лендмарки (`header`, `main`, `section`, `footer`), `aria-label` у навигации;
- ссылка «Перейти к содержанию», видимый `:focus-visible`;
- мобильное меню: `aria-expanded`, `aria-controls`, закрытие по `Esc`;
- оверлей проекта: `role="dialog"`, `aria-modal`, ловушка фокуса, возврат фокуса;
- форма: `aria-invalid`, `role="status"` для сообщений, ошибки текстом, а не только цветом;
- контраст: серебро на чёрном ≈ 9,4:1, графит на soft white ≈ 12:1;
- `prefers-reduced-motion` — отключает Lenis, курсор и все анимации.

## Что подключить на продакшене

1. **Форма.** Сейчас `submit` имитирует отправку и пишет лид в консоль.
   Заменить блок `try { await new Promise(...) }` в `UI.form` на `fetch('/api/lead')`.
2. **Аналитика.** События: `project_open`, `filter_change`, `lead_submit`, `contact_click`.
3. **Реальные данные.** Проекты, клиенты, контакты — см. `ASSETS.md`.
4. **Проверка.** Прогнать Lighthouse (цель ≥ 95) и axe-core; проверить кириллицу
   в основном тексте на 320 px.

## Служебные режимы

- `index.html?snap` — без анимаций и прелоадера (для скриншотов и печати).
- `index.html?shot=works` — показать только одну секцию (превью для согласования).
- `?snap` выставляет `html.snap`, `?shot=` дополнительно скрывает остальные секции.
