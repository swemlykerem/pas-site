"""Siteyi üretir: `kaynak/sablon.html` + `kaynak/metinler.py` → `index.html` (tr), `en/index.html`.

    python kaynak/uret.py

Şablondaki her `{{anahtar}}` iki dilde de tanımlı olmalı; eksik ya da fazla anahtar üretimi
durdurur (yarım çevrilmiş sayfa yayına çıkmaz). Metinler HTML olarak yazılır (kaçışlanmaz).
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "kaynak"))
from metinler import ORTAK, METINLER  # noqa: E402

YER = re.compile(r"\{\{([a-z0-9_]+)\}\}")


def uret() -> None:
    sablon = (KOK / "kaynak" / "sablon.html").read_text(encoding="utf-8")
    anahtarlar = set(YER.findall(sablon))
    # Önbellek kırıcı: CSS/JS içeriği değişince adres değişir (Cloudflare tarayıcıya 4 saat önbellek verir).
    surumler = {
        f"v_{ad}": hashlib.sha256((KOK / 'assets' / f'site.{ad}').read_bytes()).hexdigest()[:10]
        for ad in ("css", "js")
    }
    for dil, metin in METINLER.items():
        degerler = {**ORTAK, **metin, **surumler}
        eksik = anahtarlar - set(degerler)
        fazla = set(metin) - anahtarlar
        if eksik or fazla:
            raise SystemExit(f"{dil}: eksik {sorted(eksik)} fazla {sorted(fazla)}")
        sayfa = YER.sub(lambda m: degerler[m.group(1)], sablon)
        hedef = KOK / ("index.html" if dil == "tr" else f"{dil}/index.html")
        hedef.parent.mkdir(parents=True, exist_ok=True)
        hedef.write_text(sayfa, encoding="utf-8", newline="\n")
        print(f"{dil}: {hedef.relative_to(KOK)} ({len(sayfa) // 1024} KB)")


if __name__ == "__main__":
    uret()
