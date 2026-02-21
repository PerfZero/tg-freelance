import { useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";

import "./App.css";

type TgUser = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isPremium?: boolean;
};

type WebAppState = {
  isTelegram: boolean;
  platform: string;
  version: string;
  colorScheme: string;
  startParam?: string;
  user?: TgUser;
};

const getSafeState = (): WebAppState => {
  if (
    typeof window === "undefined" ||
    !(window as Window & { Telegram?: unknown }).Telegram
  ) {
    return {
      isTelegram: false,
      platform: "web",
      version: "n/a",
      colorScheme: "light",
    };
  }

  WebApp.ready();
  WebApp.expand();

  const initUser = WebApp.initDataUnsafe?.user;

  return {
    isTelegram: true,
    platform: WebApp.platform,
    version: WebApp.version,
    colorScheme: WebApp.colorScheme,
    startParam: WebApp.initDataUnsafe?.start_param,
    user: initUser
      ? {
          id: initUser.id,
          username: initUser.username,
          firstName: initUser.first_name,
          lastName: initUser.last_name,
          languageCode: initUser.language_code,
          isPremium: initUser.is_premium,
        }
      : undefined,
  };
};

const formatName = (user?: TgUser): string => {
  if (!user) {
    return "Гость";
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return `ID ${user.id}`;
};

function App() {
  const [state] = useState<WebAppState>(() => getSafeState());

  const profileName = useMemo(() => formatName(state.user), [state.user]);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">TG Freelance</p>
        <h1>Миниапп для заказов и откликов</h1>
        <p className="subtitle">
          Базовый frontend-каркас подключен к Telegram WebApp SDK. Дальше сюда
          будут добавлены лента задач, карточка и отклики.
        </p>
      </section>

      <section className="grid">
        <article className="card card-accent">
          <h2>Пользователь</h2>
          <p className="value">{profileName}</p>
          <p className="muted">
            {state.isTelegram
              ? "Сессия Telegram активна"
              : "Открыто вне Telegram"}
          </p>
        </article>

        <article className="card">
          <h2>Контекст</h2>
          <ul>
            <li>
              <span>Платформа</span>
              <strong>{state.platform}</strong>
            </li>
            <li>
              <span>Версия WebApp</span>
              <strong>{state.version}</strong>
            </li>
            <li>
              <span>Тема</span>
              <strong>{state.colorScheme}</strong>
            </li>
          </ul>
        </article>

        <article className="card">
          <h2>Стартовый параметр</h2>
          <p className="value">{state.startParam ?? "не передан"}</p>
          <p className="muted">
            Будет использоваться для диплинков и реферальных сценариев.
          </p>
        </article>
      </section>
    </main>
  );
}

export default App;
