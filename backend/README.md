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

## Profile API

- `GET /profile/me`:
  - header: `Authorization: Bearer <token>`
  - результат: текущий пользователь с профилем
- `PATCH /profile/me`:
  - header: `Authorization: Bearer <token>`
  - body fields (any subset):
    - `display_name: string`
    - `about: string | null`
    - `skills: string[]`
  - результат: обновленный пользователь
- `GET /profile/:userId`:
  - header: `Authorization: Bearer <token>`
  - результат: публичный профиль пользователя

## Tasks API

- `POST /tasks`
  - header: `Authorization: Bearer <token>`
  - body:
    - `title: string`
    - `description: string`
    - `budget: number`
    - `category: string`
    - `deadline_at?: string | null` (ISO datetime)
    - `tags?: string[]`
- `GET /tasks`
  - header: `Authorization: Bearer <token>`
  - query (optional):
    - `page`, `limit`
    - `status` (`OPEN` by default)
    - `category`
    - `q` (search in title/description)
    - `budget_min`, `budget_max`
    - `sort` (`new`, `budget`, `budget_asc`, `budget_desc`)
- `GET /tasks/:id`
  - header: `Authorization: Bearer <token>`
- `PATCH /tasks/:id`
  - header: `Authorization: Bearer <token>`
  - only owner and only if task status is `OPEN`
  - body: any subset of `title`, `description`, `budget`, `deadline_at`, `category`, `tags`
- `POST /tasks/:id/cancel`
  - header: `Authorization: Bearer <token>`
  - only owner and only if task status is `OPEN`
- `POST /tasks/:id/proposals`
  - header: `Authorization: Bearer <token>`
  - body:
    - `price: number`
    - `comment: string`
    - `eta_days: number`
  - ограничения:
    - нельзя откликаться на свою задачу
    - на задачу можно оставить только один отклик от исполнителя
    - отклики доступны только для задач в статусе `OPEN`
    - после выбора исполнителя новые отклики запрещены
- `GET /tasks/:id/proposals`
  - header: `Authorization: Bearer <token>`
  - права:
    - владелец задачи видит все отклики
    - исполнитель видит только свой отклик на задачу

## Proposals API

- `PATCH /proposals/:id`
  - header: `Authorization: Bearer <token>`
  - only proposal author
  - body: any subset of `price`, `comment`, `eta_days`
  - разрешено только пока задача в `OPEN` и исполнитель еще не выбран
- `DELETE /proposals/:id`
  - header: `Authorization: Bearer <token>`
  - only proposal author
  - разрешено только пока задача в `OPEN` и исполнитель еще не выбран

## Assignment API

- `POST /tasks/:id/select-proposal`
  - header: `Authorization: Bearer <token>`
  - only task owner
  - body:
    - `proposal_id: string` (UUID)
  - ограничения:
    - задача должна быть в статусе `OPEN`
    - отклик должен принадлежать этой задаче
    - выбор исполнителя возможен только один раз
  - при успехе задача переходит в `IN_PROGRESS`

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
