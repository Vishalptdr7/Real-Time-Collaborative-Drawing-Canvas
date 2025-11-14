// Advanced DrawingState for real-time multi-user collaborative canvas
// Supports:
// - Operation-based history with unique IDs
// - User-owned strokes (only owner can undo/redo)
// - Inversion-based undo (append-only history)
// - Snapshots for efficient redraws
// - Metadata: user, timestamp, room
// - Secure per-user permissions

const { v4: uuid } = require("uuid");

class DrawingState {
  constructor(roomId) {
    this.roomId = roomId;

    // Append-only list of operations
    this.operations = [];

    // Optional snapshot for faster redraw
    this.snapshot = null;
  }

  // ----------------------------------------------------------
  // ADD OPERATION (stroke commit)
  // ----------------------------------------------------------
  addOperation(op, userId) {
    const operation = {
      id: uuid(),
      userId,
      roomId: this.roomId,
      type: "stroke",
      timestamp: Date.now(),
      ...op,
    };

    this.operations.push(operation);
    return operation;
  }

  // ----------------------------------------------------------
  // GLOBAL UNDO (any user can undo last stroke — not used now)
  // ----------------------------------------------------------
  undo(userId) {
    const last = [...this.operations].reverse().find((o) => !o.inverseOf);
    if (!last) return null;

    const inverse = {
      id: uuid(),
      userId,
      roomId: this.roomId,
      type: "undo",
      inverseOf: last.id,
      timestamp: Date.now(),
    };

    this.operations.push(inverse);
    return inverse;
  }

  // ----------------------------------------------------------
  // GLOBAL REDO (not used now)
  // ----------------------------------------------------------
  redo(userId) {
    const lastUndo = [...this.operations]
      .reverse()
      .find((o) => o.type === "undo");
    if (!lastUndo) return null;

    const redoOp = {
      id: uuid(),
      userId,
      roomId: this.roomId,
      type: "redo",
      redoOf: lastUndo.inverseOf,
      timestamp: Date.now(),
    };

    this.operations.push(redoOp);
    return redoOp;
  }

  // ----------------------------------------------------------
  // SECURE PER-USER UNDO (core feature)
  // ----------------------------------------------------------
  undoOwn(userId) {
    // find last stroke created by THIS user only
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];

      // skip non-stroke operations
      if (op.type !== "stroke") continue;

      // only undo user's own strokes
      if (op.userId !== userId) continue;

      const inverse = {
        id: uuid(),
        userId,
        roomId: this.roomId,
        type: "undo",
        inverseOf: op.id,
        timestamp: Date.now(),
      };

      this.operations.push(inverse);
      return inverse;
    }

    return null; // user owns no strokes to undo
  }

  // ----------------------------------------------------------
  // SECURE PER-USER REDO
  // ----------------------------------------------------------
  redoOwn(userId) {
    // find last undo done by THIS user
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];

      if (op.type !== "undo") continue;
      if (op.userId !== userId) continue;

      const redoOp = {
        id: uuid(),
        userId,
        roomId: this.roomId,
        type: "redo",
        redoOf: op.inverseOf,
        timestamp: Date.now(),
      };

      this.operations.push(redoOp);
      return redoOp;
    }

    return null; // nothing to redo
  }

  // ----------------------------------------------------------
  // ACTIVE OPERATIONS (after undo/redo effects)
  // ----------------------------------------------------------
  getActiveOperations() {
    const active = new Map();

    for (const op of this.operations) {
      if (op.type === "stroke") {
        active.set(op.id, op); // add stroke
      }

      if (op.type === "undo") {
        active.delete(op.inverseOf); // remove stroke
      }

      if (op.type === "redo") {
        const original = this.operations.find((o) => o.id === op.redoOf);
        if (original) active.set(original.id, original);
      }
    }

    return [...active.values()].sort((a, b) => a.timestamp - b.timestamp);
  }

  // ----------------------------------------------------------
  // SNAPSHOTS (optional performance feature)
  // ----------------------------------------------------------
  saveSnapshot(pngBase64) {
    this.snapshot = {
      pngBase64,
      opIndex: this.operations.length,
      timestamp: Date.now(),
    };
  }

  getSnapshot() {
    return this.snapshot;
  }

  // ----------------------------------------------------------
  // SERIALIZATION
  // ----------------------------------------------------------
  toJSON() {
    return {
      roomId: this.roomId,
      operations: this.operations,
      snapshot: this.snapshot,
    };
  }
}

module.exports = DrawingState;
