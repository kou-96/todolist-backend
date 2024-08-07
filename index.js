const express = require("express");
const cors = require("cors");
const { pool, pool2 } = require("./db");
const bcrypt = require("bcrypt");
const app = express();
const PORT = 5003;

const corsOption = {
  origin: ["http://localhost:5173"],
  optionSuccessStatus: 200,
};

app.use(cors(corsOption));
app.use(express.json());

app.get("/users", (req, res) => {
  pool2.query("SELECT * FROM users", (errors, results) => {
    if (errors) throw errors;
    return res.status(200).json(results.rows);
  });
});

app.get("/todos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("タスクの取得に失敗しました");
  }
});

app.post("/users/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("すべてのフィールドを入力してください。");
  }

  if (username.trim() === "" || email.trim() === "" || password.trim() === "") {
    return res.status(400).send("フィールドに無効な値が含まれています。");
  }

  try {
    const checkUsername = await pool2.query(
      "SELECT username FROM users WHERE username = $1",
      [username]
    );

    if (checkUsername.rows.length > 0) {
      return res.status(409).send("このユーザーネームは使用されています。");
    }

    const checkEmail = await pool2.query(
      "SELECT email FROM users WHERE email = $1",
      [email]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(409).send("このメールアドレスは使用されています。");
    }

    const result = await pool2.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, password]
    );
    res.status(201).send("ユーザーの作成に成功しました。");
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("ユーザーの作成に失敗しました。");
  }
});

app.post("/users/login", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("全てのフィールドを入力してください。");
  }

  try {
    const result = await pool2.query(
      "SELECT username, email, password FROM users WHERE username = $1",
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("ユーザーが見つかりません。");
    }

    const user = result.rows[0];

    if (user.email !== email) {
      return res.status(401).send("メールアドレスが違います。");
    }

    if (user.password !== password) {
      return res.status(401).send("パスワードが違います。");
    }

    res.status(200).send("ログインに成功しました。");
  } catch (err) {
    console.error("ログインエラー:", err.message);
    res.status(500).send("ログインに失敗しました。");
  }
});

app.post("/tasks", async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "入力は必須です" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (description) VALUES ($1) RETURNING *",
      [description]
    );
    const newTask = result.rows[0];
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "内部サーバーエラーが発生しました" });
  }
});

app.patch("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  try {
    const result = await pool.query(
      "UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *",
      [completed, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error updating todo" });
  }
});

app.patch("/tasks/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;

  try {
    const result = await pool.query(
      "UPDATE tasks SET description = $1 WHERE id = $2 RETURNING *",
      [updates.description, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "タスクが見つかりませんでした。" });
    }
    const updatedTodo = result.rows[0];
    res.json(updatedTodo);
  } catch (err) {
    console.error("タスク更新中に問題が発生しました", err);
    res.status(500).json({ error: "内部サーバーエラーが発生しました。" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "タスクが見つかりませんでした。" });
    }
    const deletedTask = result.rows[0];
    res
      .status(200)
      .json({ message: "タスクは正常に削除されました。", task: deletedTask });
  } catch (err) {
    console.error("タスクの削除中にエラーが発生しました。", err);
    res.status(500).json({ error: "内部サーバエラーが発生しました。" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool2.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    res.status(200).json({ message: "USER_DELETED_SUCCESSFULLY" });
  } catch (err) {
    console.error("ユーザー削除エラー:", err.message);
    res.status(500).json({ error: "USER_DELETION_FAILED" });
  }
});

app.listen(PORT, () => {
  console.log(`サーバー${PORT}を立ち上げました。`);
});
