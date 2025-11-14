// Fully upgraded main.js aligned with CanvasSystem + WebSocketClient
// Handles: room join, tools, batching mode, users list, latency, FPS, undo/redo, canvas wiring

window.addEventListener("load", () => {
  console.log("Main.js loaded");

  // -------------------------
  // 1. INIT CLIENT CORE
  // -------------------------

  const canvas = new CanvasSystem();
  const ws = new WebSocketClient(window.location.origin);

  // -------------------------
  // 2. UI ELEMENTS
  // -------------------------

  const usernameInput = document.getElementById("username");
  const roomInput = document.getElementById("roomId");
  const joinBtn = document.getElementById("joinBtn");

  const colorPicker = document.getElementById("colorPicker");
  const strokeWidth = document.getElementById("strokeWidth");
  const strokeValue = document.getElementById("strokeValue");
  const brushBtn = document.getElementById("brushBtn");
  const eraserBtn = document.getElementById("eraserBtn");
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  const batchMode = document.getElementById("batchMode");
  const usersList = document.getElementById("usersList");

  const connectionStatus = document.getElementById("connectionStatus");
  const latencyDom = document.getElementById("latency");
  const fpsDom = document.getElementById("fps");

  // Track FPS
  let lastFrame = performance.now();
  let frames = 0;
  setInterval(() => {
    const now = performance.now();
    frames++;
    if (now - lastFrame >= 1000) {
      fpsDom.textContent = `FPS: ${frames}`;
      frames = 0;
      lastFrame = now;
    }
  }, 16);

  // -------------------------
  // 3. JOIN ROOM
  // -------------------------

  joinBtn.addEventListener("click", () => {
    const name = usernameInput.value.trim();
    const room = roomInput.value.trim();

    if (!name) {
      alert("Enter username");
      return;
    }

    if (!room) {
      alert("Enter room id");
      return;
    }

    ws.connect();
    ws.on("connection", ({ status }) => {
      if (status === "connected") {
        ws.joinRoom(room, name);
      }
    });
  });

  // -------------------------
  // 4. TOOL PANEL
  // -------------------------

  colorPicker.addEventListener("change", (e) =>
    canvas.colorSet(e.target.value)
  );
  strokeWidth.addEventListener("input", (e) => {
    const w = +e.target.value;
    canvas.widthSet(w);
    strokeValue.textContent = w;
  });

  brushBtn.addEventListener("click", () => {
    canvas.toolSet("brush");
    brushBtn.classList.add("active");
    eraserBtn.classList.remove("active");
  });

  eraserBtn.addEventListener("click", () => {
    canvas.toolSet("eraser");
    eraserBtn.classList.add("active");
    brushBtn.classList.remove("active");
  });

  undoBtn.addEventListener("click", () => ws.emitUndo());
  redoBtn.addEventListener("click", () => ws.emitRedo());

  // -------------------------
  // 5. Canvas → WS
  // -------------------------

  canvas.on("stroke", (segment) => {
    const batching = batchMode.value === "batch";
    ws.emitStrokePoint(segment, batching);
  });

  canvas.on("stroke-complete", (op) => {
    ws.emitStrokeComplete(op);
  });

  canvas.on("cursor-move", (p) => {
    const user = usernameInput.value || "user";
    ws.emitCursor({
      x: p.x,
      y: p.y,
      username: user,
    });
  });

  // -------------------------
  // 6. WS → Canvas Rendering
  // -------------------------

  ws.on("stroke", (segment) => canvas.drawTemp(segment));
  ws.on("stroke-complete", (op) => canvas.drawOp(op));
  ws.on("history", (ops) => canvas.redraw(ops));

  ws.on("cursor", (c) => {
    canvas.updateCursor({
      x: c.x,
      y: c.y,
      socketId: c.socketId,
      color: c.color,
    });
  });

  ws.on("users", (users) => {
    usersList.innerHTML = "";
    for (const u of users) {
      const li = document.createElement("li");
      li.textContent = `${u.username}`;
      usersList.append(li);
    }
  });

  // -------------------------
  // 7. Connection Status & Latency
  // -------------------------

  ws.on("connection", ({ status }) => {
    connectionStatus.textContent = status;
  });

  ws.on("latency", (ms) => {
    latencyDom.textContent = `Latency: ${ms} ms`;
  });

  ws.startLatencyCheck();
});
