# Đảo Đèn Lồng — Phase 3: Đèn cạn dầu

**Contract v1.2 · Tag bàn giao `phase-3`.** Video demo sẽ bổ sung trước Release cuối. Ảnh chạy thật: [menu](docs/proof/phase-3/menu.png), [dầu và chế độ dễ phân biệt](docs/proof/phase-3/colorblind-fuel.png), [sức chứa](docs/proof/phase-3/capacity.png), [Bình Minh](docs/proof/phase-3/won-night-3.png).

**Ngô Văn Tuân · 2A202603630 · L3A** · 26ai.tuannv3@vinuni.edu.vn

Game 3D góc nhìn thứ ba, 3 Đêm trên Đảo Bến/Đảo Cau/Đảo Chuông. **Mục tiêu mới: giữ ít nhất 60% đèn sáng tới bình minh**, không còn thắng ngay khi thắp hết. Cần còn 3/5, 4/6, 5/7 đèn tại tick cuối và Mây còn sống. Đêm dài 240/270/300 s.

## Cài và chơi — 3 lệnh

```sh
npm ci
npm run build
npm start
```

Node.js >=22, browser hỗ trợ WebGL trên laptop Windows/macOS/Linux. Mở **http://localhost:4173 → Bắt đầu hành trình → Lên đường**. Bản `dist/` là web tĩnh tự chứa Three.js/license, không CDN/asset ngoài. Dùng HTTP, không mở `file://`.

| Phím | Hành động |
|---|---|
| WASD / phím mũi tên | Đi theo hướng camera |
| Space | Nhảy |
| Shift | Lướt 14 m/s trong 0.2 s, hồi1.5s |
| E | Nạp/thắp lại/châm dầu vào đèn nhận được gần nhất trong2m |
| Q | Pulse: 3 đom đóm, bán kính3D5m, hồi3s |
| Esc / P | Pause, Tiếp tục/Chơi lại/Cài đặt/Menu |
| Kéo / lăn chuột | Xoay / zoom camera |

## Luật dầu, sức chứa và điểm

- Thắp đầu cần10 đom đóm, thắp lại cần5. Vừa thắp có100 dầu; hao1/s. Dầu0 đèn tắt/reset tiến độ, giữ lịch sử. E khi đang sáng: mỗi đom đóm thêm10 dầu, dùng vừa đủ theo ceil tới100.
- Đèn **dầu≥30** có shield6m. Dưới30 mất shield; shade wander tìm đèn yếu, vào trong2m thì đứng hút thêm5 dầu/s mỗi con. Pulse xua bóng, refuel lên≥30 khôi phục shield và đẩy bóng ra.
- Đèn sáng có thanh dầu; dưới30 nhấp nháy1Hz. Đèn tắt xẹp20% và có vết rách, phân biệt được bằng hình dạng. Cài đặt **Bảng màu dễ phân biệt** đổi viền/mắt Bóng Mực sang xanh #00B3FF, warning trắng kèm ⚠; được lưu cùng volume/sensitivity.
- Sức chứa = `min(20, 10 + 2 × successful_lights)`; tính cả relight, không tính prelit scenario; reset đầu Đêm. HUD có số ô và đang mang/capacity thật.
- Điểm: +5/đom đóm nạp/refuel, +100 first light, +40 relight. Pulse +5/bóng, **tổng+15** nếu bóng ngay trước đó drain. Khi thắng dawn: mỗi đèn sáng +50+floor(fuel thật), mỗi máu+50. Không thưởng thời gian. Tổng hành trình chỉ gồm Đêm đã thắng.

Các luật khác của Phase2 giữ nguyên: nhặt/đánh rơi, invuln, fall/respawn, dash, bridge/pad/tầng/dốc/tháp, charm/drifter/wind, pause/settings/audio. Hết máu luôn thua trước, kể cả tick dawn; nếu còn sống nhưng thiếu đèn khi hết giờ thì thua. Retry giữ Đêm hiện tại; thắng3Đêm tới Bình Minh.

## Test và headless

```sh
npm test
npm run verify
```

`verify`: unit/CLI regression → build → scenario từng cơ chế, so JSONL hai lần → bot sống tới dawn Đêm1 mặc định bằng input thường → đo full3Đêm headless → HTTP smoke. Lỗi trả mã khác0, không báo đạt. Bằng chứng ở [docs/proof/phase-3](docs/proof/phase-3); evidence cũ giữ nguyên.

```sh
node src/headless.mjs --seed 42 --night 1 --ticks 14400 --out night1.jsonl
node src/headless.mjs --seed 42 --night 1 --scenario tests/scenarios/phase-3/drain.json --ticks 60 --snapshot-every 1 --out drain.jsonl
node src/headless.mjs --seed 42 --night 1 --scenario tests/scenarios/phase-3/refuel.json --inputs tests/scenarios/phase-3/refuel-inputs.json --ticks 1 --out refuel.jsonl
```

