/* global PhotoEditApp */
(function () {
  "use strict";

  function getExtension(mimeType) {
    if (mimeType === "image/jpeg") return "jpg";
    if (mimeType === "image/webp") return "webp";
    return "png";
  }

  function exportImage() {
    const app = window.PhotoEditApp;
    if (!app || !app.hasImage()) {
      app && app.toast("Hãy tải ảnh trước");
      return;
    }

    const mimeType = document.getElementById("exportFormat").value || "image/png";
    const quality = Number(document.getElementById("qualityRange").value) / 100;

    app.canvas.discardActiveObject();
    app.canvas.requestRenderAll();

    const dataUrl = app.getCanvasDataUrl(mimeType, quality);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `photoedit-${Date.now()}.${getExtension(mimeType)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    app.toast("Đã xuất ảnh");
  }

  window.PhotoExport = {
    init() {
      const qualityRange = document.getElementById("qualityRange");
      const qualityValue = document.getElementById("qualityValue");

      qualityRange.addEventListener("input", () => {
        qualityValue.textContent = `${qualityRange.value}%`;
      });

      document.getElementById("exportBtn").addEventListener("click", exportImage);
      document.getElementById("exportBtnTop").addEventListener("click", exportImage);
      document.getElementById("mobileExportBtn").addEventListener("click", exportImage);
    }
  };
})();
