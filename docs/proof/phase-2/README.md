# Bằng chứng Phase 2

Tái lập bằng `npm ci`, `npm run verify`. Các JSONL/TAP/JSON và ảnh được tạo từ chương trình/test thực, không chỉnh sửa kết quả. `verification.json` ghi môi trường, timing headless và SHA-256 source; đối chiếu với mã tại tag `phase-2`. Source và bằng chứng được lưu cùng commit.

| Yêu cầu | Bằng chứng | Phạm vi |
|---|---|---|
| Tick/input/điểm/số chuẩn, hồi quy Phase 1 còn hiệu lực | `tests.tap` | Các assertion bị Ticket-02 thay được giải thích trong spec Phase 2 |
| Dash | `dash.jsonl` | 14 m/s đúng 12 tick, unit test cooldown và airborne |
| Pause/resume | `pause.jsonl` | Tick chạy, sim/timer không chạy khi paused |
| Rơi/hồi sinh | `fall.jsonl` | Mất máu/đồ một lần, respawn 60 tick |
| Bục/cầu và tầng cao | `pad.jsonl`, `upper-pad.jsonl`, ảnh `night-2.png`, `night-3.png` | Physics thật và geometry unit test |
| Bùa Gió | `charm.jsonl` | Buff, dash không cooldown, unit test expiry/respawn |
| Gió Lạc | `drifter.jsonl`, `drifter-drop.jsonl` | Cướp/thoát/pulse trả đồ, TTL |
| Gió Đêm 3 | `wind.jsonl`, `night-3.png` | Warning, active, force và kết thúc cơn gió |
| Pulse/safe zone/thắng/thua | `pulse.jsonl`, `safe-zone.jsonl`, `win.jsonl`, `dawn.jsonl`, `no-flames.jsonl` | Kết quả assertions và determinism 2 lần |
| Thắng Đêm 1 mặc định | `default-play-inputs.json`, `default-play.jsonl` | Bot input-only; không scenario override, không sửa game state |
| Full headless ≤30 s mỗi Đêm | `verification.json`, `benchmark-night-*.jsonl`, `benchmark-scenario.json` | 18.000/19.800/21.600 tick; chỉ tăng máu để tránh dừng do chết sớm, vẫn dùng bản đồ/spawn thường; snapshot mỗi 600 tick |
| Menu/chuỗi 3 Đêm/Ông Đăng/retry/pause/settings/HUD/audio | `browser-qa.json` và ảnh menu/thắng/mobile | Browser chạy thật, các đường thắng UI dùng scenario rõ ràng; audio kiểm tra Web Audio state/event, chưa là nghe thử |
| ≥30 FPS trung bình @1280×720 | `browser-qa.json`, `performance.png` | Đo 6 s, ghi FPS/resolution/pixel ratio/GPU, scene Đêm 3 với 30 đom đóm, 10 bóng, 6 đèn sáng; không suy từ headless |
| Màu chuẩn | `browser-qa.json` | Palette shader/UI khai báo theo Ticket; ảnh cho đánh giá thị giác |

Các file `browser-failure.json` / `failure.png` lưu lần test đầu bị lỗi harness (encoding/biểu thức kiểm tra), đã sửa; kết quả cuối nằm trong `browser-qa.json`. Giữ lại để retro trung thực, không dùng ảnh lỗi làm bằng chứng đạt.

Không có hidden tests, video hay Release cuối. CI Phase 2 chỉ được xác nhận sau khi push và kiểm tra kết quả; bằng chứng Phase 1 được giữ nguyên ở thư mục/tag cũ.
