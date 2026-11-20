# Đảo Đèn Lồng — bản triển khai Phase 1

**Demo video:** chưa quay; sẽ bổ sung trước Release cuối. **Ảnh chạy thật:** [gameplay](docs/proof/phase-1/gameplay.png), [màn bắt đầu](docs/proof/phase-1/intro.png), [thắng màn](docs/proof/phase-1/won.png). Tag bàn giao: `phase-1`; Release `v1.0.0` dành cho Phase 4.

**Ngô Văn Tuân · MSSV 2A202603630 · L3A** · 26ai.tuannv3@vinuni.edu.vn

Game 3D góc nhìn thứ ba: điều khiển Mây nhặt đom đóm và thắp lại 5 Đèn Lồng Lớn trên Đảo Bến, tránh Bóng Mực trước bình minh. Node.js >=22; browser hỗ trợ WebGL. Kiểm chứng local trên Windows; CI tự động kiểm tra macOS/Linux khi push, xem kết quả tại [GitHub Actions](https://github.com/ngotuna23a/K5-L3A-DAY12-NgoVanTuan-2A202603630-AI-SDLC-Dao-Den-Long/actions).

## Cài và chơi — 3 lệnh

```sh
npm ci
npm run build
npm start
```

Mở **http://localhost:4173**, nhấn **Mang ánh sáng về đảo**. Build `dist/` là web tĩnh, chứa sẵn Three.js và license; không tải CDN/font/asset ngoài. Phải phục vụ bằng HTTP, không mở `index.html` bằng `file://`.

## Điều khiển và luật chơi

| Phím | Hành động |
|---|---|
| WASD / phím mũi tên | Di chuyển theo camera |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn gần nhất trong 3 m |
| Q | Tỏa sáng, dùng 2 đom đóm, stun và đẩy Bóng Mực |
| Kéo chuột / lăn chuột | Xoay / zoom camera |
| Esc / nút Tạm dừng | Tạm dừng, tiếp tục |

Nhặt bằng cách đến gần; mang tối đa 16, mỗi đèn cần 8. Đèn đã sáng bảo vệ bán kính 5 m. Có 3 máu, đêm dài 300 s; hết đèn chưa sáng thì thắng, hết máu hoặc hết giờ thì thua. Mép đảo chặn bước đi, không phạt rơi. Sau thắng/thua chọn **Chơi lại Đêm 1**. Âm thanh tổng hợp là tùy chọn, bật bằng nút trên cùng. Khi rời tab game tự tạm dừng.

Điểm: +10/đom đóm, +150/đèn, +25/Bóng Mực mới bị stun. Khi thắng thêm `floor(time_left_s) × 2 + flames × 100`, cộng đúng một lần; khi thua không thưởng cuối. Tuning đầy đủ ở [game.contract.json](game.contract.json); giả định và ưu tiên sự kiện ở [ghi chép Phase 1](docs/notes/phase-1.md).

## Test và headless

```sh
npm test
npm run verify
```

`verify` là gate bàn giao: test → build → 4 scenario nhỏ và một lần chơi toàn màn mặc định có assertion và so output hai lần → HTTP smoke test; lỗi bất kỳ trả mã khác 0. Bằng chứng tự ghi vào [docs/proof/phase-1](docs/proof/phase-1), gồm TAP, JSONL nguyên bản, thông tin máy và hash source.

```sh
node src/headless.mjs --seed 42 --night 1 --ticks 600 --out result.jsonl
node src/headless.mjs --seed 42 --night 1 --scenario tests/scenarios/win.json --inputs tests/scenarios/win-inputs.json --ticks 60 --snapshot-every 1 --out win.jsonl
```

Headless không cần WebGL/GPU/Three.js: fixed step 60 Hz; snapshot tick 0 trước input; mỗi input k sinh trạng thái/event k+1; nút kích hoạt false→true; input thiếu giữ trạng thái. Khoảng cách theo XZ, inclusive; JSONL làm tròn tọa độ 3 chữ số. Hỗ trợ seed, night, scenario, inputs, ticks, out, snapshot-every theo Contract v1.0. End luôn ở dòng cuối, dừng sớm khi thắng/thua. File inputs/scenario sai định dạng trả exit 2/stderr, lỗi CLI/runtime khác trả mã khác 0. Chạy lại cùng seed/scenario/inputs có output giống hệt. Các giá trị tuning đều đang được dùng; không có mục null.

Scenario `win` gom 5 đèn về một chỗ để kiểm chứng đường đi thắng. `default-play.jsonl` là bằng chứng bot thắng màn mặc định bằng input bình thường, không dùng scenario override; chạy lại bằng seed `202603630` và `docs/proof/phase-1/default-play-inputs.json`. Các scenario khác: pulse, hết máu, bình minh. Browser QA và ảnh được tạo bằng Chrome cài sẵn, qua CDP với `scripts/browser-qa.mjs`; không cài framework test browser. Xem [phạm vi bằng chứng](docs/proof/phase-1/README.md).

## Sáng tạo của tôi

Mây đội nón lá và mang đèn nhỏ; đảo nổi giữa biển mây, đom đóm lập lòe, vòng ánh sáng khi tỏa sáng, âm thanh Web Audio tổng hợp và minimap hiển thị nơi trú ẩn. Đèn sáng dần làm đảo ấm hơn. Các chi tiết này thuộc renderer; cùng một `src/game.mjs` chạy browser/headless, không thêm thực thể gameplay ngoài contract. Bằng chứng hồi quy: `npm run verify`; ảnh browser nằm ở đầu README.

Harness dùng thực tế: [AGENTS.md](AGENTS.md), gate `scripts/verify.mjs`, `scripts/browser-qa.mjs`, CI `.github/workflows/verify.yml`. Giữ nguyên các tài liệu lab ban đầu bên dưới. Quyền và nguồn xem [CREDITS.md](CREDITS.md), [LICENSE](LICENSE).

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
