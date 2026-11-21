# Release v1.0.0

[Bản phát hành trên GitHub](https://github.com/ngotuna23a/K5-L3A-DAY12-NgoVanTuan-2A202603630-AI-SDLC-Dao-Den-Long/releases/tag/v1.0.0) · tag phase-4 và v1.0.0.

Đảo Đèn Lồng: game 3D ba Đêm, giữ ít nhất 60% đèn sáng tới dawn. Contract v1.3 giữ luật v1.2; thêm benchmark chuẩn, soak, leaderboard trên đĩa, remap và accessibility.

Artifact: `artifacts/dao-den-long-v1.0.0.zip`. Giải nén, mở terminal trong `dao-den-long-v1.0.0`, chạy `npm start`, truy cập http://localhost:4173. Cần Node.js ≥22 và browser WebGL2; ZIP có sẵn dist/Three.js/license, không cần npm install để chơi. Muốn build từ source: npm ci → npm run build → npm start.

Bằng chứng: 71 unit/CLI tests, 28 deterministic replays, input-only bot thắng Đêm 1 mặc định và 34 browser checks. Soak seed7/10Đêm một process: 0 crash, RSS +13.04% ở output gốc. Bench seed42/30s: avg140.88 FPS, p1=22.16 FPS, load1.96s, Iris Xe/Windows. **p1 local chưa đạt mốc tham khảo30 FPS**; máy chấm giảng viên chưa có. Peak RSS Chrome=null do giới hạn web; không đảm bảo tắt vsync. Raw frame times và thông tin môi trường kèm repo.

Demo MP4 ở docs/demo/demo.mp4, dài khoảng52s, gameplay và input keyboard tự động trên Chrome thật; không audio. Phần proof đọc output thật. Retro bốn phase ở docs/notes/retro.md. ZIP có source/docs/tests/demo/LICENSE/CREDITS và loại ng.txt, dữ liệu leaderboard, .git, node_modules, tmp. SHA-256/manifest được sinh cùng ZIP ở artifacts/manifest.json.

Kiểm tra đóng gói đã giải nén sang thư mục sạch, chạy npm ci/build, HTTP toàn bộ modules, API từ chối tên sai, lưu điểm qua restart server và export bằng CLI process mới. Chi tiết ở docs/proof/phase-4/clean-install.json. npm start ánh xạ trực tiếp node scripts/serve.mjs; smoke test dùng cùng entrypoint ở port ngẫu nhiên để đóng server có kiểm soát.

Chủ bài đã yêu cầu commit/push và chốt tag `phase-4`, Release `v1.0.0` kèm ZIP/demo. Hai tag trỏ cùng bản bàn giao. Không sửa lịch sử các tag phase-1…phase-3. CI Linux/macOS của bản gameplay Phase4 đã đạt; thay đổi chốt release chỉ cập nhật tài liệu.
