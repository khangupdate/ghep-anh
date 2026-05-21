/* global fabric, PhotoCrop, PhotoCollage, PhotoText, PhotoExport */
(function () {
  "use strict";

  const state = {
    canvas: null,
    hasImage: false,
    history: [],
    redo: [],
    saving: false,
    currentTool: "crop",
    originalWidth: 0,
    originalHeight: 0
  };

  const dom = {};

  function cacheDom() {
    dom.fileInput = document.getElementById("fileInput");
    dom.dropZone = document.getElementById("dropZone");
    dom.emptyState = document.getElementById("emptyState");
    dom.canvasCard = document.getElementById("canvasCard");
    dom.stageWrap = document.querySelector(".stage-wrap");
    dom.toast = document.getElementById("toast");
    dom.undoBtn = document.getElementById("undoBtn");
    dom.redoBtn = document.getElementById("redoBtn");
    dom.mobileUndoBtn = document.getElementById("mobileUndoBtn");
    dom.rotateRange = document.getElementById("rotateRange");
    dom.rotateValue = document.getElementById("rotateValue");
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("show");

    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => {
      dom.toast.classList.remove("show");
    }, 1800);
  }

  function initCanvas() {
    state.canvas = new fabric.Canvas("editorCanvas", {
      preserveObjectStacking: true,
      backgroundColor: "#3e3e3a",
      selectionColor: "rgba(127,176,255,.18)",
      selectionBorderColor: "#7fb0ff"
    });

    state.canvas.on("object:modified", saveHistory);
    state.canvas.on("object:added", () => {
      if (!state.saving) updateButtons();
    });
    state.canvas.on("object:removed", () => {
      if (!state.saving) updateButtons();
    });

    setCanvasSize(640, 640);
  }

  function setCanvasSize(width, height) {
    const maxW = Math.max(260, dom.stageWrap.clientWidth - 32);
    const maxH = Math.max(260, dom.stageWrap.clientHeight - 32);
    const scale = Math.min(maxW / width, maxH / height, 1);

    const displayW = Math.max(220, Math.round(width * scale));
    const displayH = Math.max(220, Math.round(height * scale));

    state.canvas.setWidth(displayW);
    state.canvas.setHeight(displayH);
    state.canvas.calcOffset();
    state.canvas.requestRenderAll();
  }

  function clearCanvas() {
    state.canvas.clear();
    state.canvas.backgroundColor = "#3e3e3a";
  }

  function fitImageToCanvas(image) {
    const canvas = state.canvas;
    const scale = Math.min(canvas.getWidth() / image.width, canvas.getHeight() / image.height);

    image.set({
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: "center",
      originY: "center",
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      isBaseImage: true
    });

    return image;
  }

  function loadImageFromDataUrl(dataUrl, pushHistory = true) {
    fabric.Image.fromURL(dataUrl, (img) => {
      state.originalWidth = img.width;
      state.originalHeight = img.height;

      dom.emptyState.hidden = true;
      dom.canvasCard.hidden = false;

      setCanvasSize(img.width, img.height);
      clearCanvas();

      const baseImage = fitImageToCanvas(img);
      state.canvas.add(baseImage);
      baseImage.moveTo(0);
      state.canvas.requestRenderAll();

      state.hasImage = true;

      if (pushHistory) {
        saveHistory(true);
      } else {
        state.history = [];
        state.redo = [];
        saveHistory(true);
      }

      updateButtons();
    }, { crossOrigin: "anonymous" });
  }

  function readFile(file) {
    if (!file) return;

    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
      toast("File không phải ảnh hợp lệ");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => loadImageFromDataUrl(String(reader.result), false);
    reader.onerror = () => toast("Không đọc được file ảnh");
    reader.readAsDataURL(file);
  }

  function setTool(toolName) {
    state.currentTool = toolName;

    document.querySelectorAll("[data-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === toolName);
    });

    document.querySelectorAll("[data-panel]").forEach((panel) => {
      const panelName = panel.dataset.panel;
      const shouldShow = panelName === toolName || panelName === "export";
      panel.classList.toggle("is-hidden", !shouldShow);
    });

    if (window.innerWidth <= 767) {
      document.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.classList.toggle("is-hidden", panel.dataset.panel !== toolName);
      });
    }
  }

  function bindTools() {
    document.querySelectorAll("[data-tool]").forEach((button) => {
      button.addEventListener("click", () => setTool(button.dataset.tool));
    });
  }

  function getCanvasDataUrl(mimeType = "image/png", quality = 1) {
    return state.canvas.toDataURL({
      format: mimeType.replace("image/", ""),
      quality,
      enableRetinaScaling: true,
      multiplier: 1
    });
  }

  function saveHistory(force = false) {
    if (state.saving || !state.hasImage) return;

    const json = JSON.stringify(state.canvas.toDatalessJSON(["isBaseImage"]));
    const last = state.history[state.history.length - 1];

    if (force || json !== last) {
      state.history.push(json);
      if (state.history.length > 40) state.history.shift();
      state.redo = [];
      updateButtons();
    }
  }

  function loadFromHistory(json) {
    state.saving = true;

    state.canvas.loadFromJSON(json, () => {
      state.canvas.getObjects().forEach((object) => {
        if (object.isBaseImage) {
          object.set({
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false
          });
        }
      });

      state.canvas.renderAll();
      state.saving = false;
      updateButtons();
    });
  }

  function undo() {
    if (state.history.length <= 1) return;

    const current = state.history.pop();
    state.redo.push(current);
    loadFromHistory(state.history[state.history.length - 1]);
  }

  function redo() {
    if (state.redo.length === 0) return;

    const next = state.redo.pop();
    state.history.push(next);
    loadFromHistory(next);
  }

  function updateButtons() {
    dom.undoBtn.disabled = state.history.length <= 1;
    dom.redoBtn.disabled = state.redo.length === 0;
    dom.mobileUndoBtn.disabled = state.history.length <= 1;
  }

  function transformCurrentImage(mode, value) {
    if (!state.hasImage) {
      toast("Hãy tải ảnh trước");
      return;
    }

    const dataUrl = getCanvasDataUrl("image/png", 1);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let width = image.width;
      let height = image.height;

      if (mode === "rotate90") {
        canvas.width = height;
        canvas.height = width;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((Math.PI / 180) * value);
        ctx.drawImage(image, -width / 2, -height / 2);
      }

      if (mode === "flipX" || mode === "flipY") {
        canvas.width = width;
        canvas.height = height;

        ctx.translate(mode === "flipX" ? width : 0, mode === "flipY" ? height : 0);
        ctx.scale(mode === "flipX" ? -1 : 1, mode === "flipY" ? -1 : 1);
        ctx.drawImage(image, 0, 0);
      }

      if (mode === "freeRotate") {
        const angle = (Math.PI / 180) * value;
        const sin = Math.abs(Math.sin(angle));
        const cos = Math.abs(Math.cos(angle));
        canvas.width = Math.ceil(width * cos + height * sin);
        canvas.height = Math.ceil(width * sin + height * cos);

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        ctx.drawImage(image, -width / 2, -height / 2);
      }

      loadImageFromDataUrl(canvas.toDataURL("image/png"), true);
      dom.rotateRange.value = 0;
      dom.rotateValue.textContent = "0°";
    };

    image.src = dataUrl;
  }

  function bindImageInput() {
    dom.fileInput.addEventListener("change", (event) => {
      readFile(event.target.files && event.target.files[0]);
      event.target.value = "";
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dom.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dom.dropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dom.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dom.dropZone.classList.remove("drag-over");
      });
    });

    dom.dropZone.addEventListener("drop", (event) => {
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      readFile(file);
    });

    dom.dropZone.addEventListener("click", () => dom.fileInput.click());
  }

  function bindRotate() {
    document.getElementById("rotateLeftBtn").addEventListener("click", () => transformCurrentImage("rotate90", -90));
    document.getElementById("rotateRightBtn").addEventListener("click", () => transformCurrentImage("rotate90", 90));
    document.getElementById("flipXBtn").addEventListener("click", () => transformCurrentImage("flipX"));
    document.getElementById("flipYBtn").addEventListener("click", () => transformCurrentImage("flipY"));

    dom.rotateRange.addEventListener("input", () => {
      dom.rotateValue.textContent = `${dom.rotateRange.value}°`;
    });

    document.getElementById("applyRotateBtn").addEventListener("click", () => {
      const value = Number(dom.rotateRange.value);
      if (value === 0) return;
      transformCurrentImage("freeRotate", value);
    });
  }

  function bindKeyboardShortcuts() {
    window.addEventListener("keydown", (event) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if ((modifier && event.key.toLowerCase() === "y") || (modifier && event.shiftKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        redo();
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const active = state.canvas.getActiveObject();
        const tag = document.activeElement && document.activeElement.tagName;
        const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);

        if (active && !active.isBaseImage && !isTyping) {
          event.preventDefault();
          state.canvas.remove(active);
          state.canvas.requestRenderAll();
          saveHistory();
        }
      }
    });
  }

  function bindResize() {
    let resizeTimer = null;

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!state.hasImage) return;

        const dataUrl = getCanvasDataUrl("image/png", 1);
        loadImageFromDataUrl(dataUrl, true);
        setTool(state.currentTool);
      }, 240);
    });
  }

  function init() {
    cacheDom();
    initCanvas();
    bindImageInput();
    bindTools();
    bindRotate();
    bindKeyboardShortcuts();
    bindResize();

    dom.undoBtn.addEventListener("click", undo);
    dom.redoBtn.addEventListener("click", redo);
    dom.mobileUndoBtn.addEventListener("click", undo);

    PhotoCrop.init();
    PhotoCollage.init();
    PhotoText.init();
    PhotoExport.init();

    setTool("crop");
    updateButtons();
  }

  window.PhotoEditApp = {
    get canvas() { return state.canvas; },
    hasImage: () => state.hasImage,
    toast,
    loadImageFromDataUrl,
    getCanvasDataUrl,
    saveHistory
  };

  document.addEventListener("DOMContentLoaded", init);
})();
