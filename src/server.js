
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Todo = require("./models/Todo");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Get all todos
app.get("/todos", async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch todos" });
  }
});

// Create a todo
app.post("/todos", async (req, res) => {
  try {
    const { title, completed } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    if (
      completed !== undefined &&
      typeof completed !== "boolean"
    ) {
      return res.status(400).json({
        message: "Completed must be a boolean",
      });
    }

    const todo = await Todo.create({
      title: title.trim(),
      ...(completed !== undefined && { completed }),
    });

    res.status(201).json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to create todo" });
  }
});

// Get one todo
app.get("/todos/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid todo ID" });
    }

    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch todo" });
  }
});

// Update a todo
app.put("/todos/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid todo ID" });
    }

    const { title, completed } = req.body;

    if (
      title === undefined &&
      completed === undefined
    ) {
      return res.status(400).json({
        message: "Provide title or completed to update",
      });
    }

    if (
      title !== undefined &&
      (typeof title !== "string" || !title.trim())
    ) {
      return res.status(400).json({
        message: "Title must be a non-empty string",
      });
    }

    if (
      completed !== undefined &&
      typeof completed !== "boolean"
    ) {
      return res.status(400).json({
        message: "Completed must be a boolean",
      });
    }

    const updates = {};

    if (title !== undefined) updates.title = title.trim();
    if (completed !== undefined) updates.completed = completed;

    const todo = await Todo.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Failed to update todo" });
  }
});

// Delete a todo
app.delete("/todos/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid todo ID" });
    }

    const todo = await Todo.findByIdAndDelete(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.status(200).json({
      message: "Todo deleted successfully",
      todo,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete todo" });
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Todo API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
