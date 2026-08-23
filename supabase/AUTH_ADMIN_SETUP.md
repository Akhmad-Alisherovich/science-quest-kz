# SCIENCE QUEST KZ — Auth и Admin setup

## 1. Применение схемы

Откройте Supabase Dashboard → SQL Editor, вставьте целиком файл
`supabase/migrations/202608220002_auth_admin.sql` и нажмите **Run** один раз.

Migration не изменяет уже применённый `202608220001_leaderboard.sql`. Она добавляет роли,
учебный журнал и защищённые admin RPC. Повторный запуск новой migration безопасен.

После неё примените `supabase/migrations/202608230001_registration_phone_contact.sql`.
Эта additive migration создаёт отдельное приватное хранилище контактных телефонов,
RLS и защищённый доступ для владельца и admin Student Detail. Таблица `profiles` и
leaderboard RPC не получают поле телефона.

## 2. Настройки Auth

В Authentication → Providers оставьте включённым Email. В URL Configuration укажите URL
приложения в Site URL и Redirect URLs — ссылки подтверждения и восстановления возвращаются
на `window.location.origin`.

Для сохранения anonymous-прогресса при регистрации включите в Authentication settings
ручное связывание identities (manual identity linking). Клиент использует официальный
`auth.updateUser`, поэтому UUID пользователя, прогресс, XP и история не меняются.

SCIENCE QUEST использует только Email + Password. SMS provider и Phone Auth не требуются.
Телефон вводится при регистрации как обязательный приватный контакт и не является способом
входа, восстановления пароля или Supabase Auth identity.

## 3. Назначение первого администратора

Сначала зарегистрируйте будущего администратора через обычную страницу входа и подтвердите
email. Затем скопируйте UUID этого пользователя из Authentication → Users и один раз выполните
в SQL Editor, заменив значение-заглушку на реальный UUID:

```sql
insert into public.user_roles(user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'admin')
on conflict (user_id) do update
set role = excluded.role, updated_at = now();
```

Роль не определяется по email и не хранится во frontend. Обычные `authenticated` клиенты не
имеют `INSERT`, `UPDATE`, `DELETE` или `SELECT` к `user_roles`; React получает только собственную
роль через `get_my_role`, а каждый admin RPC повторно проверяет её на сервере.
