import { ArrowUpRight, BriefcaseBusiness, MessageCircleMore, ShieldCheck } from "lucide-react";

import { getTelegramBotUrl } from "../../../shared/lib/telegram";

import "./PublicLandingPage.css";

const highlights = [
  {
    icon: BriefcaseBusiness,
    title: "Задачи и исполнители в одном потоке",
    description:
      "Публикуйте задачу, собирайте отклики и выбирайте исполнителя без отдельной CRM.",
  },
  {
    icon: MessageCircleMore,
    title: "Отклики прямо в Telegram",
    description:
      "Пользователь открывает миниапп из бота и сразу попадает в ленту задач и диалоги по проекту.",
  },
  {
    icon: ShieldCheck,
    title: "Быстрый вход без регистрации",
    description:
      "Авторизация идёт через Telegram WebApp, поэтому не нужен отдельный логин и пароль.",
  },
];

const steps = [
  "Открой бота в Telegram.",
  "Запусти миниапп по кнопке внутри бота.",
  "Создай задачу или откликнись на готовую.",
];

export const PublicLandingPage = () => {
  const botUrl = getTelegramBotUrl();

  return (
    <main className="landing-page">
      <div className="landing-page__glow landing-page__glow_left" />
      <div className="landing-page__glow landing-page__glow_right" />

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-badge">Telegram Mini App</span>
          <h1>Фриланс-задачи, которые открываются сразу в Telegram.</h1>
          <p>
            Сайт в обычном браузере показывает только лендинг. Основная работа
            с задачами, откликами и профилем идёт внутри Telegram-бота.
          </p>

          <div className="landing-actions">
            {botUrl ? (
              <a
                className="landing-actions__primary"
                href={botUrl}
                target="_blank"
                rel="noreferrer"
              >
                Открыть бота
                <ArrowUpRight size={18} />
              </a>
            ) : (
              <span className="landing-actions__primary landing-actions__primary_disabled">
                Укажи username бота
              </span>
            )}

            <a className="landing-actions__secondary" href="#how-it-works">
              Как это работает
            </a>
          </div>

          {!botUrl ? (
            <p className="landing-note">
              Для кнопки нужен `TELEGRAM_BOT_USERNAME` в `backend/.env` или
              `VITE_TELEGRAM_BOT_USERNAME` во фронтенде.
            </p>
          ) : null}
        </div>

        <div className="landing-panel">
          <div className="landing-panel__header">
            <span>Внутри миниаппа</span>
            <span>tg-freelance</span>
          </div>

          <div className="landing-panel__metric">
            <strong>Быстрый старт без регистрации</strong>
            <p>Пользователь заходит через Telegram и сразу видит рабочий интерфейс.</p>
          </div>

          <div className="landing-panel__list">
            <div>
              <span>01</span>
              <p>Лента актуальных задач</p>
            </div>
            <div>
              <span>02</span>
              <p>Отклики и выбор исполнителя</p>
            </div>
            <div>
              <span>03</span>
              <p>Статусы, чат и уведомления</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-grid" aria-label="Преимущества">
        {highlights.map(({ icon: Icon, title, description }) => (
          <article key={title} className="landing-card">
            <span className="landing-card__icon">
              <Icon size={20} />
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="landing-steps" id="how-it-works">
        <div className="landing-steps__intro">
          <span className="landing-badge landing-badge_muted">Как зайти</span>
          <h2>Вне Telegram показываем лендинг, внутри Telegram открываем mini app.</h2>
        </div>

        <div className="landing-steps__list">
          {steps.map((step, index) => (
            <article key={step} className="landing-step">
              <span>{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
