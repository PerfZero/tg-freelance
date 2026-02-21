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

## Auth API

- `POST /auth/telegram`:
  - body: `{ "initData": "<Telegram WebApp initData string>" }`
  - результат: `token`, `tokenType`, `user`
- `GET /auth/me`:
  - header: `Authorization: Bearer <token>`
  - результат: текущий пользователь

## Ошибки и логирование

- Все API-ошибки возвращаются в формате:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /foo not found",
    "details": {
      "requestId": "..."
    }
  }
}
```

- Для каждого запроса добавляется заголовок `x-request-id`.
- Пишутся структурные JSON-логи:
  - `request.start`
  - `request.finish`
  - `request.error`

## Структура

- `src/main.ts` - точка входа
- `src/app.ts` - конфигурация Express-приложения
- `src/config/` - конфигурация окружения
- `src/common/` - общие middleware/ошибки
- `src/modules/` - feature-модули API
