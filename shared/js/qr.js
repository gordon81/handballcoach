// QR-Code erzeugen (Byte-Modus, Fehlerkorrektur L oder M, Version 1–40), ohne Browser und ohne Bibliothek,
// damit das Koppeln der Fernbedienung (C6, Stufe 2) auch offline in der Halle geht. Nach dem Standard ISO 18004,
// Aufbau wie der Generator von Project Nayuki (MIT). Unit-getestet (Lesen mit jsQR in tests/unit.mjs).
//   qrMatrix(text, 'L') → Array von Zeilen mit true = schwarz.   drawQr(canvas, text) zeichnet mit Ruhezone.

const ECC = {L:[-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
             M:[-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28]};
const BLOCKS = {L:[-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
                M:[-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49]};
const FORMAT = {L:1, M:0};
const bit = (x, i) => ((x >>> i) & 1) !== 0;

function rawModules(v){
  let r = (16*v + 128)*v + 64;
  if(v >= 2){ const n = Math.floor(v/7) + 2; r -= (25*n - 10)*n - 55; if(v >= 7) r -= 36; }
  return r;
}
const dataCodewords = (v, e) => Math.floor(rawModules(v)/8) - ECC[e][v]*BLOCKS[e][v];

// Reed-Solomon über GF(256), Polynom 0x11D.
function mul(x, y){ let z = 0; for(let i = 7; i >= 0; i--){ z = (z << 1) ^ ((z >>> 7)*0x11D); z ^= ((y >>> i) & 1)*x; } return z; }
function rsDivisor(deg){
  const r = new Array(deg).fill(0); r[deg-1] = 1; let root = 1;
  for(let i = 0; i < deg; i++){
    for(let j = 0; j < deg; j++){ r[j] = mul(r[j], root); if(j + 1 < deg) r[j] ^= r[j+1]; }
    root = mul(root, 2);
  }
  return r;
}
function rsRemainder(data, div){
  const r = div.map(() => 0);
  for(const b of data){ const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => r[i] ^= mul(c, f)); }
  return r;
}

export function qrMatrix(text, ecl = 'L'){
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1;
  for(; v <= 40; v++) if(4 + (v < 10 ? 8 : 16) + bytes.length*8 <= dataCodewords(v, ecl)*8) break;
  if(v > 40) throw new Error('Text zu lang für einen QR-Code');
  // Datenbits: Modus Byte (0100), Länge, Bytes, Ende, auffüllen.
  const bits = [], put = (val, n) => { for(let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  const cap = dataCodewords(v, ecl)*8;
  put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
  for(let p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) put(p, 8);
  const data = []; for(let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  // Blöcke mit Fehlerkorrektur, verschränkt.
  const nb = BLOCKS[ecl][v], el = ECC[ecl][v], raw = Math.floor(rawModules(v)/8);
  const nShort = nb - raw % nb, shortLen = Math.floor(raw/nb), div = rsDivisor(el), blocks = [];
  for(let i = 0, k = 0; i < nb; i++){
    const d = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += d.length;
    const ecc = rsRemainder(d, div); if(i < nShort) d.push(0); blocks.push(d.concat(ecc));
  }
  const code = [];
  for(let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if(i !== shortLen - el || j >= nShort) code.push(b[i]); });

  const size = v*4 + 17;
  const mod = Array.from({length:size}, () => new Array(size).fill(false));
  const fn = Array.from({length:size}, () => new Array(size).fill(false));
  const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
  for(let i = 0; i < size; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for(const [cx, cy] of [[3, 3], [size-4, 3], [3, size-4]])
    for(let dy = -4; dy <= 4; dy++) for(let dx = -4; dx <= 4; dx++){
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if(x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  const al = [];
  if(v > 1){
    const n = Math.floor(v/7) + 2, step = Math.floor((v*8 + n*3 + 5)/(n*4 - 4))*2;
    al.push(6); for(let p = size - 7; al.length < n; p -= step) al.splice(1, 0, p);
  }
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if((i === 0 && j === 0) || (i === 0 && j === al.length-1) || (i === al.length-1 && j === 0)) return;
    for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const format = mask => {
    const d = FORMAT[ecl] << 3 | mask; let r = d;
    for(let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9)*0x537);
    const b = (d << 10 | r) ^ 0x5412;
    for(let i = 0; i <= 5; i++) set(8, i, bit(b, i));
    set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
    for(let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
    for(let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
    for(let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
    set(8, size - 8, true);
  };
  format(0);
  if(v >= 7){
    let r = v; for(let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11)*0x1F25);
    const b = v << 12 | r;
    for(let i = 0; i < 18; i++){ const a = size - 11 + i % 3, c = Math.floor(i/3); set(a, c, bit(b, i)); set(c, a, bit(b, i)); }
  }
  // Datenmodule im Zickzack von unten rechts.
  for(let right = size - 1, i = 0; right >= 1; right -= 2){
    if(right === 6) right = 5;
    for(let vert = 0; vert < size; vert++) for(let j = 0; j < 2; j++){
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if(!fn[y][x] && i < code.length*8){ mod[y][x] = bit(code[i >>> 3], 7 - (i & 7)); i++; }
    }
  }
  // Maske mit der kleinsten Strafe wählen.
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x/3) + Math.floor(y/2)) % 2 === 0, (x, y) => x*y % 2 + x*y % 3 === 0,
    (x, y) => (x*y % 2 + x*y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x*y % 3) % 2 === 0];
  const apply = m => { for(let y = 0; y < size; y++) for(let x = 0; x < size; x++) if(!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
  let best = 0, bestP = Infinity;
  for(let m = 0; m < 8; m++){
    apply(m); format(m);
    const p = penalty(mod); if(p < bestP){ bestP = p; best = m; }
    apply(m);
  }
  apply(best); format(best);
  return mod;
}

// Strafpunkte (vereinfacht: lange Reihen, 2×2-Blöcke, Finder-ähnliche Muster, Schwarz-Anteil).
function penalty(m){
  const n = m.length; let p = 0, dark = 0;
  const line = get => {
    let run = 1, s = '';
    for(let i = 0; i < n; i++){
      const c = get(i); s += c ? '1' : '0';
      if(i > 0 && c === get(i-1)){ run++; if(run === 5) p += 3; else if(run > 5) p++; } else run = 1;
    }
    for(const pat of ['00001011101', '10111010000']) for(let k = s.indexOf(pat); k >= 0; k = s.indexOf(pat, k + 1)) p += 40;
  };
  for(let y = 0; y < n; y++){ line(x => m[y][x]); line(x => m[x][y]); }
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){
    if(m[y][x]) dark++;
    if(x < n-1 && y < n-1 && m[y][x] === m[y][x+1] && m[y][x] === m[y+1][x] && m[y][x] === m[y+1][x+1]) p += 3;
  }
  return p + Math.floor(Math.abs(dark*20 - n*n*10)/(n*n))*10;
}

// Auf ein Canvas zeichnen (4 Module Ruhezone), Kantenlänge px.
export function drawQr(canvas, text, px = 320, ecl = 'L'){
  const m = qrMatrix(text, ecl), n = m.length + 8, s = Math.max(1, Math.floor(px/n));
  canvas.width = canvas.height = n*s;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, n*s, n*s); g.fillStyle = '#000';
  m.forEach((row, y) => row.forEach((d, x) => { if(d) g.fillRect((x + 4)*s, (y + 4)*s, s, s); }));
  return m.length;
}
