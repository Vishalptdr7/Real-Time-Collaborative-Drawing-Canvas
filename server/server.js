// Fully upgraded server.js for real-time collaborative drawing
// Supports: rooms, users, full operation history, undo/redo, snapshots, batching, latency, cursors

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const roomManager = require("./room");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://real-time-collaborative-drawing-can-navy.vercel.app/",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// -------------------------
// STATIC FILES
// -------------------------

const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// -------------------------
// SOCKET HANDLER
// -------------------------

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // -------------------------
  // JOIN ROOM
  // -------------------------
  socket.on("join", ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;

    const user = roomManager.addUser(roomId, socket.id, username);

    // Send active history to newly joined user
    const activeOps = roomManager.getActiveOps(roomId);
    socket.emit("history", activeOps);

    // Broadcast updated user list
    io.to(roomId).emit("users", roomManager.getUsers(roomId));
  });

  // -------------------------
  // LIVE STROKES
  // -------------------------
  socket.on("stroke", (segment) => {
    const r = socket.roomId;
    if (!r) return;
    socket.broadcast.to(r).emit("stroke", segment);
  });

  socket.on("stroke-batch", (batch) => {
    const r = socket.roomId;
    if (!r) return;
    socket.broadcast.to(r).emit("stroke-batch", batch);
  });

  // -------------------------
  // STROKE COMMIT
  // -------------------------
  socket.on("stroke-complete", (op) => {
    const r = socket.roomId;
    if (!r) return;

    const opObj = roomManager.addOperation(r, op, socket.id);

    io.to(r).emit("stroke-complete", opObj);
  });

  // -------------------------
  // CURSORS
  // -------------------------
  socket.on("cursor", (data) => {
    const r = socket.roomId;
    if (!r) return;

    const user = roomManager.getRoom(r).users.get(socket.id);

    socket.broadcast.to(r).emit("cursor", {
      x: data.x,
      y: data.y,
      username: user.username,
      socketId: socket.id,
      color: user.color,
    });
  });

  // -------------------------
  // SECURE UNDO (only undo own strokes)
  // -------------------------
  socket.on("undo", () => {
    const r = socket.roomId;
    if (!r) return;

    const inverse = roomManager.undoOwn(r, socket.id);
    if (!inverse) return;

    const active = roomManager.getActiveOps(r);
    io.to(r).emit("history", active);
  });

  // -------------------------
  // SECURE REDO (only redo own strokes)
  // -------------------------
  socket.on("redo", () => {
    const r = socket.roomId;
    if (!r) return;

    const redoOp = roomManager.redoOwn(r, socket.id);
    if (!redoOp) return;

    const active = roomManager.getActiveOps(r);
    io.to(r).emit("history", active);
  });

  // -------------------------
  // SNAPSHOT SYNC
  // -------------------------
  socket.on("request-snapshot", () => {
    const r = socket.roomId;
    if (!r) return;
    const snap = roomManager.getSnapshot(r);
    if (snap) socket.emit("snapshot", snap);
  });

  // -------------------------
  // LATENCY
  // -------------------------
  socket.on("ping-check", (time) => {
    socket.emit("pong-check", time);
  });

  // -------------------------
  // DISCONNECT
  // -------------------------
  socket.on("disconnect", () => {
    const r = socket.roomId;
    if (!r) return;

    roomManager.removeUser(r, socket.id);

    io.to(r).emit("users", roomManager.getUsers(r));
    io.to(r).emit("cursor", { remove: socket.id });
  });
});

// -------------------------
// START SERVER
// -------------------------

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
