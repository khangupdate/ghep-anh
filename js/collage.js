/* global PhotoEditApp */
(function () {
  "use strict";

  const MIN_IMAGES = 2;
  const MAX_IMAGES = 5;
  const statusText = {
    empty: "Chưa chọn ảnh",
    loading: "Đang ghép ảnh..."
  };
  let selectedFiles = [];

  function setStatus(message) {
    const status = document.getElementById("collageStatus");
    if (status) status.textContent = message;
  }

  function isImageFile(file) {
    return /^image\//.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Không đọc được file ảnh"));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Không mở được một ảnh trong danh sách"));
      image.src = dataUrl;
    });
  }

  function createRowLayouts(count) {
    const layouts = [];

    function walk(start, rows) {
      if (start === count) {
        layouts.push(rows.map((row) => row.slice()));
        return;
      }

      for (let size = 1; size <= count - start; size += 1) {
        const row = Array.from({ length: size }, (_, offset) => start + offset);
        walk(start + size, rows.concat([row]));
      }
    }

    walk(0, []);
    return layouts;
  }

  function getPermutations(items) {
    const results = [];

    function walk(remaining, ordered) {
      if (remaining.length === 0) {
        results.push(ordered);
        return;
      }

      remaining.forEach((item, index) => {
        const next = remaining.slice(0, index).concat(remaining.slice(index + 1));
        walk(next, ordered.concat(item));
      });
    }

    walk(items, []);
    return results;
  }

  function getAspect(image) {
    return image.naturalWidth / image.naturalHeight;
  }

  function buildRows(images, layout, outputWidth) {
    return layout.map((row) => {
      const rowImages = row.map((index) => images[index]);
      const aspectTotal = rowImages.reduce((total, image) => total + getAspect(image), 0);
      const height = Math.round(outputWidth / aspectTotal);
      let usedWidth = 0;

      const items = rowImages.map((image, index) => {
        const isLast = index === rowImages.length - 1;
        const width = isLast ? outputWidth - usedWidth : Math.round(getAspect(image) * height);
        usedWidth += width;

        return { image, width, height };
      });

      return {
        items,
        width: outputWidth,
        height
      };
    });
  }

  function chooseBestRows(images) {
    const outputWidth = Math.min(4096, Math.max(1000, ...images.map((image) => image.naturalWidth)));
    const layouts = createRowLayouts(images.length);
    const orders = getPermutations(images);

    return orders.reduce((best, orderedImages) => {
      return layouts.reduce((currentBest, layout) => {
        const rows = buildRows(orderedImages, layout, outputWidth);
        const width = outputWidth;
        const height = rows.reduce((total, row) => total + row.height, 0);
        const singleRowCount = rows.filter((row) => row.items.length === 1).length;
        const singleRowPenalty = images.length > 2 ? singleRowCount * 0.18 : 0;
        const score = Math.abs(Math.log(width / height)) + singleRowPenalty;
        const candidate = { rows, width, height, score };

        if (!currentBest || candidate.score < currentBest.score) return candidate;
        return currentBest;
      }, best);
    }, null);
  }

  function drawCollage(images) {
    const layout = chooseBestRows(images);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = layout.width;
    canvas.height = layout.height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    layout.rows.forEach((row) => {
      let x = 0;

      row.items.forEach((item) => {
        ctx.drawImage(item.image, x, y, item.width, item.height);
        x += item.width;
      });

      y += row.height;
    });

    return canvas.toDataURL("image/png");
  }

  async function createCollage(files, append = false) {
    const app = window.PhotoEditApp;
    const validFiles = Array.from(files).filter(isImageFile);
    const nextFiles = append ? selectedFiles.concat(validFiles) : validFiles;
    const imageFiles = nextFiles.slice(0, MAX_IMAGES);

    if (imageFiles.length < MIN_IMAGES) {
      app && app.toast("Chọn ít nhất 2 ảnh để ghép");
      setStatus(statusText.empty);
      return;
    }

    if (nextFiles.length > MAX_IMAGES) {
      app && app.toast("Chỉ ghép tối đa 5 ảnh đầu tiên");
    }

    selectedFiles = imageFiles;
    setStatus(statusText.loading);

    try {
      const dataUrls = await Promise.all(selectedFiles.map(readFileAsDataUrl));
      const images = await Promise.all(dataUrls.map(loadImage));
      const dataUrl = drawCollage(images);

      if (app) {
        app.loadImageFromDataUrl(dataUrl, false);
        app.toast(`Đã ghép ${images.length} ảnh`);
      }

      const fileNames = selectedFiles.map((file) => file.name).join(", ");
      setStatus(`Đã ghép ${images.length} ảnh: ${fileNames}`);

      if (window.PhotoExport && typeof window.PhotoExport.saveDataUrl === "function") {
        await window.PhotoExport.saveDataUrl(dataUrl, {
          mimeType: "image/png",
          automatic: true
        });
      }
    } catch (error) {
      app && app.toast(error.message || "Không ghép được ảnh");
      setStatus("Không ghép được ảnh");
    }
  }

  window.PhotoCollage = {
    init() {
      const input = document.getElementById("collageInput");
      const addInput = document.getElementById("collageAddInput");
      if (!input) return;

      input.addEventListener("change", (event) => {
        const files = event.target.files;
        createCollage(files, false);
        event.target.value = "";
      });

      if (addInput) {
        addInput.addEventListener("change", (event) => {
          const files = event.target.files;
          createCollage(files, true);
          event.target.value = "";
        });
      }
    }
  };
})();
