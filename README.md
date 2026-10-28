# 🎂 Happy Birthday – bản có tương tác

Một trang chúc mừng sinh nhật gồm 5 màn, người xem tự bấm để đi tiếp:

1. **Cảnh báo giả** – thanh "đang tính tuổi" kẹt ở 99%, nút "Không" bỏ chạy khi bị bấm.
2. **Thổi nến** – thổi vào micro để tắt nến (hoặc chạm vào nến), pháo giấy + nhạc Happy Birthday.
3. **Hộp quà lừa đảo** – mở mãi mới tới hộp cuối.
4. **Bảo tàng kỷ niệm** – ảnh polaroid rơi xuống kèm chú thích hài.
5. **Thư tay** – phong bì mở ra, chữ tự gõ từng ký tự.

Nhạc và hiệu ứng âm thanh được tự tạo bằng Web Audio, không cần file nhạc. Có nút tắt/bật âm thanh ở góc trên.

## Tùy chỉnh

Mọi nội dung nằm trong `customize.json`:

| Trường | Ý nghĩa |
| --- | --- |
| `name` | Tên người nhận |
| `age` | Tuổi (để trống nếu không muốn "bóc phốt") |
| `candles` | Số nến trên bánh (1–10) |
| `music` | Đường dẫn file nhạc riêng, ví dụ `audio/nhac.mp3`. Để trống = nhạc Happy Birthday tự tạo |
| `giftSteps` | Các câu hiện ra mỗi lần mở hộp quà "giả" |
| `giftImage`, `giftText` | Ảnh và lời nhắn khi mở hộp quà cuối |
| `photos` | Danh sách ảnh `{ "src": "img/anh1.jpg", "caption": "..." }`. Để `src` trống sẽ hiện emoji |
| `letter` | Các đoạn của lá thư |
| `signature` | Chữ ký cuối thư |
| `thanksLink` | Link để người nhận nhắn lại, ví dụ `https://m.me/ten-cua-ban` hoặc `https://zalo.me/sdt` |

Có thể đổi nhanh tên/tuổi qua link mà không sửa file: `.../?name=Lan&age=20`

## Chạy thử trên máy

Trang cần chạy qua server (mở thẳng file `index.html` sẽ không đọc được `customize.json`):

```bash
python -m http.server 7777
```

Rồi mở http://localhost:7777

**Lưu ý micro:** trình duyệt chỉ cho dùng micro trên `https://` hoặc `localhost`. GitHub Pages có https nên dùng được. Nếu người xem không cho phép micro, họ vẫn chạm vào nến để thổi được.

## Đăng lên mạng

Bật GitHub Pages cho repo (Settings → Pages) rồi gửi link cho người nhận.

## Credits

Dựa trên ý tưởng gốc của [Afiur Rahman Fahim](https://github.com/faahim/). Pháo giấy dùng [canvas-confetti](https://github.com/catdad/canvas-confetti).
