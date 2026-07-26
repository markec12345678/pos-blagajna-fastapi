const KV_KEY = "todos";

let todos = [];
let filter = "all";
let nextId = 1;

const $ = (id) => document.getElementById(id);

const els = {
  signInBtn: $("sign-in-btn"),
  signOutBtn: $("sign-out-btn"),
  userChip: $("user-chip"),
  userName: $("user-name"),
  userAvatar: $("user-avatar"),
  addForm: $("add-form"),
  todoInput: $("todo-input"),
  todoList: $("todo-list"),
  emptyState: $("empty-state"),
  taskCount: $("task-count"),
  bulkActions: $("bulk-actions"),
  clearCompletedBtn: $("clear-completed-btn"),
  clearAllBtn: $("clear-all-btn"),
  syncStatus: $("sync-status"),
};

function generateId() {
  return `todo-${Date.now()}-${nextId++}`;
}

function setSyncStatus(message, type = "") {
  els.syncStatus.textContent = message;
  els.syncStatus.className = "sync-status" + (type ? ` ${type}` : "");
}

async function loadTodos() {
  setSyncStatus("Loading…", "syncing");
  try {
    const raw = await puter.kv.get(KV_KEY);
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      todos = Array.isArray(parsed) ? parsed : [];
      const maxNum = todos.reduce((max, t) => {
        const match = String(t.id).match(/-(\d+)$/);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
      nextId = maxNum + 1;
    }
    setSyncStatus("Synced with cloud");
    setTimeout(() => setSyncStatus(""), 2000);
  } catch (err) {
    console.error("Failed to load todos:", err);
    setSyncStatus("Could not load from cloud", "error");
  }
}

async function saveTodos() {
  setSyncStatus("Saving…", "syncing");
  try {
    await puter.kv.set(KV_KEY, JSON.stringify(todos));
    setSyncStatus("Saved");
    setTimeout(() => setSyncStatus(""), 1500);
  } catch (err) {
    console.error("Failed to save todos:", err);
    setSyncStatus("Save failed", "error");
  }
}

function filteredTodos() {
  switch (filter) {
    case "active":
      return todos.filter((t) => !t.completed);
    case "completed":
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}

function updateUI() {
  const visible = filteredTodos();
  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - activeCount;

  els.todoList.innerHTML = "";

  visible.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");
    li.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-check";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `Mark "${todo.text}" as ${todo.completed ? "incomplete" : "complete"}`);
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "todo-delete";
    deleteBtn.setAttribute("aria-label", `Delete "${todo.text}"`);
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, span, deleteBtn);
    els.todoList.appendChild(li);
  });

  const isEmpty = todos.length === 0;
  const visibleEmpty = visible.length === 0 && !isEmpty;

  els.emptyState.hidden = !isEmpty && !visibleEmpty;
  if (isEmpty) {
    els.emptyState.querySelector("p").textContent = "No tasks yet. Add one above!";
  } else if (visibleEmpty) {
    els.emptyState.querySelector("p").textContent =
      filter === "active" ? "No active tasks." : "No completed tasks.";
    els.emptyState.hidden = false;
  }

  els.taskCount.textContent =
    activeCount === 1 ? "1 item left" : `${activeCount} items left`;

  els.bulkActions.hidden = todos.length === 0;
  els.clearCompletedBtn.hidden = completedCount === 0;
}

async function addTodo(text) {
  const todo = { id: generateId(), text, completed: false, createdAt: Date.now() };
  todos.unshift(todo);
  updateUI();
  await saveTodos();
}

async function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  updateUI();
  await saveTodos();
}

async function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  updateUI();
  await saveTodos();
}

async function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  updateUI();
  await saveTodos();
}

async function clearAll() {
  if (!confirm("Delete all tasks? This cannot be undone.")) return;
  todos = [];
  updateUI();
  await puter.kv.del(KV_KEY);
  setSyncStatus("All tasks cleared");
  setTimeout(() => setSyncStatus(""), 2000);
}

function updateAuthUI(user) {
  if (user) {
    els.signInBtn.hidden = true;
    els.userChip.hidden = false;
    const name = user.username || user.email || "User";
    els.userName.textContent = name;
    els.userAvatar.textContent = name.charAt(0).toUpperCase();
  } else {
    els.signInBtn.hidden = false;
    els.userChip.hidden = true;
  }
}

async function initAuth() {
  try {
    if (puter.auth.isSignedIn()) {
      const user = await puter.auth.getUser();
      updateAuthUI(user);
    } else {
      updateAuthUI(null);
    }
  } catch {
    updateAuthUI(null);
  }
}

els.addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = els.todoInput.value.trim();
  if (!text) return;
  els.todoInput.value = "";
  await addTodo(text);
  els.todoInput.focus();
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter;
    updateUI();
  });
});

els.clearCompletedBtn.addEventListener("click", clearCompleted);
els.clearAllBtn.addEventListener("click", clearAll);

els.signInBtn.addEventListener("click", async () => {
  try {
    await puter.auth.signIn();
    const user = await puter.auth.getUser();
    updateAuthUI(user);
    await loadTodos();
  } catch (err) {
    console.error("Sign in failed:", err);
  }
});

els.signOutBtn.addEventListener("click", async () => {
  await puter.auth.signOut();
  updateAuthUI(null);
  todos = [];
  updateUI();
});

document.addEventListener("DOMContentLoaded", async () => {
  await initAuth();
  await loadTodos();
  updateUI();
  els.todoInput.focus();
});
