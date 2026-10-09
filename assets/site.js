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

  // Dar ekran menüsü: düğmeyle açılır; bağlantıya tıklayınca ya da Esc ile kapanır.
  const menuDugme = document.querySelector(".menu-dugme");
  if (menuDugme && ust) {
    const kapat = () => {
      ust.classList.remove("acik");
      menuDugme.setAttribute("aria-expanded", "false");
    };
    menuDugme.addEventListener("click", () => {
      menuDugme.setAttribute("aria-expanded", String(ust.classList.toggle("acik")));
    });
    ust.querySelectorAll("nav a").forEach((a) => a.addEventListener("click", kapat));
    document.addEventListener("keydown", (e) => e.key === "Escape" && kapat());
  }

  // Menüde ekranın ortasındaki bölüm işaretlenir.
  const menuBaglari = [...document.querySelectorAll(".ust nav a[href^='#']")];
  const bolumGozcu = new IntersectionObserver(
    (girdiler) => {
      for (const g of girdiler) {
        if (!g.isIntersecting) continue;
        const hedef = g.target.id ? `#${g.target.id}` : "";
        for (const a of menuBaglari) {
          const etkin = a.getAttribute("href") === hedef;
          a.classList.toggle("etkin", etkin);
          if (etkin) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        }
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  // Menüde olmayan bölümler de izlenir: oraya gelince işaret kalkar.
  document.querySelectorAll("main > section").forEach((b) => bolumGozcu.observe(b));

  // E-postayı kopyala: önce pano API'si, olmazsa seçip kopyalama; ikisi de olmazsa e-posta istemcisi.
  const panoya = async (metin) => {
    try {
      await navigator.clipboard.writeText(metin);
      return true;
    } catch {
      const alan = document.createElement("textarea");
      alan.value = metin;
      alan.setAttribute("readonly", "");
      alan.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.append(alan);
      alan.select();
      let tamam = false;
      try {
        tamam = document.execCommand("copy");
      } catch {
        tamam = false;
      }
      alan.remove();
      return tamam;
    }
  };
  const kopyaDurum = document.querySelector(".kopya-durum");
  document.querySelectorAll("[data-kopyala]").forEach((d) => {
    const ilk = d.textContent;
    d.addEventListener("click", async () => {
      if (!(await panoya(d.dataset.kopyala))) {
        window.location.href = `mailto:${d.dataset.kopyala}`;
        return;
      }
      d.textContent = d.dataset.tamam;
      d.classList.add("tamam");
      if (kopyaDurum) kopyaDurum.textContent = `${d.dataset.tamam}: ${d.dataset.kopyala}`;
      setTimeout(() => {
        d.textContent = ilk;
        d.classList.remove("tamam");
      }, 2400);
    });
  });

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
