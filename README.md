# 🎨 Real-Time Collaborative Drawing Canvas

A real-time multi-user collaborative drawing application built using **Vanilla JavaScript**, **HTML5 Canvas**, **Node.js**, and **WebSockets (Socket.io)**.

This project demonstrates real-time synchronization, layered canvas rendering, collaborative editing, global history management, and secure undo/redo — all implemented with zero frontend frameworks.

---

## 🚀 Features

### ✏️ Drawing Tools  
- Smooth freehand drawing  
- Adjustable stroke width  
- Color picker  
- Eraser tool  
- Brush/Eraser toggle  

### 👥 Multi-User Collaboration  
- Real-time drawing shared with all users in the same room  
- Live remote cursor indicators  
- User list with assigned unique colors  
- New users instantly load the full existing canvas history  
- Each user has isolated undo/redo (cannot undo other people’s work)

### ↩️ Collaborative Undo / Redo  
- Operation-based history  
- Users can undo/redo **only their own drawing operations**  
- History syncs instantly across all users  
- Non-destructive (append-only) operation tracking  

### 📐 Layered Canvas Architecture  
- **Main canvas** → final drawing  
- **Temp canvas** → live strokes preview  
- **Cursor canvas** → remote user cursors  

---

# 🛠️ Setup Instructions

### **1. Clone the repository**
```bash
git clone https://github.com/your-user/collaborative-canvas.git
cd collaborative-canvas
```

### **2. Install dependencies**
```bash
npm install
```

### **3. Start the server**
```bash
npm start
```

### **4. Open the app**
Visit:
```
http://localhost:3000
```

### **5. Testing with multiple users**
Open the same room in multiple tabs:
```
http://localhost:3000/room/room123
```

---

# 🧪 How to Test with Multiple Users

✔ Open multiple browser tabs  
✔ Draw in one tab → updates instantly in all tabs  
✔ Undo/Redo affects ONLY your own strokes  
✔ Move your mouse → others see your cursor  
✔ New tab joining the room loads the full canvas history  

---

# 🐞 Known Limitations / Bugs

### 🔸 1. Eraser only affects your strokes
For fairness and safety, users cannot delete others’ drawings.

### 🔸 2. Undo/Redo history is per-user  
Global admin undo is not implemented.

### 🔸 3. High-frequency drawing may cause bandwidth spikes  
Batch mode recommended for large rooms.

### 🔸 4. No shape tools (by design)  
The app focuses on freehand drawing only.

### 🔸 5. No authentication  
Room access is open via URL.

---

# ⏱️ Time Spent on the Project

| Task | Time Spent |
|------|------------|
| Canvas architecture & tools | **4 hours** |
| WebSocket realtime sync | **5 hours** |
| Cursor tracking system | **1 hour** |
| Undo/Redo state engine | **4 hours** |
| Room management | **2 hours** |
| Debugging & testing | **2 hours** |
| UI & UX cleanup | **1 hour** |
| Documentation | **1 hour** |

### **Total: ~20 hours**

---

# 📦 Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js
│   ├── websocket.js
│   ├── main.js
├── server/
│   ├── server.js
│   ├── room.js
│   ├── drawing-state.js
├── package.json
├── README.md
└── ARCHITECTURE.md
```

---

# 📜 License
MIT License — free for personal and commercial use.

---

# 🙌 Acknowledgements
This project was built to demonstrate mastery of:

- HTML5 Canvas  
- Real-time communication (Socket.IO)  
- State synchronization  
- Collaborative editing algorithms  
- Node.js server development  

