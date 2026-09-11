"""
Turns the Canva export (which has one candidate's details printed on it) into a
clean background template with nothing candidate-specific left on the page.

It removes drawing operations rather than painting white boxes over them, so the
rule under the name, the seal, the signature block and the decorative corners all
survive untouched.

Text is decoded through each font's ToUnicode map and matched against a list of
the fixed wording on the design. Anything not on that list is candidate data and
gets removed. Classifying by content rather than by font matters here: the
closing sentence is set in the same face as the fixed wording below it, so a
font-based rule would leave "We appreciate his work and contributions." behind.

    python3 scripts/build-clean-template.py <source.pdf> <output.pdf>
"""
import re
import sys

import pikepdf

# The wording that is part of the design and stays on every certificate.
# Compared case-insensitively after collapsing whitespace.
STATIC_WORDING = [
    "certificate",
    "of internship",
    "this certificate is proudly presented to",
    "director",
    "nextute edtech pvt. ltd.",
]

QR_IMAGE_SIZE = (150, 150)  # px, distinguishes the QR from the logo and the seal


def parse_to_unicode(font) -> dict:
    """Minimal CMap reader: enough for the bfchar/bfrange tables Canva emits."""
    stream = font.get("/ToUnicode")
    if stream is None:
        return {}
    data = bytes(stream.read_bytes()).decode("latin-1")
    mapping = {}

    for section in re.findall(r"beginbfchar(.*?)endbfchar", data, re.S):
        for src, dst in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", section):
            mapping[int(src, 16)] = bytes.fromhex(dst).decode("utf-16-be", "replace")

    for section in re.findall(r"beginbfrange(.*?)endbfrange", data, re.S):
        for lo, hi, dst in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", section
        ):
            start, end, base = int(lo, 16), int(hi, 16), int(dst, 16)
            for offset in range(end - start + 1):
                mapping[start + offset] = chr(base + offset)

    return mapping


ESCAPES = {ord("n"): 10, ord("r"): 13, ord("t"): 9, ord("b"): 8, ord("f"): 12}


def read_literal_string(data: bytes, index: int) -> tuple[bytes, int]:
    """Reads a PDF literal string starting at the opening bracket."""
    out = bytearray()
    depth = 1
    index += 1

    while index < len(data):
        char = data[index]
        if char == 0x5C:  # backslash
            index += 1
            if index >= len(data):
                break
            nxt = data[index]
            if 0x30 <= nxt <= 0x37:  # octal escape, up to three digits
                digits = bytearray()
                while index < len(data) and 0x30 <= data[index] <= 0x37 and len(digits) < 3:
                    digits.append(data[index])
                    index += 1
                out.append(int(digits.decode(), 8) & 0xFF)
                continue
            out.append(ESCAPES.get(nxt, nxt))
            index += 1
            continue
        if char == 0x28:  # (
            depth += 1
        elif char == 0x29:  # )
            depth -= 1
            if depth == 0:
                return bytes(out), index + 1
        out.append(char)
        index += 1

    return bytes(out), index


def decode_block(block: bytes, cmaps: dict) -> str:
    """
    Pulls the readable text out of one BT...ET block.

    Canva emits one glyph per show operation and mixes the two string forms —
    some glyphs as <00A5> hex, others as (\\x00\\x02) literals — so both have to
    be handled or the decoded text comes out as nonsense.
    """
    current = {}
    text = []
    index = 0

    while index < len(block):
        char = block[index]

        if char == 0x2F:  # a name, possibly a font selection
            match = re.match(rb"/(\w+)\s+[\d.]+\s+Tf", block[index:])
            if match:
                current = cmaps.get(match.group(1).decode(), {})
                index += match.end()
                continue
            index += 1
            continue

        if char == 0x3C and index + 1 < len(block) and block[index + 1] != 0x3C:
            end = block.find(b">", index)
            if end == -1:
                break
            raw = block[index + 1:end].decode("latin-1")
            raw = "".join(c for c in raw if c in "0123456789abcdefABCDEF")
            codes = [int(raw[i:i + 4], 16) for i in range(0, len(raw) - 3, 4)]
            text.append("".join(current.get(code, "") for code in codes))
            index = end + 1
            continue

        if char == 0x28:  # (
            raw, index = read_literal_string(block, index)
            codes = [int.from_bytes(raw[i:i + 2], "big") for i in range(0, len(raw) - 1, 2)]
            text.append("".join(current.get(code, "") for code in codes))
            continue

        index += 1

    return "".join(text)


def normalise(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


def is_static(text: str) -> bool:
    cleaned = normalise(text)
    if not cleaned:
        return True  # nothing readable, leave it alone
    return any(cleaned == wording for wording in STATIC_WORDING)


def qr_xobject_names(resources) -> set:
    names = set()
    for key, xobj in (resources.get("/XObject", {}) or {}).items():
        if str(xobj.get("/Subtype")) != "/Image":
            continue
        if (int(xobj.get("/Width", 0)), int(xobj.get("/Height", 0))) == QR_IMAGE_SIZE:
            names.add(str(key).lstrip("/"))
    return names


def clean_stream(data: bytes, resources, log: list) -> bytes:
    fonts = (resources.get("/Font", {}) or {}) if resources is not None else {}
    cmaps = {str(key).lstrip("/"): parse_to_unicode(font) for key, font in fonts.items()}

    output = bytearray()
    cursor = 0

    for block in re.finditer(rb"BT.*?ET", data, re.S):
        text = decode_block(block.group(0), cmaps)
        if is_static(text):
            continue
        output += data[cursor:block.start()]
        cursor = block.end()
        log.append(f'  removed text: "{normalise(text)[:70]}"')

    output += data[cursor:]
    result = bytes(output)

    for name in (qr_xobject_names(resources) if resources is not None else set()):
        result, count = re.subn(rb"/" + name.encode() + rb"\s+Do", b"", result)
        if count:
            log.append(f"  removed QR image: /{name}")

    return result


def walk(resources, log: list) -> None:
    for _, xobj in (resources.get("/XObject", {}) or {}).items():
        if str(xobj.get("/Subtype")) != "/Form":
            continue
        child = xobj.get("/Resources")
        before = xobj.read_bytes()
        cleaned = clean_stream(before, child, log)
        if cleaned != before:
            xobj.write(cleaned)
        if child is not None:
            walk(child, log)


def main() -> None:
    source, output = sys.argv[1], sys.argv[2]
    pdf = pikepdf.open(source)
    page = pdf.pages[0]
    resources = page.get("/Resources")
    log = []

    original = pikepdf.Page(page).obj.Contents.read_bytes()
    cleaned = clean_stream(original, resources, log)
    if cleaned != original:
        page.Contents.write(cleaned)

    walk(resources, log)

    print("\n".join(log) if log else "  nothing removed — check the keep-list")

    # Canva stamps the source filename and author into the metadata. A blank
    # template should not carry the first candidate's paperwork around with it.
    with pdf.open_metadata() as meta:
        meta.clear()
    if "/Metadata" in pdf.Root:
        del pdf.Root["/Metadata"]
    pdf.docinfo = pdf.make_indirect(
        pikepdf.Dictionary(
            Title="Nextute Internship Certificate Template",
            Creator="Nextute Certificate Management System",
        )
    )

    pdf.save(output)
    print(f"Clean template written to {output}")


if __name__ == "__main__":
    main()