Headless không cần GPU/Three.js; 60Hz, snapshot0 trước input, input k tạo state/event k+1. Field vắng giữ trạng thái, nút false→true. Pause vẫn tăng tick nhưng giữ sim_tick và mọi timer/fuel/spawn/TTL. JSONL tọa độ3chữ số, fuel1chữ số; end luôn cuối, dừng sớm nếu chết. Inputs/scenario sai định dạng exit2/stderr; lỗi khác mã khác0; cùng seed/scenario/input cho output giống byte.

Snapshot đèn thêm `fuel`, `ever_lit`, `relit_count`; player thêm `capacity`. Scenario hỗ trợ fuel/history, player.successful_lights và shades.target_lantern_id/state=drain. Events mới: refuel/lantern_out/fuel_drain; lantern_lit có relight; reason thắng dawn_survived, không còn all_lit. Dầu giữ bằng số nguyên1/60 trong simulation, chỉ làm tròn khi xuất; bonus floor cũng dùng dầu chưa làm tròn.

Browser QA: Chrome profile riêng, CDP9222, `npm start` rồi `node scripts/browser-qa.mjs`. URL `?qa=1` chỉ bật hàm dựng scenario/chạy simulation cho test. GUI campaign thắng bằng fixture được ghi rõ; replay headless Đêm1 dùng thế giới mặc định, không sửa state. FPS đo6s ở1280×720 trên GPU thật, không suy từ headless. Chi tiết kết quả và máy trong JSON proof. Chưa triển khai benchmark/soak/leaderboard/Release của Ticket-04.

## Quyết định, thay đổi và sáng tạo

[ADR/acceptance criteria](docs/notes/phase-3.md) giải thích dầu nguyên, drain counter, tick order, floor và thay test cũ. [CHANGELOG](CHANGELOG.md) liệt kê breaking changes. Spec gốc ở docs/requirements; `ng.txt` được gitignore và không push. Phase 1/2 có tag riêng; commit Phase 2 là `b8bff3a`, tag `phase-2`. Snapshot Phase 2 local vẫn giữ làm bản lưu trước đổi luật.

**Sáng tạo của tôi:** nón lá/đèn nhỏ của Mây, biển mây, minimap, lời Ông Đăng, nhạc/SFX tổng hợp và hình học đơn giản/instancing. Các chi tiết renderer không thêm entity headless. Đã điều chỉnh objective/compass/ánh sáng để hợp luật giữ đảo sáng.

