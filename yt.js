// YouTube本体のページに回転・拡大・移動・シークのボタンを付け足すブックマークレット本体。
// YouTubeはTrusted Typesを使うので innerHTML は使わず、要素はすべて createElement で作る。
// build.py が行をスペースでつなぐので、文末のセミコロンは省略しないこと。
(() => {
  if (window.__qrp) { window.__qrp.toggle(); return; }

  const S = { deg: 0, s: 1, x: 0, y: 0, on: false, adjust: false };
  try { Object.assign(S, JSON.parse(localStorage.getItem('qrp') || '{}'), { on: false, adjust: false }); } catch (e) {}
  const save = () => { try { localStorage.setItem('qrp', JSON.stringify({ deg: S.deg, s: S.s, x: S.x, y: S.y })); } catch (e) {} };

  const el = (tag, css, text) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text) e.textContent = text;
    return e;
  };

  const Z = 2147483000;
  const SIDE = 150;
  // 回転中は動画を枠いっぱいに広げる。YouTubeがstyle.widthなどを書き戻しても負けないよう!important付きのCSSで指定
  const css = el('style');
  css.textContent = '.qrp-on .html5-video-container{width:100%!important;height:100%!important}' +
    '.qrp-on video.html5-main-video{width:100%!important;height:100%!important;left:0!important;top:0!important;object-fit:contain!important}';
  const back = el('div', `position:fixed;inset:0;background:#000;z-index:${Z};display:none`);
  const pad = el('div', `position:fixed;left:0;top:0;bottom:0;right:${SIDE}px;z-index:${Z + 2};display:none;cursor:move;touch-action:none;outline:3px dashed #ffb300;outline-offset:-3px`);
  // 回転中：右端の列。動画はこの列を除いた範囲に置くので重ならない
  const side = el('div', `position:fixed;top:0;right:0;bottom:0;width:${SIDE}px;z-index:${Z + 3};display:none;grid-template-columns:1fr 1fr;gap:6px;align-content:center;padding:8px;box-sizing:border-box;background:#0d0d0d;border-left:1px solid #222;font:18px system-ui,sans-serif`);
  // 回転していないとき：右下に小さく
  const mini = el('div', `position:fixed;right:12px;bottom:12px;z-index:${Z + 3};display:flex;gap:6px;font:18px system-ui,sans-serif;opacity:.5`);
  mini.onmouseenter = () => mini.style.opacity = 1;
  mini.onmouseleave = () => mini.style.opacity = .5;
  const info = el('div', `position:fixed;left:${(innerWidth - SIDE) / 2}px;top:12px;transform:translateX(-50%);z-index:${Z + 3};background:rgba(0,0,0,.7);color:#fff;padding:6px 14px;border-radius:8px;font:18px system-ui,sans-serif;pointer-events:none;display:none;white-space:nowrap`);
  const toastEl = el('div', `position:fixed;top:50%;transform:translate(-50%,-50%);z-index:${Z + 3};background:rgba(0,0,0,.75);color:#fff;padding:12px 22px;border-radius:12px;font:26px system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .3s`);

  const btn = (parent, label, fn, color, wide) => {
    const b = el('button', `font:inherit;height:48px;padding:0 6px;border:0;border-radius:8px;cursor:pointer;color:#fff;white-space:nowrap;background:${color || '#2a2a2a'}` + (wide ? ';grid-column:span 2' : ''), label);
    b.onclick = e => { e.stopPropagation(); fn(); };
    parent.appendChild(b);
    return b;
  };
  const hr = () => side.appendChild(el('div', 'grid-column:span 2;border-top:1px solid #262626;margin:2px 0'));

  const player = () => document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  const video = () => { const p = player(); return p && p.querySelector('video'); };
  let saved = null;

  let toastT = 0;
  function toast(m) {
    toastEl.textContent = m;
    toastEl.style.left = (S.on ? (innerWidth - SIDE) / 2 : innerWidth / 2) + 'px';
    toastEl.style.transition = 'none';
    toastEl.style.opacity = 1;
    clearTimeout(toastT);
    toastT = setTimeout(() => { toastEl.style.transition = 'opacity .3s'; toastEl.style.opacity = 0; }, 700);
  }

  function layout() {
    const p = player();
    side.style.display = S.on ? 'grid' : 'none';
    mini.style.display = S.on || hidden ? 'none' : 'flex';
    if (!p) return;
    if (!S.on) {
      if (saved !== null) { p.style.cssText = saved; saved = null; p.classList.remove('qrp-on'); kick(); }
      back.style.display = 'none';
      return;
    }
    if (saved === null) saved = p.style.cssText;
    p.classList.add('qrp-on');
    const W = innerWidth - SIDE, H = innerHeight, sd = S.deg % 180 !== 0;
    p.style.cssText = saved + `;position:fixed!important;left:${W / 2}px!important;top:50%!important;margin:0!important;` +
      `width:${sd ? H : W}px!important;height:${sd ? W : H}px!important;max-width:none!important;max-height:none!important;` +
      `z-index:${Z + 1}!important;transform:translate(calc(-50% + ${S.x}px),calc(-50% + ${S.y}px)) rotate(${S.deg}deg) scale(${S.s})!important;`;
    back.style.display = 'block';
    info.style.left = W / 2 + 'px';
    info.textContent = `${Math.round(S.s * 100)}%　ドラッグ＝移動／スティック上下＝拡大縮小`;
    kick();
  }

  // YouTubeにプレーヤー内の配置を合わせ直させる。自分で出したresizeには反応しない
  let internal = false;
  function kick() { internal = true; window.dispatchEvent(new Event('resize')); internal = false; }

  function enterFs() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }
  function rotate() {
    S.deg = (S.deg + 90) % 360; S.on = true; save();
    if (S.deg % 180 !== 0) enterFs();
    layout();
  }
  function zoom(f) { S.s = Math.min(5, Math.max(0.2, S.s * f)); S.on = true; save(); layout(); }
  function reset() { Object.assign(S, { s: 1, x: 0, y: 0 }); save(); layout(); }
  function setAdjust(v) {
    S.adjust = v;
    pad.style.display = info.style.display = v ? 'block' : 'none';
    adjBtn.style.background = v ? '#ffb300' : '#2a2a2a';
    adjBtn.style.color = v ? '#000' : '#fff';
  }
  function off() { S.on = false; setAdjust(false); layout(); }
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else enterFs();
  }
  function seek(sec) {
    const v = video();
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || Infinity) - 1, v.currentTime + sec));
    toast(sec > 0 ? `${sec}秒 ›` : `‹ ${-sec}秒`);
  }
  function playPause() {
    const v = video();
    if (!v) return;
    if (v.paused) { v.play(); toast('▶'); } else { v.pause(); toast('❚❚'); }
  }

  btn(side, '⟳ 90°', rotate, '#c62828', true);
  hr();
  btn(side, '«30', () => seek(-30));
  btn(side, '30»', () => seek(30));
  btn(side, '‹10', () => seek(-10));
  btn(side, '10›', () => seek(10));
  btn(side, '▶❚❚', playPause, '#1565c0', true);
  hr();
  const adjBtn = btn(side, '✥ 調整', () => setAdjust(!S.adjust), null, true);
  btn(side, '－', () => zoom(1 / 1.15));
  btn(side, '＋', () => zoom(1.15));
  btn(side, '戻す', reset);
  btn(side, '全画面', fullscreen);
  hr();
  btn(side, '回転やめる', off, null, true);

  let hidden = false;
  btn(mini, '⟳ 90°', rotate, '#c62828');
  btn(mini, '✕', () => { hidden = true; layout(); });

  let drag = null;
  pad.addEventListener('pointerdown', e => { drag = { px: e.clientX, py: e.clientY, x: S.x, y: S.y }; pad.setPointerCapture(e.pointerId); });
  pad.addEventListener('pointermove', e => { if (!drag) return; S.x = drag.x + e.clientX - drag.px; S.y = drag.y + e.clientY - drag.py; layout(); });
  const end = () => { if (drag) { drag = null; save(); } };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  pad.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  pad.addEventListener('dblclick', reset);

  document.documentElement.append(css, back, pad, info, toastEl, side, mini);
  addEventListener('resize', () => { if (S.on && !internal) layout(); });
  document.addEventListener('fullscreenchange', layout);
  // 別の動画に移ったら元に戻す（YouTubeは画面遷移してもページを読み直さない）
  document.addEventListener('yt-navigate-start', off);

  window.__qrp = { toggle() { if (S.on) { off(); } else { hidden = !hidden; layout(); } } };
  if (S.deg) { S.on = true; }
  layout();
})();
