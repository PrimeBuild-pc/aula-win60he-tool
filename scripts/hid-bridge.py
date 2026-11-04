"""Local KB2 diagnostic transport; never opens the keyboard or mouse interfaces."""
import hid
import json
import sys
import time

device = hid.device()
try:
    matches = [d for d in hid.enumerate(0x1CA2, 0x1902) if d.get('usage_page') == 0xFFA0 and d.get('usage') == 1]
    if len(matches) != 1:
        raise RuntimeError('Expected one WIN60 HE MAX vendor interface')
    device.open_path(matches[0]['path'])
    for line in sys.stdin:
        try:
            packet = json.loads(line)
            if len(packet) != 64 or packet[0] != 0x5C or packet[2] not in [0, 1, 24, 35, 41, 42, 43, 44]:
                raise RuntimeError('Only KB2 diagnostics and RGB packets are allowed')
            if packet[2] == 0 and packet[4] not in [1, 33, 38, 80, 112]:
                raise RuntimeError('Only information queries are allowed')
            if packet[2] == 0 and packet[5:7] != [255, 255]:
                raise RuntimeError('Information writes are disabled in this diagnostic bridge')
            if packet[2] == 35 and packet[4] != 0:
                raise RuntimeError('Key register writes are disabled in this diagnostic bridge')
            if packet[2] == 41 and packet[4] != 0:
                raise RuntimeError('Global performance writes are disabled in this diagnostic bridge')
            if packet[2] == 44 and packet[4] != 0:
                raise RuntimeError('SOCD writes are disabled in this diagnostic bridge')
            device.set_nonblocking(1)
            while device.read(65):
                pass
            device.set_nonblocking(0)
            device.write(bytes([0] + packet))
            deadline = time.monotonic() + 2
            response = None
            seen = []
            while time.monotonic() < deadline:
                data = device.read(65, 200)
                if data:
                    seen.append(data[:8])
                if data and data[0] == 0 and len(data) > 1:
                    data = data[1:]
                if data and data[0] == 0x5C and (data[2] & 0x7F) == packet[2]:
                    response = data
                    break
            if response is None:
                if packet[2] == 1:
                    response = []  # SYNCPack is sent without an awaited ACK by the web driver.
                else:
                    raise RuntimeError(f'No matching KB2 response within two seconds; headers={seen}')
            print(json.dumps({'packet': response}), flush=True)
        except Exception as error:
            print(json.dumps({'error': str(error)}), flush=True)
finally:
    device.close()
