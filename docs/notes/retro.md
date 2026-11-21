# Retro — Đảo Đèn Lồng, bốn phase

Ngô Văn Tuân · 2A202603630 · L3A. Bản tổng hợp trước chốt Release v1.0.0.

## Evaluation qua bốn phase

**Phase 1:** Tách simulation dùng chung browser/headless, fixed step 60 Hz và seeded RNG giúp phát hiện lỗi mà chơi mắt thường khó thấy: input giữ/edge, biên inclusive, tick 0 và event order. Browser QA bắt canvas chưa focus nên keyboard không chạy, pulse trong suốt còn cast shadow, và hướng trái/phải theo camera. Bot dùng keyboard thắng map mặc định là bằng chứng bổ sung cho unit test. Tự động test không thay được nhìn screenshot thật.

**Phase 2:** Thêm ba bản đồ, campaign, dash/fall/pad/charm/drifter/wind làm tương tác tăng nhanh. Kiểm tra geometry chung với simulation hiệu quả hơn dựng map rồi sửa collision sau. 23 nhóm browser checks, 14 scenario deterministic và input-only win bảo vệ flow. Các sai lệch AI về độ cao shade, recoil thiếu một bước, pulse bị trì hoãn khi safe-zone expel được phát hiện bằng test boundary 3D và số tick chính xác. Không đổi luật để bot thắng; sửa chiến thuật bot khi pulse quá sớm làm hết đom đóm.

**Phase 3:** Fuel nguyên đơn vị 1/60 tránh drift, đặc biệt tại dầu 0/30/100. ADR ghi rõ loại test early win/all_lit, thay bằng dawn ≥60%, giữ regression còn hiệu lực. 65 test, 28 scenario deterministic và bot thắng tick 14400/1595 điểm. Snapshot làm tròn 1 chữ số nhưng bonus dùng floor dầu thật; test tick cuối kiểm tra no_flames, hết dầu rồi relight và dawn. Đọc yêu cầu đầy đủ trước sửa quan trọng hơn thêm feature nhanh.

**Phase 4:** Thêm leaderboard cùng một nguồn đĩa cho UI/export, remap có conflict/restore/persist, caption và cỡ chữ. 71 test và 34 nhóm browser QA đạt. Benchmark chuẩn đủ 200/100 được đo bằng renderer thật, giữ raw frame times; headless không được dùng thay FPS. Soak 10 Đêm một process không crash, RSS tăng khoảng 13.0% với runtime headless đã công bố. Benchmark local avg khoảng 140.9 FPS, load 1.96 s nhưng 1% low khoảng 22.2 FPS; ghi rõ chưa đạt mốc p1 tham khảo trên máy này. Không bỏ khung chậm hay sửa JSON. Chủ bài đã yêu cầu chốt Release/tag sau khi review artifact; số đo benchmark local vẫn được công bố nguyên trạng.

## Làm việc với AI: hiệu quả và sai sót

Hiệu quả nhất là chuyển từng yêu cầu thành invariant hoặc scenario nhỏ có expected event/tick. AI triển khai nhanh khi có Contract rõ, còn người dùng giữ quyền chọn scope, sửa hướng di chuyển và chốt từng phase. Cùng simulation cho browser/headless giảm hai phiên bản luật lệch nhau. Đo và screenshot thật giúp phân biệt cảm giác “mượt” với p1 thấp.

AI từng sai vì chỉ nhìn assertion thay vì UI: canvas focus, hướng màn hình sau xoay camera; default Node test discovery chạy nhầm checkout Phase 2 trong tmp; CSS opacity được browser chuẩn hóa `0.3` trong khi assertion so chuỗi `.3`. Cách phát hiện là browser input thật, giới hạn danh sách test và so opacity dạng số. QA accessibility ban đầu dùng tiếp stress scene đã kết thúc nên không pause được; sửa fixture độc lập, giữ regression cũ. Benchmark camera ban đầu dùng +sin sai chiều CCW nhìn từ +Y; kiểm tra quarter-turn, sửa -sin và đo lại, giữ output cũ. PowerShell pipe từng làm mất dấu; dùng UTF-8 rõ ràng và apply_patch.

Soak ban đầu RSS tăng do JIT/code cache vượt 20%; không tăng baseline bằng allocation giả. Dùng runtime headless `--jitless`, nursery nhỏ và GC tại reset; công bố đầy đủ flags, đo lại RSS thật. Điều này kiểm tra ổn định simulation dưới cấu hình soak, không chứng minh bộ nhớ Chrome. Ngược lại, số benchmark có biến thiên scheduler/GPU và p1 thấp vẫn phải được trình bày đúng.

## Harness và chi phí

`AGENTS.md` hữu ích nhất: buộc đọc phase hiện tại, không triển khai ticket chưa mở, chạy verify trước bàn giao, giữ evidence cũ, ng.txt local, không tự push/tag. `game.contract.json` là nguồn tuning duy nhất; `scripts/verify.mjs` chặn test đỏ, so byte output hai lần và lưu hash source. Browser CDP kiểm tra focus, trái/phải sau xoay, flow, settings, fonts và resource errors. CI Linux/macOS giúp tránh chỉ chạy được trên máy cá nhân. Skill `sites:sites` hỗ trợ quy trình local web; không triển khai hosting ngoài yêu cầu. Không dùng hook tự tạo hoặc subagent trong phase này.

Không có usage/billing report để biết tổng token hay tiền thực tế. Ước tính thô Phase 1: 20–30 nghìn, Phase 2: 40–60 nghìn, Phase 3: 20–35 nghìn, Phase 4: 40–70 nghìn; tổng khoảng 120–195 nghìn token, **không phải số đo**. Chi phí = token input/output thực × đơn giá model tại thời điểm dùng; chưa biết phân bổ/cache/đơn giá nên không gán số tiền giả. Tiết kiệm bằng tìm targeted bằng rg, đọc file liên quan, dùng lại harness, không cài dependency mới ngoài Three.js đã xin phép, dùng Node test/CDP và asset hình học tự dựng.

Nếu làm lại: viết checklist Test Contract và test tick cuối từ đầu; tách runner QA dùng browser profile/server riêng ngay Phase 1; ghi raw performance và memory sớm để phát hiện p1/code-cache trước sát release. Chốt commit/tag sau mỗi phase giúp không phải phục hồi snapshot cũ. Giữ một lượt người chơi nghe audio và chơi cả ba Đêm mặc định trước bàn giao cuối sẽ bổ sung phần tự động hóa chưa chứng minh được.
