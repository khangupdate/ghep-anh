/* global fabric, PhotoEditApp */
(function () {
  "use strict";

  function createShadow() {
    const enabled = document.getElementById("shadowToggle").checked;
    if (!enabled) return null;

    return new fabric.Shadow({
      color: "rgba(0,0,0,0.58)",
      blur: 10,
      offsetX: 3,
      offsetY: 3
    });
  }

  function addText() {
    const app = window.PhotoEditApp;
    if (!app || !app.hasImage()) {
      app && app.toast("Hãy tải ảnh trước");
      return;
    }

    const content = document.getElementById("textInput").value.trim() || "Nhập chữ";
    const fontSize = Number(document.getElementById("fontSizeInput").value) || 42;
    const fill = document.getElementById("textColorInput").value || "#ffffff";
    const fontFamily = document.getElementById("fontFamilyInput").value || "Arial";
    const canvas = app.canvas;

    const text = new fabric.IText(content, {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: "center",
      originY: "center",
      fontSize,
      fontFamily,
      fill,
      fontWeight: 800,
      editable: true,
      shadow: createShadow(),
      borderColor: "#7fb0ff",
      cornerColor: "#7fb0ff",
      cornerStrokeColor: "#17345c",
      transparentCorners: false,
      padding: 8
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    app.saveHistory();
    app.toast("Đã thêm chữ");
  }

  function deleteSelectedObject() {
    const app = window.PhotoEditApp;
    if (!app) return;

    const active = app.canvas.getActiveObject();
    if (!active) {
      app.toast("Chưa chọn đối tượng");
      return;
    }

    if (active.isBaseImage) {
      app.toast("Không xoá ảnh nền");
      return;
    }

    app.canvas.remove(active);
    app.canvas.discardActiveObject();
    app.canvas.requestRenderAll();
    app.saveHistory();
  }

  function updateActiveText() {
    const app = window.PhotoEditApp;
    if (!app) return;

    const active = app.canvas.getActiveObject();
    if (!active || active.type !== "i-text") return;

    active.set({
      fill: document.getElementById("textColorInput").value,
      fontSize: Number(document.getElementById("fontSizeInput").value) || active.fontSize,
      fontFamily: document.getElementById("fontFamilyInput").value,
      shadow: createShadow()
    });

    app.canvas.requestRenderAll();
  }

  window.PhotoText = {
    init() {
      document.getElementById("addTextBtn").addEventListener("click", addText);
      document.getElementById("deleteObjectBtn").addEventListener("click", deleteSelectedObject);

      ["fontSizeInput", "textColorInput", "fontFamilyInput", "shadowToggle"].forEach((id) => {
        document.getElementById(id).addEventListener("input", updateActiveText);
        document.getElementById(id).addEventListener("change", updateActiveText);
      });
    }
  };
})();
