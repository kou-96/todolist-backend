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

app.listen(PORT, () => {
  console.log(`サーバー${PORT}を立ち上げました。`);
});
