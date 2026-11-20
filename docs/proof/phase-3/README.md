# Bằng chứng Phase 3

Tái lập: `npm ci`, `npm run verify`. Kết quả/ảnh do chương trình và Chrome tạo thật, không sửa output. `verification.json` có SHA-256 source, môi trường, timing và kết quả deterministic hai lần. Evidence Phase 1–2 không ghi đè.

| Yêu cầu | Bằng chứng |
|---|---|
| Regression còn hiệu lực / v1.2 | `tests.tap`, tests/game.test.mjs, tests/cli.test.mjs, tests/phase3.test.mjs |
| Hao dầu/tắt/reset lịch sử | `out.jsonl`, unit 6000 tick và snapshot ever_lit |
| Châm dầu ceil/clamp/điểm | `refuel.jsonl`, unit full/no-op/id/radius |
| Relight 5 đom đóm, điểm40 | `relight.jsonl` |
| Capacity tăng, cap20 | `capacity.jsonl`, `capacity.png`, unit prelit/reset/pickup |
| Drain cộng dồn, event60tick | `drain.jsonl`, target/transition unit tests |
| Shield ngưỡng30 / khôi phục | `weak-shield.jsonl`, `refuel-shield.jsonl` |
| Pulse drain tổng15 | `pulse-drain.jsonl` |
| Dầu pause không hao | `fuel-pause.jsonl` |
| Không early win; dawn và ưu tiên hit | `no-early.jsonl`, `dawn-win.jsonl`, `dawn-loss.jsonl`, `final-hit.jsonl` |
| Sống tới dawn trên Đêm1 mặc định | `default-play-inputs.json`, `default-play.jsonl` — bot chỉ phát input, không scenario override |
| Dash/pad/fall/charm/drifter/wind cũ | Các scenario regression được lưu riêng trong tests/scenarios/phase-3 và JSONL tương ứng |
| Thanh dầu / shape rách-xẹp / blink1Hz / mù màu persist | `browser-qa.json`, `colorblind-fuel.png`, `capacity.png` |
| Campaign và UI cũ | `browser-qa.json`, menu/mobile/night/won screenshots; thắng GUI dùng scenario thời gian ngắn, không phải người chơi thắng cả3Đêm mặc định |
| Hiệu năng | `verification.json`, `benchmark-night-*.jsonl`, `browser-qa.json` và `performance.png` |

Đo headless toàn thời lượng 240/270/300 s bằng số tick tương ứng; benchmark chỉ tăng máu để không chết sớm, giữ bản đồ/lịch sinh/dầu/AI. Browser đo 6 s ở 1280×720 và ghi GPU/FPS thật. Đây là regression performance, chưa phải benchmark/soak Contract v1.3 của Phase 4.

Đối chiếu source với tag `phase-3`, kết quả CI theo commit tương ứng trên GitHub Actions. Hidden tests và video/Release cuối chưa có. Quyết định và breaking changes: docs/notes/phase-3.md, CHANGELOG.md.
