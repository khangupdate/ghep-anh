/* global PhotoEditApp */
(function () {
  "use strict";

  let pendingFile = null;

  function getExtension(mimeType) {
    if (mimeType === "image/jpeg") return "jpg";
    if (mimeType === "image/webp") return "webp";
    return "png";
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const header = parts[0] || "";
    const data = parts[1] || "";
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    const bytes = atob(data);
    const buffer = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i += 1) {
      buffer[i] = bytes.charCodeAt(i);
    }

    return new Blob([buffer], { type: mimeType });
  }

  function makeFile(dataUrl, mimeType) {
    const blob = dataUrlToBlob(dataUrl);
    const type = mimeType || blob.type || "image/png";
    const name = `photoedit-${Date.now()}.${getExtension(type)}`;
    return new File([blob], name, { type });
  }

  async function saveWithNativeBridge(dataUrl) {
    const media = window.Capacitor
      && window.Capacitor.Plugins
      && window.Capacitor.Plugins.Media;

    if (!media || typeof media.savePhoto !== "function") return false;

    await media.savePhoto({ path: dataUrl });
    return true;
  }

  function canShareFile(file) {
    if (!navigator.share) return false;
    if (!navigator.canShare) return true;

    try {
      return navigator.canShare({ files: [file] });
    } catch (_) {
      return false;
    }
  }

  async function shareFile(file) {
    if (!canShareFile(file)) return false;

    await navigator.share({
      files: [file],
      title: "PhotoEdit",
      text: "Ảnh đã ghép từ PhotoEdit"
    });

    return true;
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function saveDataUrl(dataUrl, options = {}) {
    const app = window.PhotoEditApp;
    const mimeType = options.mimeType || "image/png";
    const automatic = Boolean(options.automatic);
    const file = makeFile(dataUrl, mimeType);

    pendingFile = file;

    try {
      if (await saveWithNativeBridge(dataUrl)) {
        pendingFile = null;
        app && app.toast("Đã lưu vào thư viện ảnh");
        return { saved: true, method: "native" };
      }
    } catch (error) {
      console.warn("Native photo save failed:", error);
    }

    if (isIOS()) {
      const userActivationActive = !navigator.userActivation || navigator.userActivation.isActive;

      if (!automatic || userActivationActive) {
        try {
          if (await shareFile(file)) {
            pendingFile = null;
            app && app.toast("Đã mở lưu ảnh trên iPhone");
            return { saved: true, method: "share" };
          }
        } catch (error) {
          if (error && error.name === "AbortError") {
            app && app.toast("Đã huỷ lưu ảnh");
            return { saved: false, method: "share-cancelled" };
          }

          console.warn("iOS share failed:", error);
        }
      }

      if (automatic) {
        app && app.toast("Ảnh đã ghép — chạm Xuất để lưu vào Ảnh");
        return { saved: false, method: "ios-needs-tap" };
      }
    }

    downloadFile(file);
    pendingFile = null;
    app && app.toast("Đã tải ảnh");
    return { saved: true, method: "download" };
  }

  async function exportImage() {
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

    if (pendingFile && isIOS()) {
      try {
        if (await shareFile(pendingFile)) {
          pendingFile = null;
          app.toast("Đã mở lưu ảnh trên iPhone");
          return;
        }
      } catch (error) {
        if (error && error.name === "AbortError") {
          app.toast("Đã huỷ lưu ảnh");
          return;
        }

        console.warn("Pending iOS share failed:", error);
      }
    }

    await saveDataUrl(dataUrl, { mimeType, automatic: false });
  }

  window.PhotoExport = {
    saveDataUrl,

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
