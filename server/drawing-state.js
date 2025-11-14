// Advanced DrawingState for real-time multi-user collaborative canvas
// Upgraded to support:
// - Operation-based history with unique IDs
// - Global undo/redo that is consistent across all users
// - Inversion-based undo (non-destructive history)
// - Snapshots for efficient redraws
// - Metadata: user, timestamp, room
// - Server-safe serialization

const { v4: uuid } = require("uuid");

class DrawingState {
  constructor(roomId) {
    this.roomId = roomId;

    // Full list of operations, never mutated (append-only)
    // Undo is handled by adding an inverse op rather than removing
    this.operations = [];

    // Optional snapshot to speed up redraw
    this.snapshot = null; // { pngBase64, opIndex }
  }

  // ---------------------
  // CREATE + STORE OPERATION
  // ---------------------

  addOperation(op, userId) {
    const operation = {
      id: uuid(),
      userId,
      roomId: this.roomId,
      type: "stroke", // future: shape, text, image, etc.
      timestamp: Date.now(),
      ...op,
    };

    this.operations.push(operation);
    return operation;
  }

  // ---------------------
  // GLOBAL UNDO
  // ---------------------

  undo(userId) {
    // Find last *active* op (not an undo op)
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

  // ---------------------
  // GLOBAL REDO
  // ---------------------

  redo(userId) {
    // Find last undo op
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
  

  // ---------------------
  // GET ACTIVE STATE FOR REDRAW
  // ---------------------

  /**
   * Compute the list of active operations after undo/redo effects
   */
  getActiveOperations() {
    const active = new Map();

    for (const op of this.operations) {
      if (op.type === "stroke") {
        active.set(op.id, op);
      } else if (op.type === "undo") {
        active.delete(op.inverseOf);
      } else if (op.type === "redo") {
        // redo restores previously undone op
        if (active.has(op.redoOf)) continue;
        const orig = this.operations.find((o) => o.id === op.redoOf);
        if (orig) active.set(orig.id, orig);
      }
    }

    return [...active.values()].sort((a, b) => a.timestamp - b.timestamp);
  }

  // ---------------------
  // SNAPSHOT MANAGEMENT (optional)
  // ---------------------

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

  // ---------------------
  // SERIALIZATION
  // ---------------------

  toJSON() {
    return {
      roomId: this.roomId,
      operations: this.operations,
      snapshot: this.snapshot,
    };
  }
}

module.exports = DrawingState;
