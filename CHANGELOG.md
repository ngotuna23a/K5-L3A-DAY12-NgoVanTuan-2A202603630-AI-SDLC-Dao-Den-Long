# Changelog

## Phase 4 — v1.0.0, Contract v1.3 (chờ chốt tag/Release)

- Giữ luật v1.2; thêm bench_cmd/soak_cmd, scene chuẩn 200/100 và raw frame timing, RSS soak một process.
- Leaderboard top 10 trên đĩa, tên/schema/time tie, UI sau loss/dawn và CLI export cùng nguồn.
- Remap 9 hành động, conflict/restore/persist; captions/edge arrow, reduce motion, chữ ≥18 px và ×1.25.
- 71 test, browser regression riêng, evidence Phase 4; ZIP tự chứa runtime, demo MP4, retro bốn phase.
- Benchmark local p1 còn dưới mốc 30 FPS; công bố số đo thật trong bench.json/README. Tag phase-4 và Release v1.0.0 cần chủ bài chốt.

## Phase 3 — Contract v1.2, tag phase-3

Breaking changes:

- Thắng tại dawn với ≥60% đèn sáng; bỏ early win/all_lit; thời lượng 240/270/300 s, reason dawn_survived.
- Fuel/ever_lit/relit_count, hao dầu/tắt/châm dầu; relight giá5, first light giá10.
- Shield chỉ khi fuel≥30; shade drain/target_lantern_id, events refuel/lantern_out/fuel_drain.
- Capacity tăng theo successful_lights, max20; prelit không tính.
- Nạp +5, first light +100, relight +40, pulse drain tổng15, dawn theo fuel/đèn/máu; bỏ thưởng thời gian.
- Mù màu lưu lại, giấy đèn rách/xẹp và nhấp nháy dầu thấp; snapshot/scenario v1.2.

## Phase 2 — Contract v1.1

- Chuẩn hóa số liệu/3 Đêm, dash, fall/respawn, charms/drifters/wind.
- Campaign, menu/pause/settings, audio, HUD, tests/evidence/performance.
- Đã commit/push riêng Phase 2 tại `b8bff3a`, tag `phase-2`; CI macOS/Linux đạt. Snapshot local trước Phase 3 vẫn giữ.

## Phase 1 — Contract v1.0, tag phase-1

- Game Đảo Bến, 5 đèn, movement/jump/camera, motes/shades/pulse, thắng/thua/replay.
- Headless deterministic, test/harness/CI và bằng chứng; sửa trái/phải theo camera.
