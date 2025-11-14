// Advanced RoomManager powering multi-user collaborative drawing
// Each room owns a DrawingState + user list + metadata
// Works with WebSocketClient + CanvasSystem architecture

const DrawingState = require("./drawing-state");

function uuid() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId → { users, drawingState }
  }

  // -------------------------
  // Ensure room exists
  // -------------------------
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map(), // socketId → user object
        drawingState: new DrawingState(roomId),
      });
    }
    return this.rooms.get(roomId);
  }

  // -------------------------
  // User join
  // -------------------------
  addUser(roomId, socketId, username) {
    const room = this.getRoom(roomId);
    const color = this.assignColor(socketId);

    room.users.set(socketId, {
      id: socketId,
      username,
      color,
    });

    return room.users.get(socketId);
  }

  // -------------------------
  // User leave
  // -------------------------
  removeUser(roomId, socketId) {
    const room = this.getRoom(roomId);
    room.users.delete(socketId);

    // Cleanup: delete room if empty
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  // -------------------------
  // Color assignment (stable per user)
  // -------------------------
  assignColor(socketId) {
    let hash = 0;
    for (let i = 0; i < socketId.length; i++) {
      hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0xffffff).toString(16).toUpperCase();
    return "#" + "000000".substring(0, 6 - c.length) + c;
  }

  // -------------------------
  // User list for client UI
  // -------------------------
  getUsers(roomId) {
    const room = this.getRoom(roomId);
    return [...room.users.values()];
  }

  // -------------------------
  // Operation API wrappers
  // -------------------------
  addOperation(roomId, operation, userId) {
    const room = this.getRoom(roomId);
    return room.drawingState.addOperation(operation, userId);
  }

  // ❌ Disabled: global undo/redo
  // undo(roomId, userId) {
  //   const room = this.getRoom(roomId);
  //   return room.drawingState.undo(userId);
  // }
  //
  // redo(roomId, userId) {
  //   const room = this.getRoom(roomId);
  //   return room.drawingState.redo(userId);
  // }

  // -------------------------
  // Secure per-user undo/redo
  // -------------------------
  undoOwn(roomId, userId) {
    const room = this.getRoom(roomId);
    return room.drawingState.undoOwn(userId);
  }

  redoOwn(roomId, userId) {
    const room = this.getRoom(roomId);
    return room.drawingState.redoOwn(userId);
  }

  // -------------------------
  // Active state operations
  // -------------------------
  getActiveOps(roomId) {
    const room = this.getRoom(roomId);
    return room.drawingState.getActiveOperations();
  }

  // -------------------------
  // Snapshots
  // -------------------------
  getSnapshot(roomId) {
    return this.getRoom(roomId).drawingState.getSnapshot();
  }

  saveSnapshot(roomId, png) {
    this.getRoom(roomId).drawingState.saveSnapshot(png);
  }
}

module.exports = new RoomManager();
