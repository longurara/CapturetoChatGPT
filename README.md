# Slide Snapshot to ChatGPT

Tiện ích Chrome giúp bạn chụp nhanh slide hoặc ảnh rồi gửi thẳng sang ChatGPT để đặt câu hỏi, hoàn toàn không cần mở Snipping Tool hay thao tác thủ công.

## Tính năng chính

- **Tự nhận diện khung nội dung** trên Google Slides, PowerPoint web, Canva và cả trang preview ảnh của Google Drive.
- **Copy & gửi vào ChatGPT**: ảnh sau khi crop được copy vào clipboard, dung lượng tối ưu để dán thẳng vào khung chat và kèm prompt tiếng Việt theo cấu hình.
- **Nút máy ảnh nổi** giúp kích hoạt nhanh ngay trong trang bài giảng; có thể bật/tắt trong Options.
- **Tùy chỉnh hành vi**: cấu hình prompt, auto send, auto crop, hiển thị nút máy ảnh… tại trang Options của tiện ích.

## Cài đặt (Developer mode)
0. Bấm vào code -> chọn download zip và giải nén nó ra
1. Mở `chrome://extensions`.
2. Bật **Developer mode** (góc trên bên phải).
3. Chọn **Load unpacked** và trỏ tới thư mục `slide-to-chatgpt`.
4. Pin biểu tượng tiện ích lên toolbar nếu muốn truy cập nhanh.

## Cách sử dụng
1. Truy cập trang trình chiếu (Google Slides, PowerPoint web,...) hoặc trang xem ảnh trên Google Drive.
2. Bấm biểu tượng tiện ích hoặc nút máy ảnh nổi góc dưới bên phải.
3. Tiện ích sẽ tự cố gắng tìm khung nội dung và chụp ngay; nếu không tìm được sẽ hiển thị overlay để bạn kéo chọn vùng.
4. Sau khi chụp:
   - Ảnh được copy vào clipboard.
   - Tiện ích mở tab ChatGPT, đính kèm ảnh vào khung chat và điền prompt mặc định.
   - Nếu bật **Auto send**, tin nhắn sẽ được gửi luôn; nếu không bạn có thể chỉnh sửa trước khi gửi.

## Ghi chú kỹ thuật

- Tiện ích sử dụng `chrome.tabs.captureVisibleTab`, chỉ chụp được phần đang hiển thị (không cuộn).
- Việc nhận diện khung được định nghĩa trong `selection.js` (hàm `detectSlideBounds`). Nếu bạn dùng trang khác, hãy bổ sung selector tại đây hoặc tắt auto-crop trong Options.
- Khi copy ảnh thất bại, hãy kiểm tra quyền clipboard của trang hiện tại.
- Tiện ích đính kèm ảnh vào ChatGPT thông qua `input[type=file]`. Nếu giao diện ChatGPT thay đổi, cập nhật hàm `injectIntoChatGPT` trong `background.js`.

## Cấu trúc dự án

- `manifest.json`: khai báo quyền và service worker của tiện ích.
- `background.js`: lắng nghe thao tác người dùng, chụp màn hình và gửi dữ liệu sang ChatGPT.
- `selection.js`: hiển thị overlay chọn vùng, auto-crop, copy ảnh và đọc cài đặt.
- `selection.css`: style cho overlay, toast và nút máy ảnh.
- `options.html|css|js`: trang cấu hình tiện ích (prompt, auto send, auto crop…).
