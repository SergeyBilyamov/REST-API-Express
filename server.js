const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const usersFilePath = path.join(__dirname, 'users.json');

app.use(express.json());

// --- Вспомогательные функции ---
function readUsersFromFile() {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Ошибка чтения файла:', err);
    return [];
  }
}

function writeUsersToFile(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Ошибка записи в файл:', err);
  }
}

// Валидация email через простое регулярное выражение
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// Проверка, существует ли пользователь с таким email (кроме исключённого ID)
function userExistsByEmail(email, excludeId = null) {
  const users = readUsersFromFile();
  return users.some(user => user.email === email && user.id !== excludeId);
}

// --- Маршруты ---

// GET /users — получить всех
app.get('/users', (req, res) => {
  const users = readUsersFromFile();
  res.json(users);
});

// GET /users/:id — получить по ID
app.get('/users/:id', (req, res) => {
  const users = readUsersFromFile();
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  res.json(user);
});

// POST /users — создать нового
app.post('/users', (req, res) => {
  const { name, email } = req.body;

  // Валидация
  if (!name || !email) {
    return res.status(400).json({ error: 'Имя и email обязательны' });
  }

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Имя должно быть непустой строкой' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Некорректный формат email' });
  }

  if (userExistsByEmail(email)) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  const users = readUsersFromFile();
  const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

  const newUser = {
    id: newId,
    name: name.trim(),
    email: email.toLowerCase().trim()
  };

  users.push(newUser);
  writeUsersToFile(users);

  res.status(201).json(newUser);
});

// PUT /users/:id — обновить пользователя
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Имя и email обязательны' });
  }

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Имя должно быть непустой строкой' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Некорректный формат email' });
  }

  const users = readUsersFromFile();
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  // Проверяем, не занят ли email другим пользователем
  if (userExistsByEmail(email, id)) {
    return res.status(409).json({ error: 'Email уже используется другим пользователем' });
  }

  users[userIndex] = {
    id,
    name: name.trim(),
    email: email.toLowerCase().trim()
  };

  writeUsersToFile(users);
  res.json(users[userIndex]);
});

// DELETE /users/:id — удалить
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const users = readUsersFromFile();
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const deletedUser = users.splice(userIndex, 1)[0];
  writeUsersToFile(users);

  res.json({ message: `Пользователь "${deletedUser.name}" успешно удалён` });
});

// --- Запуск сервера ---
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});