# Slide Snapshot to ChatGPT

Tiện ích Chrome giúp bạn chụp nhanh slide hoặc ảnh rồi gửi thẳng sang ChatGPT hoặc Google Gemini để đặt câu hỏi.

## Tính năng chính

- **Tự nhận diện khung nội dung** trên Google Slides, PowerPoint web, Canva và cả trang preview ảnh của Google Drive.
- **Copy & gửi vào ChatGPT/Gemini**: ảnh sau khi crop được copy vào clipboard, đồng thời đính kèm vào khung chat với prompt tiếng Việt tùy chỉnh.
- **Chọn dịch vụ**: tùy chọn giữa ChatGPT hoặc Google Gemini ngay trong phần Options.
- **Nút máy ảnh nổi** giúp kích hoạt nhanh ngay trong trang bài giảng; có thể bật/tắt.
- **Tùy chỉnh hành vi**: cấu hình prompt, auto-send, auto-crop… trong trang Options của tiện ích.

## Cài đặt (Developer mode)
0. Bấm vào code -> chọn download zip và giải nén nó ra
1. Mở `chrome://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked** và trỏ tới thư mục `slide-to-chatgpt`.
4. Pin biểu tượng tiện ích nếu muốn truy cập nhanh.

## Cách sử dụng
<<<<<<< HEAD

1. Mở trang trình chiếu (Google Slides, PowerPoint web, Canva…) hoặc trang xem ảnh trên Google Drive.
2. Bấm biểu tượng tiện ích hoặc nút máy ảnh nổi.
3. Tiện ích sẽ auto-crop; nếu không tìm thấy khung sẽ hiển thị overlay để tự kéo chọn.
4. Sau khi chụp, ảnh được copy vào clipboard, đính kèm vào ChatGPT/Gemini cùng prompt mặc định và có thể auto-send.
=======
1. Truy cập trang trình chiếu (Google Slides, PowerPoint web,...) hoặc trang xem ảnh trên Google Drive.
2. Bấm biểu tượng tiện ích hoặc nút máy ảnh nổi góc dưới bên phải.
3. Tiện ích sẽ tự cố gắng tìm khung nội dung và chụp ngay; nếu không tìm được sẽ hiển thị overlay để bạn kéo chọn vùng.
4. Sau khi chụp:
   - Ảnh được copy vào clipboard.
   - Tiện ích mở tab ChatGPT, đính kèm ảnh vào khung chat và điền prompt mặc định.
   - Nếu bật **Auto send**, tin nhắn sẽ được gửi luôn; nếu không bạn có thể chỉnh sửa trước khi gửi.
>>>>>>> f2d5b2ba493ee61d1f3662cc233750732a137a5f

## Ghi chú kỹ thuật

- Sử dụng `chrome.tabs.captureVisibleTab`, nên chỉ chụp phần đang hiển thị.
- Selector auto-crop được định nghĩa trong `selection.js` (hàm `detectSlideBounds`). Có thể bổ sung selector nếu dùng dịch vụ khác hoặc tắt auto-crop.
- Nếu copy ảnh thất bại, kiểm tra quyền clipboard của trang.
- Việc upload ảnh vào ChatGPT/Gemini thao tác qua `input[type="file"]`. Nếu giao diện thay đổi, cập nhật hàm tiêm script tương ứng trong `background.js`.

## Cấu trúc thư mục

- `manifest.json`: khai báo quyền và service worker.
- `background.js`: xử lý sự kiện, chụp ảnh, gửi dữ liệu sang ChatGPT/Gemini.
- `selection.js`: overlay chọn vùng, auto-crop, copy ảnh, đọc cài đặt.
- `selection.css`: style cho overlay, toast, nút máy ảnh.
- `options.html|css|js`: trang cấu hình tiện ích.