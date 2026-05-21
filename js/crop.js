/* global Cropper, PhotoEditApp */
(function () {
  "use strict";

  let cropper = null;
  let selectedRatio = "free";

  function getRatioValue() {
    if (selectedRatio === "free") return NaN;
    const value = Number(selectedRatio);
    return Number.isFinite(value) ? value : NaN;
  }

  function bindRatioButtons() {
    document.querySelectorAll("[data-ratio]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-ratio]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        selectedRatio = button.dataset.ratio || "free";

        if (cropper) {
          cropper.setAspectRatio(getRatioValue());
        }
      });
    });
  }

  function openCropModal(dataUrl) {
    const modal = document.getElementById("cropModal");
    const image = document.getElementById("cropImage");
    let didInit = false;

    if (cropper) cropper.destroy();
    cropper = null;

    function initCropper() {
      if (didInit) return;
      didInit = true;

      if (typeof Cropper === "undefined") {
        window.PhotoEditApp && window.PhotoEditApp.toast("Không tải được công cụ cắt ảnh");
        closeCropModal();
        return;
      }

      cropper = new Cropper(image, {
        viewMode: 1,
        autoCropArea: 0.86,
        responsive: true,
        background: false,
        movable: true,
        zoomable: true,
        rotatable: false,
        scalable: false,
        aspectRatio: getRatioValue()
      });
    }

    image.onload = initCropper;

    image.onerror = () => {
      window.PhotoEditApp && window.PhotoEditApp.toast("Không mở được ảnh để cắt");
      closeCropModal();
    };

    modal.hidden = false;
    image.src = dataUrl;

    if (image.complete && image.naturalWidth > 0) {
      initCropper();
    }
  }

  function closeCropModal() {
    const modal = document.getElementById("cropModal");
    const image = document.getElementById("cropImage");

    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    image.removeAttribute("src");
    modal.hidden = true;
  }

  function applyCrop() {
    if (!cropper) {
      window.PhotoEditApp && window.PhotoEditApp.toast("Khung cắt chưa sẵn sàng");
      return;
    }

    const cropped = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high"
    });

    if (!cropped) return;

    const dataUrl = cropped.toDataURL("image/png");
    closeCropModal();

    if (window.PhotoEditApp) {
      window.PhotoEditApp.loadImageFromDataUrl(dataUrl, true);
      window.PhotoEditApp.toast("Đã cắt ảnh");
    }
  }

  window.PhotoCrop = {
    init() {
      bindRatioButtons();

      document.getElementById("openCropBtn").addEventListener("click", () => {
        if (!window.PhotoEditApp || !window.PhotoEditApp.hasImage()) {
          window.PhotoEditApp && window.PhotoEditApp.toast("Hãy tải ảnh trước");
          return;
        }
        openCropModal(window.PhotoEditApp.getCanvasDataUrl("image/png", 1));
      });

      document.getElementById("applyCropBtn").addEventListener("click", applyCrop);
      document.getElementById("closeCropBtn").addEventListener("click", closeCropModal);
      document.getElementById("cancelCropBtn").addEventListener("click", closeCropModal);

      document.getElementById("cropModal").addEventListener("click", (event) => {
        if (event.target.id === "cropModal") closeCropModal();
      });
    }
  };
})();
