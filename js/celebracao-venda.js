/*
 * celebracao-venda.js — som + efeito visual quando alguém marca uma venda no Pingolead.
 * Versão sem framework (HTML puro, Flask/Jinja, etc.). Mesmo comportamento do CelebracaoVenda.tsx.
 *
 * Uso: inclua no fim do <body> de TODAS as páginas do sistema:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="/static/celebracao-venda.js"
 *           data-url="https://vvtympzatclvjaqucebr.supabase.co"
 *           data-key="CHAVE_ANON"
 *           data-sistema="Pós-venda"></script>
 *
 * Se a página já tem um client Supabase em window.supabaseClient, ele é reaproveitado e o
 * data-url/data-key podem ser omitidos. Botão 🔇 no cartão silencia neste navegador.
 */
(function () {
  if (window.__celebracaoVendaAtiva) return;
  window.__celebracaoVendaAtiva = true;

  var script = document.currentScript || (function () { var s = document.getElementsByTagName("script"); return s[s.length - 1]; })();
  var URL = script.getAttribute("data-url");
  var KEY = script.getAttribute("data-key");
  var SISTEMA = script.getAttribute("data-sistema") || "";
  var DURACAO = parseInt(script.getAttribute("data-duracao") || "10", 10) * 1000;
  var SOM_URL = script.getAttribute("data-som") || "";       // mp3/ogg gravado; sem isso usa o som sintetizado
  var VOLUME = parseFloat(script.getAttribute("data-volume") || "1");
  var REPETICOES = parseInt(script.getAttribute("data-repeticoes") || "2", 10); // quantas vezes o som toca em sequência
  var MUTE_KEY = "celebracao_venda_mudo", CLAIM = "celebracao_venda_claim_";

  // ---------- Som ----------
  var audioCtx = null;
  function obterCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function (e) {
    window.addEventListener(e, function () { var c = obterCtx(); if (c && c.state === "suspended") c.resume().catch(function () {}); }, { passive: true });
  });
  function fanfarra() {
    const ctx = obterCtx();
    if (!ctx) return;
    const go = () => {
      const t0 = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 1;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 6;
      master.connect(comp).connect(ctx.destination);

      const noiseBuf = (() => {
        const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return b;
      })();
      const env = (g, t, a, dur, vol) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      };
      // Tom simples
      const tom = (tipo, f, t, dur, vol, detune = 0, slideTo) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = tipo; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        env(g, t, 0.015, dur, vol);
        o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
      };
      // "Metal" (naipe): 3 dentes-de-serra desafinados + filtro que abre no ataque
      const metal = (f, t, dur, vol) => {
        const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = 1.2;
        fl.frequency.setValueAtTime(600, t); fl.frequency.exponentialRampToValueAtTime(4500, t + 0.06);
        fl.frequency.exponentialRampToValueAtTime(1500, t + dur);
        const g = ctx.createGain(); env(g, t, 0.03, dur, vol);
        fl.connect(g).connect(master);
        [-9, 0, 9].forEach((d) => {
          const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d;
          o.connect(fl); o.start(t); o.stop(t + dur + 0.05);
        });
      };
      // Ruído filtrado (bateria / torcida)
      const ruido = (t, dur, vol, tipo, fq, q, a = 0.005, sweepTo) => {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.Q.value = q; fl.frequency.setValueAtTime(fq, t);
        if (sweepTo) fl.frequency.linearRampToValueAtTime(sweepTo, t + dur);
        const g = ctx.createGain(); env(g, t, a, dur, vol);
        s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
      };
      const bumbo = (t) => { tom("sine", 160, t, 0.35, 0.9, 0, 45); ruido(t, 0.05, 0.25, "lowpass", 900, 0.7); };
      const caixa = (t) => { ruido(t, 0.16, 0.5, "highpass", 1800, 0.6); tom("triangle", 190, t, 0.1, 0.35); };

      // 1) Rufar + subida de tensão
      for (let i = 0; i < 8; i++) caixa(t0 + i * 0.055);
      bumbo(t0); bumbo(t0 + 0.22);
      tom("sawtooth", 180, t0, 0.5, 0.12, 0, 1400);
      ruido(t0, 0.5, 0.35, "bandpass", 400, 1.5, 0.05, 5000);

      // 2) Cha-ching da caixa registradora
      [[2637, 0.5], [3520, 0.6], [4186, 0.66]].forEach(([f, dt]) => tom("sine", f, t0 + dt, 0.5, 0.3));

      // 3) Fanfarra de metais: TA - TA - TA - TAAAA (G4 G4 G4 → C5) + acorde final
      const F = 0.72;
      [[392, 0], [392, 0.16], [392, 0.32]].forEach(([f, dt]) => { metal(f, t0 + F + dt, 0.15, 0.5); bumbo(t0 + F + dt); });
      const acorde = t0 + F + 0.5;
      bumbo(acorde); caixa(acorde);
      ruido(acorde, 1.6, 0.35, "bandpass", 8000, 0.8, 0.01); // prato
      [[523.25, 0.55], [659.25, 0.42], [783.99, 0.42], [1046.5, 0.3], [261.63, 0.5], [130.81, 0.45]]
        .forEach(([f, v]) => metal(f, acorde, 1.9, v));
      // arpejo rápido por cima
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => tom("triangle", f, acorde + 0.05 + i * 0.045, 0.35, 0.22));

      // 4) Torcida vibrando + apitos
      const T = acorde + 0.05;
      ruido(T, 2.4, 0.55, "bandpass", 700, 0.5, 0.25, 1400);
      ruido(T + 0.1, 2.2, 0.35, "bandpass", 1800, 0.7, 0.3, 2600);
      for (let i = 0; i < 6; i++) {
        const dt = T + 0.15 + Math.random() * 1.4;
        tom("sine", 1400 + Math.random() * 600, dt, 0.25, 0.09, 0, 2600 + Math.random() * 800);
      }
      // 5) Brilhos aleatórios durante o acorde
      for (let i = 0; i < 14; i++) {
        const dt = acorde + 0.2 + Math.random() * 1.5;
        tom("sine", 2000 + Math.random() * 3000, dt, 0.18, 0.07);
      }
      // 6) Fecho: bumbo + prato
      bumbo(acorde + 1.9); ruido(acorde + 1.9, 1.2, 0.3, "highpass", 6000, 0.7, 0.01);
    };
    if (ctx.state === "suspended") ctx.resume().then(go).catch(() => {});
    else go();
  }

  function tocarSom(url) {
    url = url || SOM_URL;
    if (!url) return fanfarra();
    try { var a = new Audio(url); a.volume = Math.max(0, Math.min(1, VOLUME)); var restantes = Math.max(1, REPETICOES) - 1;
      a.addEventListener("ended", function () { if (restantes-- > 0) { a.currentTime = 0; a.play()["catch"](function () {}); } });
      a.play()["catch"](function () { fanfarra(); }); } catch (e) { fanfarra(); }
  }

  // ---------- Confete ----------
  function confete(canvas, ms) {
    var c = canvas.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
    resize(); addEventListener("resize", resize);
    var cores = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a855f7", "#facc15", "#ffffff"], ps = [];
    function spawn(n, x, dir) {
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + dir * Math.random() * 0.6 + (Math.random() - 0.5) * 0.5, v = (9 + Math.random() * 13) * dpr;
        ps.push({ x: x, y: canvas.height * 0.9, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (4 + Math.random() * 5) * dpr,
          cor: cores[Math.random() * cores.length | 0], ang: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3, forma: Math.random() < 0.5 });
      }
    }
    spawn(140, canvas.width * 0.08, 1); spawn(140, canvas.width * 0.92, -1);
    var t1 = performance.now() + ms, raf;
    function tick() {
      c.clearRect(0, 0, canvas.width, canvas.height);
      var now = performance.now();
      if (now < t1 - 2500 && Math.random() < 0.35) spawn(6, Math.random() * canvas.width, 0);
      ps.forEach(function (p) {
        p.vy += 0.32 * dpr; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.ang += p.va;
        c.save(); c.translate(p.x, p.y); c.rotate(p.ang); c.fillStyle = p.cor;
        if (p.forma) c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { c.beginPath(); c.arc(0, 0, p.r / 2, 0, Math.PI * 2); c.fill(); }
        c.restore();
      });
      for (var i = ps.length - 1; i >= 0; i--) if (ps[i].y > canvas.height + 40) ps.splice(i, 1);
      if (now < t1 || ps.length) raf = requestAnimationFrame(tick); else c.clearRect(0, 0, canvas.width, canvas.height);
    }
    raf = requestAnimationFrame(tick);
    return function () { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }

  // ---------- UI ----------
  var css = "\
.cv-ov{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);backdrop-filter:blur(2px);cursor:pointer;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}\
.cv-ov canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}\
.cv-card{position:relative;min-width:320px;max-width:min(92vw,520px);padding:28px 32px 18px;border-radius:20px;text-align:center;color:#fff;cursor:default;background:linear-gradient(160deg,#0f172a 0%,#1e293b 60%,#0f172a 100%);border:1px solid rgba(255,255,255,.12);animation:cvPop .55s cubic-bezier(.2,.9,.3,1.2) both,cvGlow 1.6s ease-in-out .5s infinite}\
.cv-emoji{font-size:56px;line-height:1;margin-bottom:6px;animation:cvBounce 1.1s ease-in-out infinite}\
.cv-tit{font-size:13px;letter-spacing:4px;font-weight:800;color:#fbbf24;margin-bottom:10px}\
.cv-emp{font-size:26px;font-weight:800;line-height:1.15}.cv-emp span{font-weight:600;color:#cbd5e1}\
.cv-val{font-size:34px;font-weight:900;margin-top:8px;color:#34d399;letter-spacing:-1px}\
.cv-quem{margin-top:10px;font-size:16px;color:#e2e8f0}\
.cv-rod{margin-top:18px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase}\
.cv-rod button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#e2e8f0;border-radius:8px;padding:3px 8px;cursor:pointer;font-size:13px;line-height:1.2}\
@keyframes cvPop{0%{transform:translateY(40px) scale(.8);opacity:0}60%{transform:translateY(-6px) scale(1.04);opacity:1}100%{transform:none;opacity:1}}\
@keyframes cvBounce{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-10px) rotate(8deg)}}\
@keyframes cvGlow{0%,100%{box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 0 0 rgba(245,158,11,.6)}50%{box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 0 14px rgba(245,158,11,0)}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function brl(v) { var n = typeof v === "string" ? parseFloat(v) : v; if (n == null || isNaN(n)) return ""; return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }
  function mudo() { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; } }
  function reivindicar(id) {
    try { var k = CLAIM + id; if (localStorage.getItem(k)) return false; localStorage.setItem(k, String(Date.now()));
      for (var i = localStorage.length - 1; i >= 0; i--) { var key = localStorage.key(i); if (key && key.indexOf(CLAIM) === 0 && key !== k) { var t = Number(localStorage.getItem(key)); if (!t || Date.now() - t > 3600000) localStorage.removeItem(key); } }
      return true; } catch (e) { return true; }
  }

  var fila = [], mostrando = false;
  function proxima() {
    if (mostrando) return;
    var v = fila.shift(); if (!v) return;
    mostrando = true;
    var quem = v.venda_externa && v.corretor_nome ? v.corretor_nome + (v.consultor_nome ? " · via " + v.consultor_nome : "") : (v.consultor_nome || "");
    var ov = document.createElement("div"); ov.className = "cv-ov"; ov.setAttribute("role", "status");
    ov.innerHTML = '<canvas></canvas><div class="cv-card"><div class="cv-emoji">🎉</div><div class="cv-tit">VENDA REALIZADA!</div>' +
      '<div class="cv-emp">' + esc(v.empreendimento || "Empreendimento") + (v.numero_lote ? '<span> · Lote ' + esc(v.numero_lote) + '</span>' : '') + '</div>' +
      (brl(v.preco_lote) ? '<div class="cv-val">' + brl(v.preco_lote) + '</div>' : '') +
      (quem ? '<div class="cv-quem">' + esc(quem) + '</div>' : '') +
      '<div class="cv-rod"><span>' + esc(SISTEMA ? "Pingolead → " + SISTEMA : "Pingolead") + '</span><button type="button" class="cv-mute">' + (mudo() ? "🔇" : "🔊") + '</button><button type="button" class="cv-x">✕</button></div></div>';
    document.body.appendChild(ov);
    var parar = confete(ov.querySelector("canvas"), DURACAO - 1500);
    var timer = setTimeout(fechar, DURACAO);
    function fechar() { clearTimeout(timer); parar(); ov.remove(); mostrando = false; setTimeout(proxima, 400); }
    ov.addEventListener("click", fechar);
    ov.querySelector(".cv-card").addEventListener("click", function (e) { e.stopPropagation(); });
    ov.querySelector(".cv-x").addEventListener("click", fechar);
    ov.querySelector(".cv-mute").addEventListener("click", function () { var m = !mudo(); try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch (e) {} this.textContent = m ? "🔇" : "🔊"; });
    if (!mudo() && reivindicar(v.id)) tocarSom(v.som_url);
  }

  // ---------- Realtime ----------
  function iniciar() {
    var client = window.supabaseClient;
    if (!client) {
      if (!window.supabase || !window.supabase.createClient) { console.warn("[celebracao-venda] supabase-js não carregado"); return; }
      if (!URL || !KEY) { console.warn("[celebracao-venda] faltam data-url / data-key"); return; }
      client = window.supabase.createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    var vistos = {}; // dedupe por id (não depende do relógio do PC)
    client.channel("vendas-celebracao-" + Math.random().toString(36).slice(2, 8))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendas_celebracao" }, function (p) {
        var v = p["new"];
        if (vistos[v.id]) return; vistos[v.id] = true;
        fila.push(v); proxima();
      })
      .subscribe();
  }
  // p/ testar sem venda real: window.celebrarVendaTeste() — opcionalmente com a URL de um som: celebrarVendaTeste("sons/x.mp3")
  window.celebrarVendaTeste = function (somUrl) {
    fila.push({ id: Date.now(), som_url: somUrl, empreendimento: "Algarve", numero_lote: "49", preco_lote: 105287.52, consultor_nome: "Consultor Teste", venda_externa: false, created_at: new Date().toISOString() });
    proxima();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
