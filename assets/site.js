// PAS tanıtım sitesi: görünür olunca belirme, açılış penceresinin kaydırmayla düzleşmesi, sayaçlar
// ve yapışkan anlatım. Hareket azaltma tercihinde her şey ilk hâliyle görünür.
(() => {
  const azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dil = document.documentElement.lang || "tr";
  const bicim = new Intl.NumberFormat(dil === "tr" ? "tr-TR" : "en-US");

  // Üst çubuk: kaydırılınca alt çizgi.
  const ust = document.querySelector(".ust");
  const ustGuncelle = () => ust && ust.classList.toggle("kaydi", window.scrollY > 4);

  // Sayaç: 0'dan hedefe (easeOutCubic).
  const say = (el) => {
    const hedef = Number(el.dataset.say);
    if (azalt || !Number.isFinite(hedef)) {
      el.textContent = bicim.format(hedef);
      return;
    }
    const sure = 1300;
    const bas = performance.now();
    const adim = (t) => {
      const p = Math.min(1, (t - bas) / sure);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = bicim.format(Math.round(hedef * e));
      if (p < 1) requestAnimationFrame(adim);
    };
    requestAnimationFrame(adim);
  };

  // Görünür olunca belir (bir kez).
  const gozcu = new IntersectionObserver(
    (girdiler) => {
      for (const g of girdiler) {
        if (!g.isIntersecting) continue;
        g.target.classList.add("gorundu");
        g.target.querySelectorAll("[data-say]").forEach(say);
        if (g.target.matches("[data-say]")) say(g.target);
        gozcu.unobserve(g.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );
  document.querySelectorAll(".belir, .pencere, [data-gozle]").forEach((el) => {
    if (azalt) {
      el.classList.add("gorundu");
      el.querySelectorAll("[data-say]").forEach(say);
    } else {
      gozcu.observe(el);
    }
  });

  // Açılış penceresi: kaydırdıkça eğimden düzleşir (--p: 0 → 1).
  const pencere = document.querySelector(".pencere");
  const pencereGuncelle = () => {
    if (!pencere || azalt) return;
    const r = pencere.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
    pencere.style.setProperty("--p", p.toFixed(3));
  };

  // Yapışkan anlatım: bölüm içindeki ilerlemeye göre etkin adım.
  const anlatim = document.querySelector(".anlatim");
  const adimlar = anlatim ? [...anlatim.querySelectorAll(".adim")] : [];
  const paneller = anlatim ? [...anlatim.querySelectorAll(".panel")] : [];
  const cizgiler = anlatim ? [...anlatim.querySelectorAll(".ilerleme i")] : [];
  const anlatimGuncelle = () => {
    if (!anlatim || adimlar.length === 0) return;
    const r = anlatim.getBoundingClientRect();
    const toplam = anlatim.offsetHeight - window.innerHeight;
    const p = toplam > 0 ? Math.min(0.9999, Math.max(0, -r.top / toplam)) : 0;
    const n = adimlar.length;
    const etkin = Math.floor(p * n);
    adimlar.forEach((a, i) => a.classList.toggle("etkin", i === etkin));
    paneller.forEach((a, i) => a.classList.toggle("etkin", i === etkin));
    cizgiler.forEach((c, i) => c.style.setProperty("--d", String(Math.min(1, Math.max(0, p * n - i)))));
  };

  let bekliyor = false;
  const kaydir = () => {
    if (bekliyor) return;
    bekliyor = true;
    requestAnimationFrame(() => {
      bekliyor = false;
      ustGuncelle();
      pencereGuncelle();
      anlatimGuncelle();
    });
  };
  window.addEventListener("scroll", kaydir, { passive: true });
  window.addEventListener("resize", kaydir);
  kaydir();
})();