Nguồn/license: [CREDITS.md](CREDITS.md), [LICENSE](LICENSE). Harness: AGENTS.md, scripts/verify.mjs, scripts/browser-qa.mjs, workflow CI. Kết quả cross-platform ở [GitHub Actions](https://github.com/ngotuna23a/K5-L3A-DAY12-NgoVanTuan-2A202603630-AI-SDLC-Dao-Den-Long/actions).

---

# Day 12 — AI SDLC: Đảo Đèn Lồng

> **Cá nhân** (1 người / 1 MSSV) · Áp dụng SDLC cùng AI để xây một **game 3D** qua **4 phase**, từ yêu cầu ban đầu tới bản phát hành.
> **Lab board + trợ giảng:** **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**

---

## Tài liệu của lab

| File | Nội dung |
|---|---|
| [GUIDE.md](GUIDE.md) | Hướng dẫn làm lab: vòng làm việc mỗi phase, harness, kiểm chứng, token |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Các mốc tự kiểm tra từ chuẩn bị đến nộp bài |
| [SUBMISSION.md](SUBMISSION.md) | Đặt tên repo, hạn nộp, tag, Release, video, checklist |
| [RULES.md](RULES.md) | Quy định: AI, trung thực về bằng chứng, bản quyền, bảo mật |
| [RUBRIC.md](RUBRIC.md) | Thang điểm chi tiết |

## Lab board

Yêu cầu dự án được phát hành tại **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**. Mỗi phase là một tab (tab chưa phát hành bị khóa), mỗi tab có trợ giảng AI riêng chỉ trả lời trong phạm vi phase đó. Trợ giảng cần đăng nhập claude.ai và dùng lượt Claude của bạn.

## Dự án

**Đảo Đèn Lồng**: game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.

- Không ràng buộc công nghệ; chạy được trên macOS hoặc Linux.
- Tuân theo **Test Contract** (chế độ headless) để được chấm tự động và so sánh với nhau.

| Phase | Bạn nhận | Nộp |
|---|---|---|
| 1 | **PRD-0** (mô tả tổng quát) + Test Contract | tag `phase-1` |
| 2 | **Ticket-02**, phát hành khi Phase 1 kết thúc | tag `phase-2` |
| 3 | **Ticket-03**, phát hành khi Phase 2 kết thúc | tag `phase-3` |
| 4 | **Ticket-04**, phát hành khi Phase 3 kết thúc | tag `phase-4` + Release `v1.0.0` |

Yêu cầu sẽ được bổ sung và có thể thay đổi giữa các phase, giống dự án thật.

### Lịch 4 giờ

Bài lab kéo dài **4 giờ**. Phase 1 và 2 khoảng **1 giờ**, Phase 3 khoảng **30 phút**, Phase 4 khoảng **1 giờ 30 phút**. Mỗi phase phát hành đúng mốc giờ. Phase mới xuất hiện trên lab board khi tới mốc.

| Mốc | Sự kiện | Hạn tag |
|---|---|---|
| 0h | Phát hành **Phase 1** (PRD-0), gồm cả phần chuẩn bị | `phase-1` trước mốc 1h |
| 1h | Phát hành **Phase 2** | `phase-2` trước mốc 2h |
| 2h | Phát hành **Phase 3** | `phase-3` trước mốc 2h30 |
| 2h30 | Phát hành **Phase 4** | `phase-4`, Release `v1.0.0` và video trước mốc 4h |
| 4h | Hết giờ lab, chốt bài | |

Hết giờ mỗi phase thì tag và chuyển sang phase tiếp theo, dù phase chưa hoàn hảo. Chỗ chưa xong ghi trung thực trong bằng chứng.

---

## Gợi ý SDLC (cách làm là của bạn)

Mỗi phase là một vòng nhỏ. Công cụ, thứ tự, định dạng tài liệu đều tự do; đây chỉ là gợi ý:

1. **Requirements:** biến yêu cầu thành tiêu chí nghiệm thu kiểm chứng được. Chỗ mơ hồ thì tự giả định và ghi lại.
2. **Plan:** nghĩ cách kiểm chứng **trước** khi để agent viết code.
3. **Build:** để agent viết, bạn điều phối và review.
4. **Verify:** chạy thật, kiểm tra hành vi thật. *Không có bằng chứng thì chưa xong*: "agent bảo chạy rồi" không phải bằng chứng.
5. **Evaluate:** cái gì đạt, AI sai ở đâu, harness (AGENTS.md, skill, hook) cần chỉnh gì.
6. **Release:** gắn tag.

## Ba điều cần nhớ

> Bạn được **tự do sáng tạo thêm** quanh phần lõi (nhân vật, cơ chế nhỏ, câu chuyện, hiệu ứng, âm thanh…). Sáng tạo gọn và không phá yêu cầu được tính điểm trong hạng mục F của [RUBRIC](RUBRIC.md); ghi mục "Sáng tạo của tôi" trong README của bạn.

- **Game tốt là game đúng yêu cầu của khách hàng**, không phải game phức tạp hay đẹp nhất. Làm đúng và chứng minh được là đúng trước, trau chuốt sau.
- **Cân nhắc kỹ quota token của bạn.** Đốt nhiều token không làm bài tốt hơn. Ngữ cảnh gọn, kế hoạch rõ, kiểm chứng sớm thường vừa rẻ vừa đúng hơn chạy agent liên tục.
- **Kiểm chứng là phần quan trọng nhất.** Bằng chứng (test, output headless, ảnh, số đo) đáng giá hơn lời mô tả.

---

## Bàn giao cuối cùng

Một **repo GitHub cá nhân, public**, gồm:

1. **Toàn bộ mã nguồn** của game qua 4 phase, tag `phase-1` … `phase-4`, Release `v1.0.0`.
2. **Video demo `.mp4` dưới 5 phút** (đính kèm Release `v1.0.0` hoặc `docs/demo/demo.mp4`, link ở đầu README): chơi thử và cho thấy bằng chứng game chạy đúng.
3. **Bằng chứng kiểm chứng** của từng phase (định dạng tự chọn).
4. **Harness AI đã dùng** (AGENTS.md / CLAUDE.md, skills, hooks, plugins…), giữ nguyên trong repo và lịch sử git.
5. **Ghi chép ngắn:** spec/giả định mỗi phase, nhật ký dùng AI (gồm token/chi phí ước tính), retro.

Không commit API key, token hay `.env`. Gửi link repo theo hướng dẫn của Coach.

## Đánh giá (100 điểm)

| Hạng mục | Điểm |
|---|---|
| Test tự động ẩn (headless, gồm kiểm tra lại phase trước) | 30 |
| Kiểm chứng & bằng chứng của bạn | 20 |
| Quy trình SDLC & harness AI | 15 |
| Evaluation & retro (gồm cách bạn dùng token) | 10 |
| Hiệu năng & ổn định | 10 |
| Chất lượng sản phẩm (đúng yêu cầu, chơi được) | 10 |
| Video demo | 5 |

## Quy định

- Dùng AI thoải mái; không sao chép repo của người khác.
- Bằng chứng phải thật: test luôn đạt hay output sửa tay là vi phạm.
- Nhân vật, bối cảnh là bản gốc của lab; asset bên ngoài chỉ dùng loại CC0/CC-BY/MIT hoặc tự tạo, ghi nguồn trong `CREDITS.md`.
