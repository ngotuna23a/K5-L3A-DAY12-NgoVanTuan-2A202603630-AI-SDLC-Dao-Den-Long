# Phase 1 — yêu cầu và giả định

Tác giả: Ngô Văn Tuân · 2A202603630 · L3A · 26ai.tuannv3@vinuni.edu.vn.

Nguồn yêu cầu: `ng.txt` (PRD-0, Test Contract v1.0), lưu bản gốc tại `docs/requirements/phase-1.txt` để giữ yêu cầu Phase 1 khi file trao đổi được cập nhật; quy định lab trong các file gốc.

## Phạm vi và lựa chọn

Game web 3D, Three.js để hiển thị; Node.js headless không cần GPU. Cùng một simulation cho hai chế độ. Không phụ thuộc CDN khi chơi sau build. Không deploy dịch vụ ngoài trong bước triển khai repository này.

Đảo tròn bán kính 29 m, 5 đèn L1–L5 tại bán kính 18 m; 85 đom đóm và 3 Bóng Mực lúc đầu. Người chơi bắt đầu (0,0,0). Bóng Mực mới xuất hiện mỗi 12 s, tối đa 8; đom đóm bổ sung mỗi 2 s, tối đa 100, nếu random tương ứng được bật. Mọi số gameplay thuộc contract được lấy trực tiếp từ `game.contract.json`.

- Di chuyển 6 m/s; nhảy vận tốc đầu 7 m/s, trọng lực 20 m/s², không nhảy trên không.
- 3 máu; mang 16 đom đóm; đèn cần 8. E nạp ngay vào đèn chưa sáng gần nhất trong 3 m; hòa khoảng cách chọn thứ tự L1–L5.
- Pulse dùng 2 đom đóm, bán kính 6 m, stun 2.5 s, đẩy 4 m, cooldown 1 s. Không đủ tài nguyên/cooldown thì bỏ qua.
- Chỉ đèn đã sáng tạo vùng an toàn 5 m. Bóng Mực không được đi xuyên vào vùng này; nếu đèn vừa sáng bao quanh chúng, đẩy ra biên.
- Va chạm mất 1 máu, miễn thương 2 s, không đánh rơi đom đóm. Một tick tối đa một lần trúng đòn.
- Không phạt rơi (`fall_enabled=false`): giới hạn bước di chuyển tại mép đảo.
- Đêm dài 300 s. Tất cả đèn sáng: thắng; hết máu: thua; hết giờ: thua. Trường hợp đồng thời ưu tiên hết máu, rồi tất cả đèn, rồi hết giờ.
- Điểm: nhặt +10; thắp đèn +150; mỗi Bóng Mực mới bị stun +25. Khi thắng, cộng floor(giây còn lại) ×2 và máu còn lại ×100, chỉ một lần. Không thưởng cuối khi thua.
- Scenario chỉ dựng trạng thái, không phát event/cộng điểm. `time_left_s` của scenario là thời gian còn lại ban đầu; sau N bước trừ N/60.
- Snapshot ghi tick 0 và mỗi chu kỳ; end luôn là dòng cuối. Không thêm snapshot ngoài chu kỳ. Tọa độ làm tròn 3 chữ số. Snapshot thêm `motes` để tái lập/kiểm chứng.
- Mảng scenario được kiểm tra hình dạng, kiểu và giới hạn giá trị. Unknown lantern id hoặc field không hỗ trợ bị từ chối để tránh lỗi gõ âm thầm.

## Kế hoạch kiểm chứng trước triển khai

| Yêu cầu | Cách kiểm chứng |
|---|---|
| Tick/input/move/jump | Unit test tick 0, yaw, normalize, input giữ trạng thái, edge, nhảy và tiếp đất |
| Nhặt/nạp/5 đèn | Scenario tại đúng biên bán kính, quá sức chứa, nạp từng phần, thắng và replay |
| Bóng Mực/pulse/máu | Chase, stun/push/cooldown/cost, safe zone, invulnerability, no_flames |
| Thời gian/điểm | Dawn đúng tick, thưởng thắng chỉ một lần, setup không cộng điểm |
| CLI/JSONL | Subprocess test missing/malformed flags/files, exit 2, event ticks, last end, determinism |
| Hình ảnh/HUD/điều khiển | Chơi thật browser; chưa có ảnh/video thì không ghi đạt |
| Cross-platform/build | Node build + server HTTP smoke test; chưa chạy thật macOS/Linux thì ghi giới hạn |

