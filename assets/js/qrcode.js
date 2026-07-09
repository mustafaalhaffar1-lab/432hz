/* =====================================================================
   Minimal, dependency-free QR Code generator (byte mode, ECC level M,
   versions 1–10). Exposes window.QR.svg(text, opts) -> SVG string.
   Implements ISO/IEC 18004: GF(256) Reed–Solomon, masking, format info.
   ===================================================================== */
(function (global) {
  'use strict';

  // ---- GF(256) tables (primitive polynomial 0x11d) ----
  var EXP = new Array(512), LOG = new Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  // ---- Reed–Solomon ----
  function rsGen(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ng = new Array(g.length + 1); for (var k = 0; k < ng.length; k++) ng[k] = 0;
      for (var j = 0; j < g.length; j++) { ng[j + 1] ^= g[j]; ng[j] ^= gmul(g[j], EXP[i]); }
      g = ng;
    }
    return g.reverse(); // high-to-low, monic leading
  }
  function rsEncode(data, n) {
    var gen = rsGen(n), res = data.concat(new Array(n).fill(0));
    for (var i = 0; i < data.length; i++) { var c = res[i]; if (c !== 0) for (var j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], c); }
    return res.slice(data.length);
  }

  // ---- ECC level M block tables, versions 1–10 ----
  var TABLE = {
    1: { ec: 10, g: [[1, 16]] }, 2: { ec: 16, g: [[1, 28]] }, 3: { ec: 26, g: [[1, 44]] },
    4: { ec: 18, g: [[2, 32]] }, 5: { ec: 24, g: [[2, 43]] }, 6: { ec: 16, g: [[4, 27]] },
    7: { ec: 18, g: [[4, 31]] }, 8: { ec: 22, g: [[2, 38], [2, 39]] },
    9: { ec: 22, g: [[3, 36], [2, 37]] }, 10: { ec: 26, g: [[4, 43], [1, 44]] },
  };
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
  function dataCount(v) { return TABLE[v].g.reduce(function (s, x) { return s + x[0] * x[1]; }, 0); }
  function pickVersion(len) { for (var v = 1; v <= 10; v++) { var cc = v <= 9 ? 8 : 16; if (4 + cc + 8 * len <= dataCount(v) * 8) return v; } throw new Error('QR: data too long'); }

  function toBytes(str) { return unescape(encodeURIComponent(str)).split('').map(function (c) { return c.charCodeAt(0); }); }

  function encodeData(bytes, v) {
    var dc = dataCount(v), bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    put(4, 4); put(bytes.length, v <= 9 ? 8 : 16);
    for (var i = 0; i < bytes.length; i++) put(bytes[i], 8);
    var cap = dc * 8; put(0, Math.min(4, cap - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);
    var data = []; for (i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    var pad = [0xEC, 0x11], pi = 0; while (data.length < dc) data.push(pad[pi++ % 2]);
    return data;
  }

  function buildCodewords(v, data) {
    var blocks = [], idx = 0, ec = TABLE[v].ec;
    TABLE[v].g.forEach(function (grp) { for (var b = 0; b < grp[0]; b++) { var d = data.slice(idx, idx + grp[1]); idx += grp[1]; blocks.push({ d: d, e: rsEncode(d, ec) }); } });
    var out = [], maxD = Math.max.apply(null, blocks.map(function (b) { return b.d.length; }));
    for (var i = 0; i < maxD; i++) blocks.forEach(function (b) { if (i < b.d.length) out.push(b.d[i]); });
    for (i = 0; i < ec; i++) blocks.forEach(function (b) { out.push(b.e[i]); });
    return out;
  }

  // ---- matrix ----
  function makeMatrix(v, codewords) {
    var n = v * 4 + 17;
    var m = [], reserved = [];
    for (var i = 0; i < n; i++) { m.push(new Array(n).fill(0)); reserved.push(new Array(n).fill(false)); }
    function set(r, c, val) { m[r][c] = val ? 1 : 0; reserved[r][c] = true; }
    function finder(r, c) { for (var i = -1; i <= 7; i++) for (var j = -1; j <= 7; j++) { var rr = r + i, cc = c + j; if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue; var d = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6)) || (i >= 2 && i <= 4 && j >= 2 && j <= 4); set(rr, cc, d); } }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    for (i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); } // timing
    ALIGN[v].forEach(function (r) { ALIGN[v].forEach(function (c) { if ((r <= 7 && c <= 7) || (r <= 7 && c >= n - 8) || (r >= n - 8 && c <= 7)) return; for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1); }); });
    set(n - 8, 8, 1); // dark module
    // reserve format + version areas
    for (i = 0; i <= 8; i++) { if (i !== 6) { reserved[8][i] = true; reserved[i][8] = true; } }
    for (i = 0; i < 8; i++) { reserved[8][n - 1 - i] = true; reserved[n - 1 - i][8] = true; }
    reserved[8][8] = true;
    if (v >= 7) for (i = 0; i < 6; i++) for (var j = 0; j < 3; j++) { reserved[i][n - 11 + j] = true; reserved[n - 11 + j][i] = true; }

    // place data (zigzag)
    var bits = []; codewords.forEach(function (cw) { for (var b = 7; b >= 0; b--) bits.push((cw >> b) & 1); });
    var bi = 0, up = true;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col = 5;
      for (var t = 0; t < n; t++) {
        var row = up ? n - 1 - t : t;
        for (var c2 = 0; c2 < 2; c2++) {
          var cc = col - c2;
          if (!reserved[row][cc]) { m[row][cc] = bi < bits.length ? bits[bi] : 0; bi++; }
        }
      }
      up = !up;
    }
    return { m: m, reserved: reserved, n: n };
  }

  function applyMask(m, reserved, n, mask) {
    var out = m.map(function (r) { return r.slice(); });
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if (reserved[i][j]) continue;
      var f;
      switch (mask) {
        case 0: f = (i + j) % 2 === 0; break; case 1: f = i % 2 === 0; break;
        case 2: f = j % 3 === 0; break; case 3: f = (i + j) % 3 === 0; break;
        case 4: f = (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; break;
        case 5: f = (i * j) % 2 + (i * j) % 3 === 0; break;
        case 6: f = ((i * j) % 2 + (i * j) % 3) % 2 === 0; break;
        default: f = ((i + j) % 2 + (i * j) % 3) % 2 === 0;
      }
      if (f) out[i][j] ^= 1;
    }
    return out;
  }

  function penalty(m, n) {
    var p = 0, i, j, k;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) { // rule1 rows & cols
      if (j < n - 4) { var run = 1; for (k = 1; k < n - j; k++) { if (m[i][j + k] === m[i][j]) run++; else break; } if (run >= 5) { p += 3 + (run - 5); j += run - 1; } }
    }
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      if (i < n - 4) { var run2 = 1; for (k = 1; k < n - i; k++) { if (m[i + k][j] === m[i][j]) run2++; else break; } if (run2 >= 5) { p += 3 + (run2 - 5); i += run2 - 1; } }
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < n - 1; j++) if (m[i][j] === m[i][j + 1] && m[i][j] === m[i + 1][j] && m[i][j] === m[i + 1][j + 1]) p += 3; // rule2
    var dark = 0; for (i = 0; i < n; i++) for (j = 0; j < n; j++) dark += m[i][j]; // rule4
    var ratio = dark / (n * n) * 100; p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
    return p;
  }

  function fmtBits(mask) {
    var data = mask; // ECC level M = 00 << 3, so format 5-bit == mask
    var d = data << 10, g = 0x537;
    for (var i = 14; i >= 10; i--) if ((d >> i) & 1) d ^= g << (i - 10);
    return ((data << 10) | d) ^ 0x5412;
  }
  function verBits(v) { var d = v << 12, g = 0x1f25; for (var i = 17; i >= 12; i--) if ((d >> i) & 1) d ^= g << (i - 12); return (v << 12) | d; }

  function placeFormat(m, n, mask) {
    var bits = fmtBits(mask);
    for (var i = 0; i < 15; i++) {
      var b = (bits >> i) & 1;
      // around top-left
      if (i < 6) m[i][8] = b; else if (i === 6) m[7][8] = b; else if (i === 7) m[8][8] = b;
      else if (i === 8) m[8][7] = b; else m[8][14 - i] = b;
      // duplicate
      if (i < 8) m[8][n - 1 - i] = b; else m[n - 15 + i][8] = b;
    }
    m[n - 8][8] = 1; // dark module (ensure)
  }
  function placeVersion(m, n, v) {
    if (v < 7) return; var bits = verBits(v);
    for (var i = 0; i < 18; i++) { var b = (bits >> i) & 1; var r = Math.floor(i / 3), c = i % 3; m[r][n - 11 + c] = b; m[n - 11 + c][r] = b; }
  }

  function generate(text) {
    var bytes = toBytes(text), v = pickVersion(bytes.length);
    var data = encodeData(bytes, v), cw = buildCodewords(v, data);
    var built = makeMatrix(v, cw), n = built.n;
    var best = null, bestP = Infinity, bestMask = 0;
    for (var mask = 0; mask < 8; mask++) { var mm = applyMask(built.m, built.reserved, n, mask); var pv = penalty(mm, n); if (pv < bestP) { bestP = pv; best = mm; bestMask = mask; } }
    placeFormat(best, n, bestMask); placeVersion(best, n, v);
    return best;
  }

  function svg(text, opts) {
    opts = opts || {};
    var scale = opts.scale || 6, margin = opts.margin == null ? 4 : opts.margin;
    var dark = opts.dark || '#14181A', light = opts.light || 'transparent';
    var m = generate(text), n = m.length, size = (n + margin * 2) * scale;
    var rects = '';
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (m[i][j]) rects += '<rect x="' + ((j + margin) * scale) + '" y="' + ((i + margin) * scale) + '" width="' + scale + '" height="' + scale + '"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges">' +
      (light !== 'transparent' ? '<rect width="' + size + '" height="' + size + '" fill="' + light + '"/>' : '') +
      '<g fill="' + dark + '">' + rects + '</g></svg>';
  }

  global.QR = { svg: svg, generate: generate };
})(window);
