"""Encode unmodified Chrome JPEG frames from length-prefixed stdin. Requires OpenCV."""
import sys, struct, json
import cv2
import numpy as np

def read_exact(n):
    data = bytearray()
    while len(data) < n:
        chunk = sys.stdin.buffer.read(n - len(data))
        if not chunk:
            return None
        data.extend(chunk)
    return data

writer = cv2.VideoWriter(sys.argv[1], cv2.VideoWriter_fourcc(*'mp4v'), 10, (1280, 720))
if not writer.isOpened():
    raise RuntimeError('MP4 encoder unavailable')
frames = 0
while True:
    header = read_exact(8)
    if header is None:
        break
    size, repeats = struct.unpack('<II', header)
    data = read_exact(size)
    if data is None:
        raise RuntimeError('Truncated frame')
    frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None or frame.shape[:2] != (720, 1280):
        raise RuntimeError('Invalid Chrome frame')
    for _ in range(repeats):
        writer.write(frame)
        frames += 1
writer.release()
print(json.dumps({'frames': frames, 'fps': 10, 'duration_s': frames / 10, 'codec': 'mp4v', 'audio': False}))
