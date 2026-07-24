/* ============================================
   FLOWERS FOR YOUR LOVED ONES — App Logic
   ============================================ */

// ─── Flower Data ─────────────────────────────
const FLOWERS = [
  { id: 'orchid',      name: 'Orchid',      meaning: 'Luxury and beauty',      sizeClass: 'size-md' },
  { id: 'tulip',       name: 'Tulip',       meaning: 'Perfect love',           sizeClass: 'size-md' },
  { id: 'dahlia',      name: 'Dahlia',      meaning: 'Elegance and dignity',   sizeClass: 'size-sm' },
  { id: 'anemone',     name: 'Anemone',     meaning: 'Anticipation',           sizeClass: 'size-md' },
  { id: 'carnation',   name: 'Carnation',   meaning: 'Fascination and love',   sizeClass: 'size-lg' },
  { id: 'zinnia',      name: 'Zinnia',      meaning: 'Thinking of friends',    sizeClass: 'size-md' },
  { id: 'ranunculus',  name: 'Ranunculus',  meaning: 'Radiant charm',          sizeClass: 'size-md' },
  { id: 'sunflower',   name: 'Sunflower',   meaning: 'Adoration and loyalty',  sizeClass: 'size-lg' },
  { id: 'lily',        name: 'Lily',        meaning: 'Purity and devotion',    sizeClass: 'size-lg' },
  { id: 'daisy',       name: 'Daisy',       meaning: 'Innocence and joy',      sizeClass: 'size-sm' },
  { id: 'peony',       name: 'Peony',       meaning: 'Romance and prosperity', sizeClass: 'size-md' },
  { id: 'rose',        name: 'Rose',        meaning: 'Love and passion',       sizeClass: 'size-md' },
];

// Bouquet display sizes based on flower sizes
const BOUQUET_SIZES = {
  'size-sm': 80,
  'size-md': 120,
  'size-lg': 160,
};

// ─── Asset Paths ─────────────────────────────
function getFlowerImagePath(flowerId, mode) {
  return `./assets/flowers/${mode}/${flowerId}.webp`;
}

function getBushImagePath(bushStyle, mode) {
  return `./assets/bush/${mode || 'color'}/${bushStyle}.png`;
}

// ─── URL Param Helpers ───────────────────────
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getMode() {
  return getUrlParam('mode') || 'color';
}

// ─── Session Storage (Pass data between 5 steps)
function saveBuilderState(data) {
  const current = loadBuilderState() || {};
  sessionStorage.setItem('builder_state', JSON.stringify({ ...current, ...data }));
}

