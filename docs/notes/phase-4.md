# Phase 4 — kế hoạch phát hành

Nguồn: docs/requirements/phase-4.txt, Contract v1.3. Luật v1.2 giữ nguyên. Ng.txt/data/profile không commit. Không tự push/tag/Release khi chưa có yêu cầu chốt; chuẩn bị đủ artifact trước.

| Tiêu chí | Cách kiểm chứng |
|---|---|
| Benchmark chuẩn 200/100, 3 đèn100 dầu, không tương tác/hao/spawn/end | Unit benchmark scene invariants và screenshot/state lúc chạy |
| Warmup3s, đo30s, fps/p1/p95/load | CLI Chrome/WebGL cùng renderer; raw frame times và metadata máy; không suy từ headless |
| Soak10Đêm một process, seed7+i, reset/RSS | Lệnh chuẩn, results/crashes/rawRSS, threshold20%; không padding baseline |
| Leaderboard top10/tie/name/schema/persist/export | Unit pure rules + API/CLI subprocess + browser save/reload |
| Remap tất cả/conflict/default/persist | Unit settings + browser keyboard thật |
| Caption/edge shade/wind/10s/lowfuel | Browser scenario và ảnh |
| Reduce motion/chữ≥18/lớn1.25 | Browser computed styles và settings persistence |
| Clean install≤3lệnh/ZIP/license/docs | Checkout sạch, npm ci/build/start; kiểm tra ZIP tự chứa runtime/dist |
| Retro/video<5phút | Retro4phase; record Chrome thật, ghép vào mp4 bằng công cụ sẵn có; không dựng kết quả giả |

Giả định: seed Đêm i dùng i=0…9 (7…16). Benchmark camera dùng x=30cosθ,z=-30sinθ theo quy ước góc XZ của bản đồ; first frame(30,15,0). Phân vị95 dùng nearest-rank. Web không có RSS renderer đáng tin qua JS nên peak_mem_mb=null và giải thích, không dùng RSS Node thay cho Chrome. Benchmark không nhận input; riêng wander không đổi sang chase.

## Kết quả và AI log

- 71 unit/CLI test; build, 28 deterministic cases (so byte hai lần), bot Đêm 1 mặc định won ở tick 14400 và 3 full headless night. Browser QA đạt 34 nhóm, có keyboard trái/phải sau xoay, remap/conflict/restore/reload, leaderboard disk/reload, captions, reduce motion, fonts, mobile và runtime errors.
- Benchmark cuối sau sửa camera: avg 140.88, p1 22.16 FPS, p95 25.0 ms, load 1955.89 ms, viewport 1280×720, Intel Iris Xe/D3D11, Windows. Warmup 3 s, raw frame sum 29.9976 s trong cửa sổ 30 s (không lấy frame nằm ngoài). p1 chưa đạt mốc tham khảo local; không lọc slow frames. Lần đầu 140.09/25.04 FPS được giữ ở bench-first để thấy biến thiên, không chọn số đẹp thay thế kết quả cuối.
- Camera ban đầu dùng +sin; quarter-turn review chỉ ra sai chiều khi nhìn từ +Y. Sửa z=-30sin, thêm assertion -30 ở 3.75 s, đo lại. Cùng geometry/material và effect, riêng shade benchmark dùng InstancedMesh thay 800 draw calls; không giản lược mô hình/ánh sáng.
- Soak output gốc: 10 Đêm seed7…16, tất cả lost, không crash; RSS 29.2695→33.0859 MB (+13.04%), 15.46 s. Bản đầu JIT RSS tăng hơn20%; dùng runtime headless jitless/GC tại reset/nursery1MB, không giữ allocation giả để nâng baseline. Benchmark Chrome không dùng flags này. Verify chạy thêm một soak riêng và giữ output riêng.
- QA lần đầu so chuỗi CSS `.3` với `0.3` bị đỏ; sửa assertion so Number, không sửa renderer. QA accessibility dùng stress scene đã kết thúc nên pause timeout; tách fixture mới. `browser-failure.json`/failure.png là output lần thất bại được giữ; browser-qa.json là lần chạy đạt cuối.
- Gameplay chỉ trích wanderShade thành method dùng chung benchmark; regression còn hiệu lực của Phase1–3 giữ nguyên. Test Phase4 mới bảo vệ remap/persistence/schema/top10, invariants scene và metrics.
- UI leaderboard dùng API của server Node bind loopback; cùng module storage với export. Runtime data bị gitignore. Bản web tĩnh chỉ dist không có API, README hướng dẫn npm start để có đầy đủ leaderboard.
- Demo ghi frame Chrome thật, keyboard tự động ở world mặc định; proof panel đọc JSON/TAP thật. Không tuyên bố human playthrough ba Đêm; không dùng capture FPS làm bench. ZIP tự chứa dist/source/license/docs/demo, không ng.txt, .git, node_modules hay dữ liệu cá nhân runtime.
- Retro bốn phase ở docs/notes/retro.md. Không có billing usage; tổng token chỉ ước tính và công bố rõ. Không thêm dependency npm.
- Chưa push/tag/Release. Mốc DoD phát hành chỉ hoàn tất khi chủ bài yêu cầu chốt phase-4 + Release v1.0.0. Hidden tests/máy giảng viên chưa có.
- Review screenshot/video phát hiện caption shade bị bó hẹp khi ở sát mép: đặt width và clamp vị trí vào viewport. Review remap phát hiện đóng Settings khi đang chờ phím có thể gán nhầm input gameplay: hủy capture khi rời Settings, browser regression kiểm tra lại bằng KeyA thật.
- Video cuối dài51.5s/515frame/1280×720/MPEG-4, không audio; metadata ở docs/demo/recording.json. ZIP đã qua CRC/path exclusion, clean npm ci/build/HTTP, API restart và CLI export. Proof clean-install.json; bản release draft ở release-v1.0.0.md.
- Recorder từng capture khi Chrome page chưa active: đợi game sẵn sàng trước capture, retry lỗi page transition tạm thời và bắt promise lỗi để luôn đóng encoder/browser; ghi lại video thật, không vá frame/output thủ công.

- Bản cuối lấy radius trực tiếp từ nightMap(1)=40m, không dùng margin39m; test kiểm tra cả dải r>39 và không vượt40. Đo lại sau sửa; output trước radius giữ ở bench-before-radius. Mọi số đo tham khảo cuối trong README/retro được cập nhật từ JSON sinh bởi command, không sửa JSON bằng tay.
