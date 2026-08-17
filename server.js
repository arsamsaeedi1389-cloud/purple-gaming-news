const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data", "db.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readDB() {
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
}
function hash(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

let db = readDB();
if (!db.users.some(u => u.username === "admin")) {
  db.users.push({
    id: 1,
    username: "admin",
    password: hash("admin123"),
    role: "admin"
  });
  writeDB(db);
}

function auth(req, res, next) {
  const username = req.headers["x-user"];
  const token = req.headers["x-token"];
  if (!username || !token) return res.status(401).json({ error: "نیاز به ورود دارید" });
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.token === token);
  if (!user) return res.status(401).json({ error: "ورود نامعتبر است" });
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "دسترسی فقط برای ادمین است" });
  next();
}

app.get("/api/articles", (req, res) => {
  const db = readDB();
  const category = req.query.category;
  let articles = db.articles.slice().reverse();
  if (category && category !== "همه") {
    articles = articles.filter(a => a.category === category);
  }
  res.json(articles);
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: "نام کاربری حداقل ۳ و رمز حداقل ۴ کاراکتر باشد" });
  }
  const db = readDB();
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "این نام کاربری قبلاً ثبت شده است" });
  }
  db.users.push({
    id: Date.now(),
    username,
    password: hash(password),
    role: "user"
  });
  writeDB(db);
  res.json({ message: "ثبت‌نام با موفقیت انجام شد" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === hash(password));
  if (!user) return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });

  const token = crypto.randomBytes(24).toString("hex");
  user.token = token;
  writeDB(db);
  res.json({ username: user.username, role: user.role, token });
});

app.get("/api/me", auth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

app.post("/api/articles", auth, adminOnly, (req, res) => {
  const { title, summary, content, category, image } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: "عنوان، متن و دسته‌بندی الزامی است" });
  }
  const db = readDB();
  const article = {
    id: Date.now(),
    title,
    summary: summary || "",
    content,
    category,
    image: image || "",
    author: req.user.username,
    createdAt: new Date().toISOString()
  };
  db.articles.push(article);
  writeDB(db);
  res.json(article);
});

app.delete("/api/articles/:id", auth, adminOnly, (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const before = db.articles.length;
  db.articles = db.articles.filter(a => a.id !== id);
  if (db.articles.length === before) return res.status(404).json({ error: "خبر پیدا نشد" });
  writeDB(db);
  res.json({ message: "خبر حذف شد" });
});

app.get("/api/users", auth, adminOnly, (req, res) => {
  const db = readDB();
  res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role })));
});

app.post("/api/users/:id/role", auth, adminOnly, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: "کاربر پیدا نشد" });
  if (user.username === "admin") return res.status(400).json({ error: "ادمین اصلی قابل تغییر نیست" });
  if (!["user", "admin"].includes(req.body.role)) {
    return res.status(400).json({ error: "نقش نامعتبر است" });
  }
  user.role = req.body.role;
  writeDB(db);
  res.json({ message: "نقش کاربر تغییر کرد" });
});

app.listen(PORT, () => {
  console.log(`Gaming News running on http://localhost:${PORT}`);
});