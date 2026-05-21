# PhotoEdit

Web app chỉnh ảnh tĩnh, chạy trực tiếp trên trình duyệt, phù hợp để đẩy lên GitHub Pages.

## Cấu trúc

```txt
photo-editor/
├── index.html
├── css/
│   └── style.css
├── vendor/
│   ├── cropperjs/
│   └── fabric/
└── js/
    ├── app.js
    ├── collage.js
    ├── crop.js
    ├── text.js
    └── export.js
```

## Tính năng

- Tải ảnh từ máy hoặc kéo thả ảnh vào canvas
- Ghép tự động 2-5 ảnh thành 1 ảnh, ưu tiên bố cục gần vuông 1:1
- Cắt ảnh tự do hoặc theo tỉ lệ 1:1, 4:3, 16:9, 9:16
- Xoay 90°, xoay tự do, lật ngang, lật dọc
- Thêm chữ, đổi font, màu, cỡ chữ, bật/tắt đổ bóng
- Undo/Redo
- Xuất PNG/JPG/WebP
- Responsive cho desktop, iPad và mobile
- Xử lý trên trình duyệt, không cần server

## Cách chạy local

Mở trực tiếp `index.html`, hoặc dùng VS Code Live Server.

## Đẩy lên GitHub Pages

1. Tạo repository mới, ví dụ: `photo-editor`
2. Upload toàn bộ file trong thư mục này lên repository
3. Vào `Settings` → `Pages`
4. Source chọn `Deploy from a branch`
5. Branch chọn `main`, folder chọn `/root`
6. Bấm `Save`
7. Link web sẽ có dạng:

```txt
https://ten-github-cua-ban.github.io/photo-editor/
```
