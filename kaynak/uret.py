"""Siteyi üretir: `kaynak/sablon.html` (ortak çerçeve) + sayfa gövdeleri + `kaynak/metinler.py`.

    python kaynak/uret.py

Sayfalar: ana sayfa (`ana.html` → `index.html`, `en/index.html`) ve hakkımızda (`hakkimizda.html` →
`hakkimizda/index.html`, `en/about/index.html`); `sitemap.xml` da buradan yazılır. Şablondaki her
`{{anahtar}}` iki dilde de tanımlı olmalı; eksik ya da fazla anahtar üretimi durdurur (yarım
çevrilmiş sayfa yayına çıkmaz). Metinler HTML olarak yazılır (kaçışlanmaz).
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

# sayfa → dil → yayın yolu (kökten, sonda "/")
SAYFALAR = {
    "ana": {"tr": "", "en": "en/"},
    "hakkimizda": {"tr": "hakkimizda/", "en": "en/about/"},
}
# sayfaya özgü başlık ve açıklama anahtarları
BASLIK = {"ana": ("baslik", "aciklama"), "hakkimizda": ("hk_baslik", "hk_aciklama")}


def oku(ad: str) -> str:
    return (KOK / "kaynak" / ad).read_text(encoding="utf-8")


def uret() -> None:
    cerceve = oku("sablon.html")
    govdeler = {ad: oku(f"{ad}.html") for ad in SAYFALAR}
    anahtarlar = set(YER.findall(cerceve)).union(*(YER.findall(g) for g in govdeler.values()))
    sayfa_basliklari = {a for ikili in BASLIK.values() for a in ikili}
    # Önbellek kırıcı: CSS/JS içeriği değişince adres değişir (Cloudflare tarayıcıya 4 saat önbellek verir).
    surumler = {
        f"v_{ad}": hashlib.sha256((KOK / 'assets' / f'site.{ad}').read_bytes()).hexdigest()[:10]
        for ad in ("css", "js")
    }
    for dil, metin in METINLER.items():
        fazla = set(metin) - anahtarlar - sayfa_basliklari
        if fazla:
            raise SystemExit(f"{dil}: fazla {sorted(fazla)}")
        diger = next(d for d in METINLER if d != dil)
        ana_bag = "/" + SAYFALAR["ana"][dil]
        for ad, yollar in SAYFALAR.items():
            yol = yollar[dil]
            baslik, aciklama = BASLIK[ad]
            degerler = {
                **ORTAK,
                **metin,
                **surumler,
                "yol": yol,
                "kok": "../" * yol.count("/"),
                "kok_bag": ana_bag,
                "ana": "" if ad == "ana" else ana_bag,
                "diger_dil_bag": "/" + yollar[diger],
                "yol_tr": yollar["tr"],
                "yol_en": yollar["en"],
                "hk_bag": "/" + SAYFALAR["hakkimizda"][dil],
                "hk_akim": ' aria-current="page"' if ad == "hakkimizda" else "",
                "baslik": metin[baslik],
                "aciklama": metin[aciklama],
            }
            sablon = cerceve.replace("{{govde}}", govdeler[ad])
            eksik = set(YER.findall(sablon)) - set(degerler)
            if eksik:
                raise SystemExit(f"{dil}/{ad}: eksik {sorted(eksik)}")
            sayfa = YER.sub(lambda m: degerler[m.group(1)], sablon)
            hedef = KOK / yol / "index.html"
            hedef.parent.mkdir(parents=True, exist_ok=True)
            hedef.write_text(sayfa, encoding="utf-8", newline="\n")
            print(f"{dil}: {hedef.relative_to(KOK)} ({len(sayfa) // 1024} KB)")

    adresler = "".join(
        f"  <url><loc>https://pasdevs.com/{yollar[dil]}</loc></url>\n"
        for yollar in SAYFALAR.values()
        for dil in METINLER
    )
    (KOK / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{adresler}</urlset>\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    uret()
