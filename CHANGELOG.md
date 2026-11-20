# Changelog

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
