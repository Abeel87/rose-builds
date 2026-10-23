"""Strictly frame current-client ZSC2 extensions around the legacy ZSC body.

The trailing pointer and chunk lengths are validated against the complete input.
The A2C chunk contains a u16 material count followed by one byte per material.
Unknown framed chunks are retained with their exact payload and are explicitly
reported, rather than being treated as legacy object data or silently discarded.
"""
import hashlib
import struct
from rose_formats import read_zsc as read_legacy_zsc


def read_zsc(data):
    if data[-8:-4] != b'ZSC2':
        return read_legacy_zsc(data)
    start = struct.unpack_from('<I', data, len(data) - 4)[0]
    if start > len(data) - 16:
        raise ValueError('Invalid ZSC2 extension pointer')
    scene = read_legacy_zsc(data[:start])
    pos, end, extensions = start, len(data) - 8, []
    terminated = False
    while pos < end:
        if pos + 8 > end:
            raise ValueError('Truncated ZSC2 chunk header')
        tag, size = struct.unpack_from('<4sI', data, pos)
        pos += 8
        if tag == b'\0' * 4:
            if size != 0 or pos != end:
                raise ValueError('Invalid ZSC2 extension terminator')
            terminated = True
            break
        if pos + size > end:
            raise ValueError('Truncated ZSC2 chunk payload')
        payload = data[pos:pos + size]
        pos += size
        rec = {'tag': tag.rstrip(b'\0').decode('ascii'), 'size': size,
               'sha256': hashlib.sha256(payload).hexdigest()}
        if tag == b'A2C\0':
            if len(payload) < 2:
                raise ValueError('Truncated A2C material count')
            count = struct.unpack_from('<H', payload)[0]
            if count != len(scene['materials']) or len(payload) != 2 + count:
                raise ValueError('A2C material count/length mismatch')
            flags = payload[2:]
            if any(flag not in (0, 1) for flag in flags):
                raise ValueError('A2C flag outside boolean range')
            for material, flag in zip(scene['materials'], flags):
                material['alpha_to_coverage'] = bool(flag)
            rec.update(materialCount=count, enabledCount=sum(flags), parsed=True)
        else:
            rec.update(parsed=False, payloadHex=payload.hex())
        extensions.append(rec)
    if not terminated or pos != end:
        raise ValueError('Missing ZSC2 terminator')
    scene['extensions'] = extensions
    scene['extensionStart'] = start
    return scene
