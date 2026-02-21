# Backend

Express + TypeScript API для TG Freelance Mini App.

## Запуск

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npm run prisma:migrate -- --name init
npm run dev
```

API поднимается на `http://localhost:3001` (или порт из `PORT`).

## Команды

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run prisma:generate
npm run prisma:migrate -- --name <migration_name>
npm run prisma:studio
```

## Структура

- `src/main.ts` - точка входа
- `src/app.ts` - конфигурация Express-приложения
- `src/config/` - конфигурация окружения
- `src/common/` - общие middleware/ошибки
- `src/modules/` - feature-модули API
