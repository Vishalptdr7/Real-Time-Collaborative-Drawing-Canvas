# 🏗️ ARCHITECTURE.md — Real-Time Collaborative Drawing Canvas

This document explains the architectural decisions, data flow, communication protocol, and conflict-handling strategies used in the collaborative real-time drawing application.

---

# 📐 **1. High-Level Architecture Overview**

The system consists of:

* **Client-side application**

  * Layered canvas rendering engine
  * Real-time drawing and cursor broadcasting
  * Operation-based local + remote rendering
  * Undo/Redo manager (local-only per user)
* **Node.js + Socket.IO backend**

  * Room management
  * Operation history & replay
  * Secure per-user undo/redo
  * Cursor message relay
  * Multi-user synchronization
* **Shared data protocol**

  * JSON-based operations for strokes, undo, redo, and cursors

---

# 🔀 **2. Data Flow Diagram**

### **Drawing Event Flow (User → Server → Other Users)**

```
+------------+         +--------------+          +------------------+
|   Browser  | ----->  |  WebSocket   |  ----->  |    All Other     |
| (Canvas.js)| stroke  |   Server     | stroke   |     Clients      |
+------------+         +--------------+          +------------------+
       |                      ^                           |
       | commit stroke        | emit draw-complete        |
       v                      |                           v
+-----------------------+     |                +----------------------+
| Local Canvas Rendering| <--+                |Remote Canvas Rendering|
+-----------------------+                      +----------------------+
```

### **Undo/Redo Flow (Per User Only)**

```
User presses Undo
        |
        v
Client → emit("undo")
        |
        v
Server → undoOwn(userId)  // only undoes their own strokes
        |
        v
Server broadcasts updated active history
        |
        v
All clients → redrawFromHistory()
```

### **Cursor Updates**

```
mousemove → emit("cursor") → broadcast → update remote cursor layers
```

---

# 🛰️ **3. WebSocket Protocol**

Your app uses a clean and modular WebSocket protocol:

---

## **Client → Server Messages**

| Event             | Payload                            | Description               |
| ----------------- | ---------------------------------- | ------------------------- |
| `join`            | `{ roomId, username }`             | Join a drawing room       |
| `stroke`          | `{ x0, y0, x1, y1, color, width }` | Live stroke segment       |
| `stroke-complete` | `{ points[], color, width }`       | Finalized freehand stroke |
| `cursor`          | `{ x, y }`                         | Real-time cursor position |
| `undo`            | none                               | Undo user's last stroke   |
| `redo`            | none                               | Redo user's undone stroke |
| `ping-check`      | timestamp                          | Latency measurement       |
| `stroke-batch`    | array of segments                  | Optional batch mode       |

---

## **Server → Client Messages**

| Event             | Payload                     | Description                    |
| ----------------- | --------------------------- | ------------------------------ |
| `history`         | `[operations...]`           | Full operation list for redraw |
| `users`           | `[userObj...]`              | Active users with colors       |
| `stroke`          | segment                     | Remote live stroke             |
| `stroke-batch`    | batch                       | Remote live stroke batch       |
| `stroke-complete` | operation                   | Final committed operation      |
| `cursor`          | `{ x, y, username, color }` | Remote cursor update           |
| `snapshot`        | pngBase64                   | Optional future snapshot       |
| `pong-check`      | timestamp                   | Ping-pong latency reply        |

---

# ↩️ **4. Undo/Redo Strategy**

### ✔ **Append-Only Operation History**

* No operation is ever deleted.
* Undo and redo create **inverse operations**.

### ✔ **User-Scoped Undo/Redo**

* A user can undo **only their own drawings**.
* Server checks `operation.userId`.

### ✔ **getActiveOperations()**

For redraw, history is computed like:

```
for op in operations:
    if op.type === 'stroke':
         active.add(op)

    if op.type === 'undo':
         active.remove(op.inverseOf)

    if op.type === 'redo':
         active.add(op.redoOf)
```

### ✔ **Redrawing Strategy**

* Server sends updated history after undo/redo.
* Frontend clears main canvas.
* Replays operations in timestamp order.

### ✔ **No Conflicts**

Undo/Redo is **per user**, so two users cannot clash by undoing each other’s work.

---

# ⚡ **5. Performance Decisions**

### **1. Layered Canvas Rendering**

| Layer         | Purpose                    |
| ------------- | -------------------------- |
| Main Canvas   | Final strokes (persistent) |
| Temp Canvas   | Live preview strokes       |
| Cursor Canvas | Remote cursor rendering    |

➡️ Avoids expensive full redraws
➡️ Keeps updates isolated

---

### **2. Segment-based stroke streaming**

Instead of sending all points at once:

```
mousemove → send only (x0, y0 → x1, y1)
```

Benefits:

* Low bandwidth
* Smooth real-time drawing
* Reduced server load

---

### **3. Batching Mode**

Optional batching reduces network pressure by sending many segments at once.

Useful for:

* Slow networks
* Large rooms with 30+ users

---

### **4. Operation-Based History**

Instead of full-snapshot syncing:

* Only send the **new operation**
* New clients reconstruct using operations
* Undo/redo uses inverse ops, not deletion

Benefits:

* Memory-efficient
* Never mutates history
* Easy to sync across any number of clients

---

### **5. No Full Repaint for Every Stroke**

Live strokes are drawn on temp-canvas only.

Full canvas repaint happens only when:

* Undo
* Redo
* New user joins
* History updated

---

# ⚔️ **6. Conflict Resolution**

### ✔ **Simultaneous Drawing (No Conflicts)**

Each stroke is an independent operation.

Two users drawing simultaneously create:

```
opA(timestampA, userA)
opB(timestampB, userB)
```

Sorted by timestamp → deterministic order.

---

### ✔ **Undo Conflict Prevention**

Undo is user-scoped:

```
User A cannot undo stroke from User B
```

This avoids:

* Timeline corruption
* Canvas inconsistency
* Unintentional removal of other drawings

---

### ✔ **Cursor Conflict-Free**

Cursor events do not affect canvas state and never trigger redraws.
They are rendered on an isolated canvas.

---

### ✔ **Late Join Consistency**

A new user gets:

```
full history → redraw → synced instantly
```

No race conditions.

---

# 🧩 **Conclusion**

This architecture ensures:

* Predictable rendering
* Low latency under high load
* Deterministic operation history
* Safe multi-user collaboration
* Fast initialization for late joiners

The system is modular and can be extended to include:

* Shape tools
* Fill modes
* Object selection
* Persistent storage
* Authentication
* Rooms with permissions