function loadBuilderState() {
  try {
    const data = sessionStorage.getItem('builder_state');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function clearBuilderState() {
  sessionStorage.removeItem('builder_state');
}

// ─── Bouquet Rendering ───────────────────────
function renderBouquetComposition(container, bouquet) {
  const mode = bouquet.mode || 'color';
  const bushStyle = bouquet.bushStyle || 'bush-1';

  // Clear container
  container.innerHTML = '';

  const area = document.createElement('div');
  area.className = 'bouquet-area';

  // Bush background
  const bushBg = document.createElement('img');
  bushBg.src = getBushImagePath(bushStyle, mode);
  bushBg.alt = 'bush background';
  bushBg.className = 'bush-bg';
  if (mode === 'mono') bushBg.classList.add('mono-bush');
  bushBg.loading = 'eager';
  area.appendChild(bushBg);

  // Flowers layer
  const flowersLayer = document.createElement('div');
  flowersLayer.className = 'flowers-layer';

  bouquet.flowers.forEach((flowerId, index) => {
    const flowerData = FLOWERS.find(f => f.id === flowerId);
    if (!flowerData) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'bouquet-flower';

    const img = document.createElement('img');
    img.src = getFlowerImagePath(flowerId, mode);
    img.alt = flowerData.name;

    const count = bouquet.flowers.length;
    const sizeScale = count <= 3 ? 1.0 : Math.max(0.55, 1.0 - (count - 3) * 0.065);

    const baseSize = BOUQUET_SIZES[flowerData.sizeClass] || 120;
    const size = Math.round(baseSize * sizeScale);
    
    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${size}px`;
    wrapper.style.marginLeft = `-${Math.round(size * 0.15)}px`;
    wrapper.style.marginTop = `-${Math.round(size * 0.45)}px`;

    img.width = size;
    img.height = size;

    let layout = bouquet.layout && bouquet.layout[index] ? bouquet.layout[index] : null;
    if (!layout) {
      layout = {
        rotation: ((index * 13) % 40) - 20,
        scale: 1,
        offsetX: 0,
        offsetY: 0
      };
    }
    
    img.style.transform = `translate(${layout.offsetX || 0}px, ${layout.offsetY || 0}px) rotate(${layout.rotation}deg) scale(${layout.scale})`;

    wrapper.appendChild(img);
    flowersLayer.appendChild(wrapper);
  });

  area.appendChild(flowersLayer);

  container.appendChild(area);
}

// ─── Share / Link Helpers ────────────────────
// Flower ID → single char mapping for compact URLs
const FLOWER_CHAR_MAP = {};
const CHAR_FLOWER_MAP = {};
FLOWERS.forEach((f, i) => {
  const ch = String.fromCharCode(97 + i); // a, b, c, ...
  FLOWER_CHAR_MAP[f.id] = ch;
  CHAR_FLOWER_MAP[ch] = f.id;
});

// Binary pack layout into URL-safe base64 (7 bytes per flower)
// Per flower: rotation(int16) + scale%(uint8) + offsetX(int16) + offsetY(int16)
function packLayout(layout) {
  const buf = new ArrayBuffer(layout.length * 7);
  const view = new DataView(buf);
  layout.forEach((l, i) => {
    const off = i * 7;
    view.setInt16(off, Math.max(-32768, Math.min(32767, Math.round(l.rotation || 0))));
    view.setUint8(off + 2, Math.max(0, Math.min(255, Math.round((l.scale || 1) * 100))));
    view.setInt16(off + 3, Math.max(-32768, Math.min(32767, Math.round(l.offsetX || 0))));
    view.setInt16(off + 5, Math.max(-32768, Math.min(32767, Math.round(l.offsetY || 0))));
  });
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unpackLayout(str, count) {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const buf = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(buf);
    const layout = [];
    for (let i = 0; i < count; i++) {
      const off = i * 7;
      if (off + 7 > binary.length) break;
      layout.push({
        rotation: view.getInt16(off),
        scale: view.getUint8(off + 2) / 100,
        offsetX: view.getInt16(off + 3),
        offsetY: view.getInt16(off + 5)
      });
    }
    return layout;
  } catch (e) {
    return null;
  }
}

function encodeBouquetToURL(bouquet) {
  // Format: {mode}{bush}{flowers}.{binary_layout_base64}~{note}
  let s = '';
  s += bouquet.mode === 'mono' ? 'm' : 'c';
  s += (bouquet.bushStyle || 'bush-1').replace('bush-', '');
  s += bouquet.flowers.map(id => FLOWER_CHAR_MAP[id] || '?').join('');

  if (bouquet.layout && bouquet.layout.length > 0) {
    s += '.' + packLayout(bouquet.layout);
  }

  if (bouquet.note && bouquet.note.trim() !== '') {
    s += '~' + encodeURIComponent(bouquet.note);
  }

  return s;
}

function decodeBouquetFromURL(hash) {
  try {
    // Backward compat: detect old base64 JSON format
    if (/^[A-Za-z0-9+/=]+$/.test(hash) && hash.length > 20) {
      try {
        const data = JSON.parse(atob(hash));
        return {
          mode: data.m ? 'mono' : 'color',
          bushStyle: data.b || 'bush-1',
          flowers: data.f || [],
          layout: data.l ? data.l.map(l => ({
            rotation: l[0],
            scale: l[1] / 100,
            offsetX: l[2] || 0,
            offsetY: l[3] || 0
          })) : null,
          note: data.n || ''
        };
      } catch (_) { /* fall through */ }
    }

    // New compact format
    let rest = hash;
    let note = '';
    const tildeIdx = rest.indexOf('~');
    if (tildeIdx !== -1) {
      note = decodeURIComponent(rest.substring(tildeIdx + 1));
      rest = rest.substring(0, tildeIdx);
    }

    const mode = rest[0] === 'm' ? 'mono' : 'color';
    const bushStyle = 'bush-' + rest[1];

    const dotIdx = rest.indexOf('.');
    let flowerStr, layoutStr;
    if (dotIdx !== -1) {
      flowerStr = rest.substring(2, dotIdx);
      layoutStr = rest.substring(dotIdx + 1);
    } else {
      flowerStr = rest.substring(2);
      layoutStr = null;
    }

    const flowers = flowerStr.split('').map(ch => CHAR_FLOWER_MAP[ch]).filter(Boolean);

    let layout = null;
    if (layoutStr) {
      // Try binary format first (URL-safe base64 chars only)
      if (/^[A-Za-z0-9_-]+$/.test(layoutStr)) {
        layout = unpackLayout(layoutStr, flowers.length);
      }
      // Fallback: old text format with semicolons
      if (!layout) {
        layout = layoutStr.split(';').map(part => {
          const nums = part.split(',').map(Number);
          return {
            rotation: nums[0] || 0,
            scale: (nums[1] || 100) / 100,
            offsetX: nums[2] || 0,
            offsetY: nums[3] || 0
          };
        });
      }
    }

    return { mode, bushStyle, flowers, layout, note };
  } catch (e) {
    return null;
  }
}

function getShareURL(bouquet) {
  const encoded = encodeBouquetToURL(bouquet);
  const base = window.location.href.split('?')[0].split('#')[0];
  const viewBase = base.replace(/[^/]*$/, 'p.html');
  return `${viewBase}#${encoded}`;
}

// ─── Toast Notification ──────────────────────
function showToast(message, duration = 2000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Copy to Clipboard ──────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (e2) {
      document.body.removeChild(textarea);
      return false;
    }
  }
}
