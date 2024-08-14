const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();
const PORT = 5003;

const corsOption = {
  origin: ["http://localhost:5173"],
  optionSuccessStatus: 200,
};

app.use(cors(corsOption));
app.use(express.json());

app.get("/todos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("タスクの取得に失敗しました");
  }
});

app.get("/todos/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM tasks WHERE user_id = $1", [
      user_id,
    ]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("タスクの取得に失敗しました");
  }
});

app.get("/users", (req, res) => {
  pool.query("SELECT * FROM users", (errors, results) => {
    if (errors) throw errors;
    return res.status(200).json(results.rows);
  });
});

app.post("/users/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "すべてのフィールドを入力してください。" });
  }

  try {
    const allUsers = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    let usernameError = false;
    let emailError = false;

    for (const row of allUsers.rows) {
      if (row.username === username) {
        usernameError = true;
      }
      if (row.email === email) {
        emailError = true;
      }
    }

    if (usernameError && emailError) {
      return res.status(409).json({
        message: "ユーザー名とメールアドレスの両方が使用されています。",
      });
    }
    if (usernameError) {
      return res
        .status(409)
        .json({ message: "このユーザーネームは既に使用されています。" });
    }
    if (emailError) {
      return res
        .status(409)
        .json({ message: "このメールアドレスは既に使用されています。" });
    }

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [username, email, password]
    );
    res
      .status(201)
      .json({
        message: "ユーザーの作成に成功しました。",
        data: result.rows[0],
      });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ message: "ユーザーの作成に失敗しました。" });
  }
});

app.post("/users/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "メールアドレスとパスワードを入力してください。" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "無効なメールアドレスまたはパスワードです。" });
    }

    const user = result.rows[0];
    res.status(200).json({ message: "ログインに成功しました。", data: user });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ message: "ログインに失敗しました。" });
  }
});

app.post("/tasks", async (req, res) => {
  const { user_id, description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "入力は必須です" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (user_id, description) VALUES ($1,$2) RETURNING *",
      [user_id, description]
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
    res.status(500).json({ error: "Todo の更新中にエラーが発生しました。" });
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
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [userId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "ユーザーが見つかりませんでした。" });
    }

    res.status(200).json({ message: "ユーザーは正常に削除されました。" });
  } catch (err) {
    console.error("ユーザー削除エラー:", err.message);
    res.status(500).json({ error: "ユーザーの削除に失敗しました。" });
  }
});

app.listen(PORT, () => {
  console.log(`サーバー${PORT}を立ち上げました。`);
});
