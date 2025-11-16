# Slide Snapshot to ChatGPT

Tiện ích Chrome giúp bạn chụp nhanh slide hoặc ảnh rồi gửi thẳng sang ChatGPT hoặc Google Gemini để đặt câu hỏi.

## Tính năng chính

- **Tự nhận diện khung** trên Google Slides, PowerPoint web, Canva và cả trang preview ảnh của Google Drive.
- **Copy & gửi vào ChatGPT/Gemini**: ảnh sau khi crop được copy vào clipboard và tự đính kèm vào khung chat cùng prompt tiếng Việt.
- **Chọn dịch vụ**: chuyển giữa ChatGPT hoặc Google Gemini trong trang Options.
- **Nút máy ảnh nổi** giúp kích hoạt nhanh ngay trên trang; có thể bật/tắt.
- **Tùy chỉnh hành vi**: cấu hình prompt, auto-send, auto-crop… trực tiếp trong Options.

## Cài đặt (Developer mode)

1. Tải mã nguồn (Download ZIP) và giải nén.
2. Mở `chrome://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked** và trỏ tới thư mục `slide-to-chatgpt`.
5. Pin biểu tượng tiện ích nếu muốn truy cập nhanh.

## Cách sử dụng

1. Mở trang trình chiếu (Slides/PowerPoint/Canva) hoặc trang xem ảnh Google Drive.
2. Bấm biểu tượng tiện ích hoặc nút máy ảnh nổi ở góc dưới bên phải.
3. Tiện ích auto-crop; nếu không tìm thấy khung sẽ hiển thị overlay để bạn kéo chọn.
4. Sau khi chụp:
   - Ảnh được copy vào clipboard.
   - Tiện ích mở tab dịch vụ đã chọn (ChatGPT hoặc Gemini), đính kèm ảnh và điền prompt mặc định.
   - Nếu bật **Auto send**, tin nhắn được gửi tự động; nếu không bạn có thể chỉnh sửa trước khi gửi.
5. Để chọn Gemini hay ChatGPT: mở trang Options (chrome://extensions → Slide Snapshot → Extension options) và chọn **Dịch vụ nhận ảnh** từ dropdown.

## Ghi chú kỹ thuật

- Sử dụng `chrome.tabs.captureVisibleTab`, chỉ chụp phần đang hiển thị.
- Selector auto-crop được định nghĩa trong `selection.js` (hàm `detectSlideBounds`). Có thể bổ sung selector mới hoặc tắt auto-crop trong Options.
- Nếu copy ảnh thất bại, kiểm tra quyền clipboard của trang.
- Việc upload ảnh vào ChatGPT/Gemini thao tác qua `input[type="file"]`. Nếu giao diện thay đổi, cập nhật các hàm script tương ứng trong `background.js`.

## Cấu trúc thư mục

- `manifest.json`: khai báo quyền và service worker.
- `background.js`: xử lý sự kiện, chụp ảnh, gửi dữ liệu sang ChatGPT/Gemini.
- `selection.js`: overlay chọn vùng, auto-crop, copy ảnh, đọc cài đặt.
- `selection.css`: style cho overlay, toast, nút máy ảnh.
- `options.html|css|js`: trang cấu hình tiện ích.
