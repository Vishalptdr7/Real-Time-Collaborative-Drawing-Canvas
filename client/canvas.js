// Advanced Canvas system with layered canvases
// Aligned with assignment: main-canvas, temp-canvas, cursor-canvas
// Smooth drawing, batching support, remote cursors, full redraw pipeline

class CanvasSystem {
  constructor() {
    // Layered canvases
    this.main = document.getElementById("main-canvas");
    this.temp = document.getElementById("temp-canvas");
    this.cursor = document.getElementById("cursor-canvas");

    this.mainCtx = this.main.getContext("2d");
    this.tempCtx = this.temp.getContext("2d");
    this.cursorCtx = this.cursor.getContext("2d");

    this.setDimensions();
    window.addEventListener("resize", () => this.setDimensions());

    // Local drawing state
    this.isDrawing = false;
    this.last = null;
    this.currentPoints = [];

    // Active tool settings
    this.tool = "brush";
    this.color = "#000000";
    this.width = 5;

    // Event system
    this.listeners = new Map();

    // Bind events
    this.temp.addEventListener("mousedown", (e) => this.pointerDown(e));
    this.temp.addEventListener("mousemove", (e) => this.pointerMove(e));
    this.temp.addEventListener("mouseup", () => this.pointerUp());
    this.temp.addEventListener("mouseout", () => this.pointerUp());
  }

  setDimensions() {
    const rect = this.main.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    [this.main, this.temp, this.cursor].forEach((c) => {
      c.width = w;
      c.height = h;
    });
  }

  on(ev, cb) {
    if (!this.listeners.has(ev)) this.listeners.set(ev, []);
    this.listeners.get(ev).push(cb);
  }

  emit(ev, data) {
    if (this.listeners.has(ev)) {
      for (const cb of this.listeners.get(ev)) cb(data);
    }
  }

  toolSet(tool) {
    this.tool = tool;
  }
  colorSet(color) {
    this.color = color;
  }
  widthSet(w) {
    this.width = w;
  }

  pointerPos(e) {
    const r = this.temp.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  pointerDown(e) {
    const p = this.pointerPos(e);
    this.isDrawing = true;
    this.last = p;
    this.currentPoints = [p];

    this.emit("cursor-move", p);
  }

  pointerMove(e) {
    const p = this.pointerPos(e);
    this.emit("cursor-move", p);

    if (!this.isDrawing) return;

    const seg = {
      x0: this.last.x,
      y0: this.last.y,
      x1: p.x,
      y1: p.y,
      color: this.tool === "eraser" ? "rgba(0,0,0,1)" : this.color,
      width: this.width,
      tool: this.tool,
    };

    this.drawTemp(seg);
    this.emit("stroke", seg);
    this.currentPoints.push(p);
    this.last = p;
  }

  pointerUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.tempCtx.clearRect(0, 0, this.temp.width, this.temp.height);

    this.emit("stroke-complete", {
      tool: this.tool,
      color: this.tool === "eraser" ? "rgba(0,0,0,1)" : this.color,
      width: this.width,
      points: this.currentPoints,
    });

    this.currentPoints = [];
  }

  drawTemp(seg) {
    const ctx = this.tempCtx;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.lineWidth = seg.width;
    ctx.strokeStyle = seg.color;
    ctx.globalCompositeOperation =
      seg.tool === "eraser" ? "destination-out" : "source-over";

    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    ctx.stroke();
  }

  drawOp(op) {
    const ctx = this.mainCtx;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.lineWidth = op.width;
    ctx.strokeStyle = op.color;
    ctx.globalCompositeOperation =
      op.tool === "eraser" ? "destination-out" : "source-over";

    const pts = op.points;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  redraw(ops) {
    this.mainCtx.clearRect(0, 0, this.main.width, this.main.height);
    for (const op of ops) this.drawOp(op);
  }

  // Remote cursor rendering
  updateCursor({ x, y, socketId, color }) {
    const ctx = this.cursorCtx;
    ctx.clearRect(0, 0, this.cursor.width, this.cursor.height);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

window.CanvasSystem = CanvasSystem;
