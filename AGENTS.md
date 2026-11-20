# Đảo Đèn Lồng — hướng dẫn dự án

- Trả lời ngắn bằng tiếng Việt; giữ technical terms bằng English.
- Đọc `ng.txt` cho phase hiện tại; không đoán nội dung phase chưa phát hành.
- Chủ bài: Ngô Văn Tuân, MSSV 2A202603630, lớp L3A.
- Node.js >=22. Cài dependency cần sự đồng ý của người dùng.
- Build: `npm run build`; game: `npm start`; test: `npm test`.
- Trước bàn giao chạy `npm run verify`: test đỏ phải sửa hoặc ghi rõ blocker, không báo hoàn thành.
- Gameplay dùng chung `src/game.mjs` cho browser và headless; tuning lấy từ `game.contract.json`.
- Giữ fixed step 60 Hz, seeded RNG, XZ distance inclusive, input edge và tick theo contract.
- Mỗi yêu cầu chính cần test hoặc bằng chứng chơi thật. Không sửa tay output bằng chứng.
- Giữ harness, ghi assumptions/AI log/retro và lý do thay test qua từng phase.
- Không sửa `.env`, lộ credentials, xóa file hay refactor lớn khi chưa được đồng ý.
- Không tự tag/push/release khi chưa có yêu cầu; không viết lại lịch sử sau tag.