## Nhật ký AI

- Người dùng cho phép cài Three.js. Công cụ: Codex; Node.js/npm có sẵn. Không dùng asset ngoài; hình học tự dựng.
- Đọc tài liệu lab, thống nhất nguyên văn contract; chuẩn bị kế hoạch trước code. Dùng test runner tích hợp, không thêm framework test.
- Token/chi phí: chưa có số đo theo phase từ công cụ; không bịa số. Sẽ ghi ước tính khi chốt phase, phân biệt với đo thực tế.
- Kiểm chứng: 20 unit/CLI test đạt; build, 4 scenario nhỏ và một lần chơi màn mặc định đều qua, output lặp lại giống từng byte. Bot mặc định không sửa state; CLI ghi thắng ở tick 1228, 5 đèn sáng, điểm 2018. Thông tin máy/source hash ở `docs/proof/phase-1/verification.json`.
- Browser đã chạy thật bằng Chrome headless/SwiftShader: 10 kiểm tra đạt, gồm start, di chuyển, nhảy, pause/resume, responsive, không có lỗi runtime, bot keyboard chơi màn mặc định đến thắng và nút chơi lại reset trạng thái. Ảnh `won.png` chụp thật, không chỉnh sửa. Báo cáo `browser-qa.json` là nguồn kết quả cuối cùng; không coi software rendering là số đo FPS GPU.
- Lỗi AI phát hiện trong kiểm chứng: canvas thiếu tabindex làm focus còn ở nút Start, ngăn keyboard movement; sửa focus và thêm assertion browser. Vòng pulse trong suốt vẫn cast shadow gây vệt đen; xem ảnh thật rồi tắt shadow của các hiệu ứng. Favicon thiếu gây HTTP 404; thêm favicon tự vẽ. CDP log cũ khiến lần test mới nhận lại lỗi lịch sử; clear log trước navigation. Bổ sung scenario test giữ nguyên vị trí tick 0 sau review contract.
- Harness thực tế: gate `scripts/verify.mjs` dừng ngay khi test/build/scenario/HTTP sai; workflow CI khai báo Ubuntu/macOS nhưng chưa push nên chưa khẳng định CI đạt. `scripts/browser-qa.mjs` dùng Chrome sẵn có, không thêm test dependency.
- Retro ngắn: logic chung giúp headless và GUI nhất quán; viết scenario nhỏ trước giúp bắt tick/edge/cost sớm. Chạy browser cần thiết vì unit test không phát hiện focus và bóng đổ. Nếu làm lại, kiểm tra keyboard focus ngay sau dựng màn đầu.
- Token: ước tính cho lượt triển khai và kiểm chứng Phase 1 khoảng 20–30 nghìn token, không phải số đo billing; chi phí chưa xác định vì không có usage API. Tiết kiệm bằng test runner/CDP tích hợp, một dependency, không asset generator, chỉ đọc file liên quan và giữ scenario ngắn. Không tính hạn mức token là bằng chứng tính năng.
- Hạng mục còn lại ngoài triển khai local: video/Release cuối, hidden tests và kết quả CI macOS/Linux. Tag bàn giao Phase 1 là `phase-1`; không tự ghi đạt các mục chưa có kết quả.

## Sửa input trái/phải sau chơi thử

Người dùng phát hiện A/D đảo chiều trên màn hình. Root cause: camera mặc định nhìn theo +Z, nên hướng phải của camera là -X, trong khi GUI gán D thành +X. Đổi dấu input X tại browser cho cả WASD, phím mũi tên và nút cảm ứng dùng cùng key map; logic/headless giữ nguyên công thức Contract v1.0. Browser QA bổ sung kiểm tra hướng dịch chuyển được project lên màn hình cho A/D, hai phím mũi tên và sau khi xoay camera. Bot browser cũng đổi ánh xạ keyboard; bot headless giữ nguyên.

Kết quả regression sau sửa: 20 unit/CLI test, 5 lần chạy headless có so output và 16 kiểm tra browser đều đạt, gồm hướng trái/phải trên màn hình trước/sau xoay camera, thắng màn mặc định và chơi lại. Lượt browser đầu bị gián đoạn do server local dừng; chạy lại với server kiểm thử riêng đã qua.
