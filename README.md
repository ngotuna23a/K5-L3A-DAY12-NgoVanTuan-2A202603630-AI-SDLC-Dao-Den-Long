# Đảo Đèn Lồng — Phase 2: Ba hòn đảo

**Video demo:** chưa quay, sẽ bổ sung trước Release cuối. **Ảnh chạy thật:** [menu](docs/proof/phase-2/menu.png), [Đảo Cau](docs/proof/phase-2/night-2.png), [Đảo Chuông](docs/proof/phase-2/night-3.png), [Bình Minh](docs/proof/phase-2/won-night-3.png).

**Ngô Văn Tuân · MSSV 2A202603630 · L3A** · 26ai.tuannv3@vinuni.edu.vn

Game 3D góc nhìn thứ ba, Contract **v1.1**, Node.js >=22 và browser có WebGL. Cùng Mây qua Đảo Bến, Đảo Cau và Đảo Chuông, gom đom đóm, thắp đèn và né Bóng Mực/Gió Lạc. Phase 1 được giữ nguyên tại tag `phase-1`; tag bàn giao bản này là `phase-2`.

## Cài và chơi — 3 lệnh

```sh
npm ci
npm run build
npm start
```

Mở **http://localhost:4173**, chọn **Bắt đầu hành trình → Lên đường**. Thắng một Đêm để đến Đêm kế tiếp; thắng Đêm 3 tới Bình Minh. Thua thì chơi lại Đêm hiện tại. `dist/` chứa bản web tĩnh và Three.js cục bộ, không dùng CDN hoặc tải asset ngoài. Dùng HTTP, không mở bằng `file://`.

| Phím | Hành động |
|---|---|
| WASD / phím mũi tên | Di chuyển theo camera |
| Space | Nhảy; điều khiển được trên không |
| Shift | Lướt 14 m/s trong 0.2 s, hồi 1.5 s |
| E | Nạp vào đèn chưa sáng gần nhất trong 2 m |
| Q | Tỏa sáng: dùng 3 đom đóm, bán kính 3D 5 m, hồi 3 s |
| Esc / P | Tạm dừng; có Tiếp tục, Chơi lại, Cài đặt, Về menu |
| Kéo / lăn chuột | Xoay / zoom camera |

Mang tối đa **10**, mỗi đèn cần **10**. Đèn sáng bảo vệ trong 6 m. Bị Bóng Mực chạm mất 1 Ngọn Lửa, rơi nửa đom đóm và bất tử 1.5 s. Ngoài đảo sẽ rơi; dưới Y=−10 mất 1 máu và tất cả đom đóm, hồi sinh sau 60 tick nếu còn sống. Đom đóm rơi tồn tại 8 s. Bùa Gió cho 10 s chạy nhanh và lướt không cooldown. Gió Lạc cướp đom đóm; pulse lúc nó chạy trốn có thể lấy lại đồ.

Đêm 1/2/3 có 5/6/7 đèn và dài 300/330/360 s. Đảo Cau có cầu tre và bục phóng qua biển mây; Đảo Chuông có tầng cao, dốc, bục nhảy, tháp và gió định kỳ. Khi hết máu luôn thua; còn sống và tất cả đèn sáng thì thắng, kể cả đúng tick hết giờ; còn lại hết giờ thì thua.

Điểm: **+10 mỗi đom đóm nạp**, +100/đèn, +5/Bóng Mực trúng pulse mỗi lần; khi thắng cộng `floor(time_left_s) × 2 + 50 × flames`. Nhặt đom đóm không cộng điểm. Tổng hành trình chỉ gồm các Đêm đã thắng. Âm lượng/độ nhạy chuột được lưu giữa các lần mở.

## Kiểm chứng và headless

```sh
npm test
npm run verify
```

`verify` chạy unit/CLI regression, build, scenario riêng cho từng cơ chế mới, so JSONL hai lần, replay thắng Đêm 1 mặc định bằng input thông thường, đo toàn bộ 3 Đêm headless và HTTP smoke. Lỗi bất kỳ trả mã khác 0; output thật lưu tại [docs/proof/phase-2](docs/proof/phase-2). Bộ bằng chứng Phase 1 không bị ghi đè.

```sh
node src/headless.mjs --seed 42 --night 2 --ticks 19800 --out night2.jsonl
node src/headless.mjs --seed 42 --night 3 --scenario tests/scenarios/phase-2/upper-pad.json --ticks 90 --snapshot-every 1 --out pad.jsonl
node src/headless.mjs --seed 42 --night 1 --scenario tests/scenarios/phase-2/pause.json --inputs tests/scenarios/phase-2/pause-inputs.json --ticks 120 --out pause.jsonl
```

Headless không cần GPU/Three.js. Tick cố định 60 Hz; input k tạo state/event k+1; snapshot 0 trước input; nút theo false→true; field vắng giữ nguyên. Pause vẫn tăng `tick` nhưng giữ `sim_tick` và mọi timer/spawn/TTL. File inputs/scenario lỗi trả **exit 2**, stderr; lỗi khác trả mã khác 0. Output JSONL deterministic, tọa độ làm tròn 3 chữ số, dòng cuối luôn là `end`; dừng sớm khi thắng/thua. `--night` nhận 1, 2, 3.

Tuning và toàn bộ khóa mới ở [game.contract.json](game.contract.json). Scenario v1.1 hỗ trợ timer người chơi, trạng thái Bóng Mực, drifters, charms, random_drifters và wind_enabled. Snapshot có velocity/grounded/invuln/cooldowns/charm, night, wind và các mảng entities mới; `ttl_s=null` cho đom đóm random không hết hạn. Quy ước/giả định và acceptance criteria ở [spec Phase 2](docs/notes/phase-2.md), gồm điểm xuất phát Đêm 3 do ticket chưa chỉ định.

Browser QA dùng Chrome cài sẵn qua CDP, script `scripts/browser-qa.mjs`, server `npm start`, debugger port 9222 và profile kiểm thử riêng. Nó kiểm tra điều khiển theo màn hình, UI/campaign, settings, audio state, lấy ảnh thật và đo FPS 6 s ở 1280×720. URL `?qa=1` chỉ bật hỗ trợ dựng scenario và chạy bước simulation cho kiểm thử; bản chơi thông thường không có các hàm đó. Các màn thắng trong UI test dùng scenario, ghi rõ trong biên bản; replay thắng Đêm 1 headless dùng thế giới mặc định và không sửa state.

## Sáng tạo của tôi

Mây giữ nón lá/đèn nhỏ, biển mây, đom đóm lập lòe, minimap vùng an toàn, lời Ông Đăng, hiệu ứng vòng sáng và nhạc nền/SFX tổng hợp bằng Web Audio. Geometry dùng chung với simulation; phần trang trí không tạo thực thể headless mới. Dùng instancing và hình học đơn giản để giữ hiệu năng. Màu và ambient được đổi theo chuẩn Ticket-02.

Nguồn: [CREDITS.md](CREDITS.md), [LICENSE](LICENSE). Harness: [AGENTS.md](AGENTS.md), `scripts/verify.mjs`, `scripts/browser-qa.mjs` và workflow CI Ubuntu/macOS. `ng.txt` là file trao đổi local, được gitignore và không đưa lên GitHub. Xem kết quả kiểm chứng cross-platform ở GitHub Actions.

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
