# Telegram Messenger Clone

Полноценный мессенджер с авторизацией по телефону, звонками, стикерами и групповыми чатами.

## Функции

- Авторизация по номеру телефона с Firebase Auth
- Чаты: текстовые сообщения, медиафайлы, стикеры
- Групповые чаты
- Голосовые и видео звонки с WebRTC
- Real-time сообщения с Socket.IO

## Установка

### Backend

1. Перейдите в папку `backend`
2. Установите зависимости: `npm install`
3. Настройте `.env` файл с вашими ключами Firebase и MongoDB URI
4. Запустите MongoDB локально или используйте облачный сервис
5. Запустите сервер: `npm start`

### Frontend

1. Перейдите в папку `frontend`
2. Установите зависимости: `npm install`
3. Настройте Firebase config в `src/firebase.js`
4. Запустите приложение: `npm start`

## Развертывание

### Replit

1. Импортируйте репозиторий на Replit
2. Установите переменные окружения в Secrets:
   - `MONGO_URI`: Ваш MongoDB Atlas URI
   - `FRONTEND_URL`: URL вашего Replit repl (например, https://your-repl.replit.dev)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Настройки email
   - `JWT_SECRET`: Секретный ключ для JWT
3. Replit автоматически установит зависимости и запустит приложение
4. Приложение будет доступно по URL Replit

### UptimeRobot

1. Зарегистрируйтесь на UptimeRobot
2. Добавьте новый монитор:
   - URL: Ваш Replit URL (например, https://your-repl.replit.dev)
   - Monitoring Interval: 5 минут
   - Monitor Type: HTTP(s)
3. Настройте уведомления по email или другим каналам

- Frontend: Разверните на Vercel, Netlify или другом хостинге
- Backend: Разверните на Heroku, Railway или VPS
- Database: Используйте MongoDB Atlas

## Безопасность

- Используйте HTTPS
- Храните секреты в переменных окружения
- Валидируйте входные данные

## Технологии

- Frontend: React, Socket.IO Client, Simple-Peer
- Backend: Node.js, Express, Socket.IO, Firebase Admin
- Database: MongoDB
- Auth: Firebase Auth
- Calls: WebRTC