# Slide Snapshot to ChatGPT

Ti?n �ch m? r?ng Chrome nh? gi�p b?n *crop* nhanh v�ng khung tr�nh chi?u (Google Slides, PowerPoint web, v.v.) r?i t? d?ng:

1. Sao ch�p ?nh da crop v�o clipboard.
2. M? tab ChatGPT d? b?n d�n tr?c ti?p (Ctrl / Cmd + V).

Kh�ng c?n Snipping Tool hay t?i ?nh th? c�ng n?a.

## C�i d?t (ch?y ? ch? d? Developer)

1. M? `chrome://extensions`.
2. B?t **Developer mode** (g�c tr�n b�n ph?i).
3. Ch?n **Load unpacked** r?i tr? t?i thu m?c `slide-to-chatgpt`.
4. Pin bi?u tu?ng ti?n �ch l�n thanh c�ng c? n?u mu?n.

## C�ch d�ng

1. V�o trang tr�nh chi?u (v� d? Google Slides, PowerPoint web, Canva...).
2. B?m v�o bi?u tu?ng ti?n �ch **Slide Snapshot to ChatGPT** ho?c d�ng n�t m�y ?nh n?i ? g�c ph?i du?i (c� th? t?t/b?t trong Options).
3. Ti?n �ch s? t? c? g?ng nh?n di?n khung slide trung t�m v� ch?p lu�n; n?u kh�ng du?c s? hi?n th? overlay d? b?n k�o chu?t ch?n v�ng.
4. Sau khi ch?p xong, ti?n �ch:
   - Sao ch?p ?nh v?o clipboard (ph�ng h?).
   - M? tab ChatGPT, g?n s?n ?nh v�o � chat v� di?n prompt ti?ng Vi?t y�u c?u gi?i th�ch.
   - N?u b?t **Auto send**, ti?n �ch s? nh?n n?t g?i h? b?n.
5. B?n ch? c?n b? sung c�u h?i (n?u mu?n) r?i Enter (n?u kh�ng auto-send).

## Ghi ch� k? thu?t

- N�t m�y ?nh (`#stc-camera-button`) hi?n th? c? d?nh g�c ph?i du?i; ch?nh m�u/hi?u ?ng ? `selection.css`.
- Ti?n �ch uu ti�n auto-detect khung b?ng c�c selector ph? bi?n c?a Google Slides/PowerPoint/Canva; n?u b?n d�ng trang kh�c c� c?u tr�c kh�c, hay b? sung selector trong `selection.js` (h�m `detectSlideBounds`) ho?c t?t auto-crop trong Options.
- Ti?n �ch d�ng `chrome.tabs.captureVisibleTab` n�n ch? ch?p du?c v�ng dang hi?n th? (kh�ng cu?n).
- N?u g?p l?i kh�ng sao ch�p du?c ?nh, hay ki?m tra quy?n clipboard c?a tr�nh duy?t d?i v?i trang hi?n t?i.
- Vi?c d�n ?nh th?ng v�o ChatGPT s? d?ng `input[type=file]` c?a trang. N?u giao di?n ChatGPT thay d?i ho?c b?n mu?n s? d?ng prompt kh�c, c?p nh?t h�m `injectIntoChatGPT` trong `background.js` ho?c ch?nh trong Options.
- T?i `chrome://extensions` -> Details -> **Extension options** c� th? thay d?i prompt, b?t/t?t auto send, m�y ?nh n?i.

## Thu m?c & file ch�nh

- `manifest.json` - khai b�o quy?n, service worker.
- `background.js` - l?ng nghe n�t b?m extension, ch?p m�n h�nh, qu?n ly g?i ?nh/prompt v� ch�n banner ph?n h?i b�n ChatGPT.
- `selection.js` - hi?n th? overlay ch?n v�ng, c?t ?nh, ghi clipboard, d?c c�i d?t.
- `selection.css` - style cho overlay, khung ch?n, toast v� n�t m�y ?nh.
- `options.html|css|js` - trang c?u h�nh c�c h�nh vi c?a ti?n �ch.