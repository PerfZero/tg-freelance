# Backend

Express + TypeScript API для TG Freelance Mini App.

## Запуск

```bash
cp .env.example .env
npm install
npm run dev
```

API поднимается на `http://localhost:3001` (или порт из `PORT`).

## Команды

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Структура

- `src/main.ts` - точка входа
- `src/app.ts` - конфигурация Express-приложения
- `src/config/` - конфигурация окружения
- `src/common/` - общие middleware/ошибки
- `src/modules/` - feature-модули API
