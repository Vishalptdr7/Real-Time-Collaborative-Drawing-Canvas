// Enhanced WebSocketClient for collaborative canvas
// Fully aligned with assignment requirements: rooms, batching, protocol, reconnection, latency, user-join sync

class WebSocketClient {
  constructor(url) {
    this.socket = io(url, {
      autoConnect: false, // connect only when user clicks Join
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 2000,
      timeout: 5000,
    });

    this.eventListeners = new Map();
    this.pendingBatch = []; // for batched drawing mode
    this.batchInterval = null;

    this.lastPing = null;

    // ---- Incoming events from server ----

    this.socket.on("connect", () => {
      console.log("Connected!", this.socket.id);
      this.trigger("connection", { status: "connected", id: this.socket.id });
    });

    this.socket.on("disconnect", () => {
      this.trigger("connection", { status: "disconnected" });
    });

    // Server pings for latency measurement
    this.socket.on("pong-check", (serverTime) => {
      const now = Date.now();
      const latency = now - serverTime;
      this.trigger("latency", latency);
    });

    // --- Protocol Events ---

    this.socket.on("history", (history) => {
      this.trigger("history", history);
    });

    this.socket.on("stroke", (strokeData) => {
      // live stroke points from other users
      this.trigger("stroke", strokeData);
    });

    this.socket.on("stroke-complete", (operation) => {
      // when another user finishes a stroke (committed op)
      this.trigger("stroke-complete", operation);
    });

    this.socket.on("cursor", (cursor) => {
      this.trigger("cursor", cursor);
    });

    this.socket.on("users", (users) => {
      this.trigger("users", users);
    });

    this.socket.on("undo", (opId) => {
      this.trigger("undo", opId);
    });

    this.socket.on("redo", (opId) => {
      this.trigger("redo", opId);
    });

    this.socket.on("snapshot", (pngBase64) => {
      this.trigger("snapshot", pngBase64);
    });
  }

  // -------------------- Public API --------------------

  connect() {
    this.socket.connect();
  }

  joinRoom(roomId, username) {
    this.socket.emit("join", { roomId, username });
  }

  // ---- Drawing ----
  emitStrokePoint(point, batching = false) {
    if (!batching) {
      this.socket.emit("stroke", point);
      return;
    }

    this.pendingBatch.push(point);

    if (!this.batchInterval) {
      this.batchInterval = setInterval(() => {
        if (this.pendingBatch.length > 0) {
          this.socket.emit("stroke-batch", this.pendingBatch);
          this.pendingBatch = [];
        }
      }, 50); // batch every 50ms
    }
  }

  emitStrokeComplete(operation) {
    this.socket.emit("stroke-complete", operation);
  }

  // ---- Cursors ----
  emitCursor(cursorData) {
    this.socket.emit("cursor", cursorData);
  }

  // ---- Undo/Redo ----
  emitUndo() {
    this.socket.emit("undo");
  }

  emitRedo() {
    this.socket.emit("redo");
  }

  // ---- Snapshot persistence ----
  requestSnapshot() {
    this.socket.emit("request-snapshot");
  }

  requestHistory() {
    this.socket.emit("request-history");
  }

  // ---- Latency Ping ----
  startLatencyCheck() {
    setInterval(() => {
      this.socket.emit("ping-check", Date.now());
    }, 1500);
  }

  // ---------------- Event System ----------------

  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
  }

  trigger(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      for (const cb of this.eventListeners.get(eventName)) {
        cb(data);
      }
    }
  }
}

// export for main.js and canvas.js
window.WebSocketClient = WebSocketClient;
