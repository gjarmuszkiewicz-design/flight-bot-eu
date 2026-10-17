/**
 * Silnik rysujący instawizytówkę na canvasie.
 *
 * Wszystkie wymiary są w milimetrach – ten sam kod rysuje podgląd w przeglądarce
 * i plik do druku (inna jest tylko skala px/mm), więc podgląd = druk 1:1.
 *
 * Układ współrzędnych: (0,0) to lewy górny róg linii cięcia (netto).
 * Tło i elementy „na spad” wychodzą na ujemne współrzędne / poza wymiar netto o wielkość spadu.
 */
(function () {
	'use strict';

	var SERIF = '"Playfair Display", Georgia, serif';
	var SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
	var IG_GRADIENT = ['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5'];

	var THEMES = {
		marmur: { label: 'Czarny marmur ze złotem', bg: ['#1b1715', '#0c0a09'], veins: '#d4b07a', text: '#f5eee4', sub: '#e9dcc8', icon: '#e9dcc8' },
		czern: { label: 'Czerń minimalistyczna', bg: ['#161616', '#050505'], veins: null, text: '#ffffff', sub: '#d8d8d8', icon: '#d8d8d8' },
		jasny: { label: 'Jasny marmur', bg: ['#fbf8f4', '#ece5dc'], veins: '#9d8f80', text: '#2b2420', sub: '#5b4f45', icon: '#5b4f45' },
		puder: { label: 'Pudrowy róż', bg: ['#f7e3e1', '#e9c4c3'], veins: '#ffffff', text: '#3d2b2b', sub: '#5e4545', icon: '#5e4545' }
	};

	// Kolory tekstu na tłach z biblioteki.
	var TEXT_ON_DARK = { bg: ['#000000', '#000000'], text: '#f7f1e8', sub: '#ead9bd', icon: '#ead9bd' };
	var TEXT_ON_LIGHT = { bg: ['#ffffff', '#ffffff'], text: '#231d19', sub: '#4d4239', icon: '#4d4239' };

	// ---------------------------------------------------------------- pomocnicze

	function mulberry32(seed) {
		return function () {
			seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
			var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function hashString(s) {
		var h = 2166136261;
		for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
		return h >>> 0;
	}

	function font(ctx, weight, size, family) {
		ctx.font = weight + ' ' + size + 'px ' + family;
	}

	function spacing(ctx, mm) {
		if ('letterSpacing' in ctx) { ctx.letterSpacing = mm + 'px'; }
	}

	/** Zmniejsza czcionkę, aż tekst zmieści się w maxW. Zwraca użyty rozmiar. */
	function fitFont(ctx, text, maxW, weight, size, family, minSize) {
		var s = size;
		font(ctx, weight, s, family);
		while (ctx.measureText(text).width > maxW && s > (minSize || size * 0.5)) {
			s -= size * 0.03;
			font(ctx, weight, s, family);
		}
		return s;
	}

	function ellipsize(ctx, text, maxW) {
		if (ctx.measureText(text).width <= maxW) { return text; }
		var t = text;
		while (t.length > 1 && ctx.measureText(t + '…').width > maxW) { t = t.slice(0, -1); }
		return t.trim() + '…';
	}

	/** Łamie tekst na linie (z zachowaniem \n), ucina na maxLines z wielokropkiem. */
	function wrapLines(ctx, text, maxW, maxLines) {
		var out = [];
		var paragraphs = String(text || '').split(/\r?\n/);
		for (var p = 0; p < paragraphs.length; p++) {
			var words = paragraphs[p].split(/\s+/).filter(Boolean);
			var line = '';
			for (var w = 0; w < words.length; w++) {
				var test = line ? line + ' ' + words[w] : words[w];
				if (ctx.measureText(test).width > maxW && line) { out.push(line); line = words[w]; } else { line = test; }
			}
			out.push(line);
		}
		if (out.length > maxLines) {
			out = out.slice(0, maxLines);
			out[maxLines - 1] = ellipsize(ctx, out[maxLines - 1] + '…', maxW);
		}
		return out;
	}

	function roundRect(ctx, x, y, w, h, r) {
		r = Math.min(r, w / 2, h / 2);
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	function drawCover(ctx, img, x, y, w, h) {
		var ir = img.naturalWidth / img.naturalHeight, r = w / h, sw, sh, sx, sy;
		if (ir > r) { sh = img.naturalHeight; sw = sh * r; sx = (img.naturalWidth - sw) / 2; sy = 0; }
		else { sw = img.naturalWidth; sh = sw / r; sx = 0; sy = (img.naturalHeight - sh) / 2; }
		ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
	}

	function placeholder(ctx, x, y, w, h, i, seed) {
		var hue = (seed * 37 + i * 47) % 360;
		var g = ctx.createLinearGradient(x, y, x + w, y + h);
		g.addColorStop(0, 'hsl(' + hue + ',35%,82%)');
		g.addColorStop(1, 'hsl(' + ((hue + 40) % 360) + ',40%,68%)');
		ctx.fillStyle = g;
		ctx.fillRect(x, y, w, h);
	}

	function igGradient(ctx, cx, cy, r) {
		var g = ctx.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
		IG_GRADIENT.forEach(function (c, i) { g.addColorStop(i / (IG_GRADIENT.length - 1), c); });
		return g;
	}

	/** Okrągłe zdjęcie z ramką w gradiencie Instagrama. */
	function avatar(ctx, img, cx, cy, r, ring, gap, gapColor, initials) {
		ctx.save();
		ctx.beginPath(); ctx.arc(cx, cy, r + gap + ring, 0, Math.PI * 2);
		ctx.fillStyle = igGradient(ctx, cx, cy, r + gap + ring); ctx.fill();
		ctx.beginPath(); ctx.arc(cx, cy, r + gap, 0, Math.PI * 2);
		ctx.fillStyle = gapColor; ctx.fill();
		ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
		if (img) {
			drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2);
		} else {
			ctx.fillStyle = '#d9d2cc'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
			ctx.fillStyle = '#ffffff'; font(ctx, 600, r * 0.8, SANS);
			ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.fillText(initials || '', cx, cy);
		}
		ctx.restore();
	}

	function initialsOf(name) {
		return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (s) { return s[0].toUpperCase(); }).join('');
	}

	/** Liczby w stylu polskiego Instagrama: 3058, 12,5 tys., 1,2 mln. */
	function formatCount(n) {
		n = Number(n) || 0;
		if (n >= 1e6) { return (Math.floor(n / 1e5) / 10).toString().replace('.', ',') + ' mln'; }
		if (n >= 1e4) { return (Math.floor(n / 100) / 10).toString().replace('.', ',') + ' tys.'; }
		return String(n);
	}

	// ---------------------------------------------------------------- ikony (wektorowe, w mm)

	function iconInstagram(ctx, cx, cy, s, color, lw) {
		ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
		roundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.28); ctx.stroke();
		ctx.beginPath(); ctx.arc(cx, cy, s * 0.22, 0, Math.PI * 2); ctx.stroke();
		ctx.beginPath(); ctx.arc(cx + s * 0.27, cy - s * 0.27, s * 0.06, 0, Math.PI * 2); ctx.fill();
		ctx.restore();
	}

	function iconPhone(ctx, cx, cy, r, color) {
		ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = r * 0.12;
		ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
		// Słuchawka: łuk z zaokrąglonymi końcami.
		var hx = cx + r * 0.12, hy = cy - r * 0.12, hr = r * 0.42;
		ctx.lineWidth = r * 0.26; ctx.lineCap = 'round';
		ctx.beginPath(); ctx.arc(hx, hy, hr, Math.PI * 0.55, Math.PI * 0.95); ctx.stroke();
		[Math.PI * 0.5, Math.PI].forEach(function (a) {
			ctx.beginPath(); ctx.arc(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr, r * 0.19, 0, Math.PI * 2); ctx.fill();
		});
		ctx.restore();
	}

	function iconMail(ctx, cx, cy, r, color) {
		ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = r * 0.12;
		ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
		var w = r * 1.05, h = r * 0.72;
		ctx.lineWidth = r * 0.1;
		ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
		ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h / 2); ctx.lineTo(cx, cy + h * 0.1); ctx.lineTo(cx + w / 2, cy - h / 2); ctx.stroke();
		ctx.restore();
	}

	function iconGrid(ctx, cx, cy, s, color, lw) {
		ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw;
		ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
		ctx.beginPath();
		for (var i = 1; i < 3; i++) {
			ctx.moveTo(cx - s / 2 + s * i / 3, cy - s / 2); ctx.lineTo(cx - s / 2 + s * i / 3, cy + s / 2);
			ctx.moveTo(cx - s / 2, cy - s / 2 + s * i / 3); ctx.lineTo(cx + s / 2, cy - s / 2 + s * i / 3);
		}
		ctx.stroke(); ctx.restore();
	}

	function iconReels(ctx, cx, cy, s, color, lw) {
		ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
		roundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.22); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(cx - s / 2, cy - s * 0.2); ctx.lineTo(cx + s / 2, cy - s * 0.2); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(cx - s * 0.12, cy - s * 0.02); ctx.lineTo(cx + s * 0.2, cy + s * 0.15); ctx.lineTo(cx - s * 0.12, cy + s * 0.32); ctx.closePath(); ctx.fill();
		ctx.restore();
	}

	function iconTagged(ctx, cx, cy, s, color, lw) {
		ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw;
		roundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.18); ctx.stroke();
		ctx.beginPath(); ctx.arc(cx, cy - s * 0.08, s * 0.16, 0, Math.PI * 2); ctx.stroke();
		ctx.beginPath(); ctx.arc(cx, cy + s * 0.5, s * 0.3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
		ctx.restore();
	}

	function iconCarousel(ctx, x, y, s) {
		ctx.save(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.1;
		ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = s * 0.3;
		roundRect(ctx, x + s * 0.25, y, s * 0.75, s * 0.75, s * 0.1); ctx.fill();
		roundRect(ctx, x, y + s * 0.25, s * 0.75, s * 0.75, s * 0.1); ctx.stroke();
		ctx.restore();
	}

	function iconPlay(ctx, x, y, s) {
		ctx.save(); ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = s * 0.3;
		ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s / 2); ctx.lineTo(x, y + s); ctx.closePath(); ctx.fill();
		ctx.restore();
	}

	function iconMenu(ctx, x, y, s, color, lw) {
		ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
		ctx.beginPath();
		for (var i = 0; i < 3; i++) { ctx.moveTo(x, y + i * s * 0.4); ctx.lineTo(x + s, y + i * s * 0.4); }
		ctx.stroke(); ctx.restore();
	}

	function iconPlus(ctx, cx, cy, s, color, lw) {
		ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw;
		roundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.25); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(cx - s * 0.22, cy); ctx.lineTo(cx + s * 0.22, cy); ctx.moveTo(cx, cy - s * 0.22); ctx.lineTo(cx, cy + s * 0.22); ctx.stroke();
		ctx.restore();
	}

	function verifiedBadge(ctx, cx, cy, r) {
		ctx.save(); ctx.fillStyle = '#0095f6';
		ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
		ctx.beginPath(); ctx.moveTo(cx - r * 0.45, cy); ctx.lineTo(cx - r * 0.1, cy + r * 0.35); ctx.lineTo(cx + r * 0.48, cy - r * 0.35); ctx.stroke();
		ctx.restore();
	}

	// ---------------------------------------------------------------- tło przodu

	function background(ctx, theme, x, y, w, h, seed) {
		var g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
		g.addColorStop(0, theme.bg[0]); g.addColorStop(1, theme.bg[1]);
		ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
		if (!theme.veins) { return; }

		var rnd = mulberry32(seed);
		// Miękkie plamy, żeby tło nie było płaskie.
		for (var i = 0; i < 6; i++) {
			var px = x + rnd() * w, py = y + rnd() * h, pr = w * (0.3 + rnd() * 0.5);
			var rg = ctx.createRadialGradient(px, py, 0, px, py, pr);
			rg.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)');
			rg.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
		}
		// Żyłki marmuru: losowe krzywe z poświatą.
		ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
		for (var v = 0; v < 14; v++) {
			var sx = x + rnd() * w, sy = y + rnd() * h, ang = rnd() * Math.PI * 2;
			var pts = [[sx, sy]];
			var len = 8 + rnd() * 40;
			for (var s = 0; s < len; s += 1.2) {
				ang += (rnd() - 0.5) * 0.7;
				sx += Math.cos(ang) * 1.2; sy += Math.sin(ang) * 1.2;
				pts.push([sx, sy]);
			}
			var width = 0.04 + Math.pow(rnd(), 3) * 0.45;
			for (var pass = 0; pass < 2; pass++) {
				ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
				for (var k = 1; k < pts.length; k++) { ctx.lineTo(pts[k][0], pts[k][1]); }
				ctx.strokeStyle = theme.veins;
				ctx.globalAlpha = pass === 0 ? 0.08 : 0.25 + rnd() * 0.5;
				ctx.lineWidth = pass === 0 ? width * 6 : width;
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	// ---------------------------------------------------------------- przód

	function drawFront(ctx, m, spec) {
		var b = spec.bleed, tw = spec.trimW, th = spec.trimH, safe = spec.safe;
		var seed = hashString(m.username || 'x');
		var cx = tw / 2;
		var unit = Math.min(tw, th);
		var theme;

		if (m.front.bgImg) {
			// Tło z biblioteki (np. z Magnific) – kolory tekstu zależą od jasności tła.
			theme = m.front.bgTone === 'light' ? TEXT_ON_LIGHT : TEXT_ON_DARK;
			drawCover(ctx, m.front.bgImg, -b, -b, tw + 2 * b, th + 2 * b);
		} else {
			theme = THEMES[m.front.theme] || THEMES.marmur;
			background(ctx, theme, -b, -b, tw + 2 * b, th + 2 * b, seed);
		}

		// Zdjęcie profilowe.
		var r = unit * 0.18, ay = th * 0.175;
		avatar(ctx, m.avatarImg, cx, ay, r, unit * 0.02, unit * 0.012, theme.bg[1], initialsOf(m.front.name || m.fullName));

		ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

		// Imię i nazwisko.
		var y = ay + r + unit * 0.18;
		var name = (m.front.name || m.fullName || '').toUpperCase();
		spacing(ctx, 0.1);
		fitFont(ctx, name, tw - 2 * safe, 500, unit * 0.105, SERIF, unit * 0.05);
		ctx.fillStyle = theme.text; ctx.fillText(name, cx, y);

		// Hasło.
		if (m.front.tagline) {
			y += unit * 0.075;
			spacing(ctx, 0.12);
			var tag = m.front.tagline.toUpperCase();
			fitFont(ctx, tag, tw - 2 * safe, 600, unit * 0.04, SANS, unit * 0.025);
			ctx.fillStyle = theme.sub; ctx.fillText(tag, cx, y);
		}
		spacing(ctx, 0);

		// Kontakt.
		var rows = [];
		if (m.front.phone) { rows.push({ text: m.front.phone, icon: iconPhone }); }
		if (m.front.email) { rows.push({ text: m.front.email.toUpperCase(), icon: iconMail }); }
		var ir = unit * 0.03, gap = unit * 0.025;
		y += unit * 0.105;
		rows.forEach(function (row) {
			spacing(ctx, 0.05);
			fitFont(ctx, row.text, tw - 2 * safe - ir * 2 - gap, 500, unit * 0.043, SANS, unit * 0.028);
			var tw2 = ctx.measureText(row.text).width;
			var total = ir * 2 + gap + tw2, x0 = cx - total / 2;
			row.icon(ctx, x0 + ir, y - unit * 0.015, ir, theme.icon);
			ctx.textAlign = 'left'; ctx.fillStyle = theme.text;
			ctx.fillText(row.text, x0 + ir * 2 + gap, y);
			ctx.textAlign = 'center';
			y += unit * 0.085;
		});
		spacing(ctx, 0);

		// Kod QR z linkiem do profilu.
		var box = unit * 0.37, capH = unit * 0.06;
		var bx = cx - box / 2, by = th - safe - box - capH;
		ctx.fillStyle = '#ffffff';
		roundRect(ctx, bx, by, box, box + capH, unit * 0.02); ctx.fill();
		drawQr(ctx, 'https://instagram.com/' + (m.username || ''), bx + box * 0.08, by + box * 0.08, box * 0.84);
		ctx.fillStyle = '#111111';
		var cap = '@' + (m.username || '').toUpperCase();
		fitFont(ctx, cap, box * 0.9, 600, unit * 0.03, SANS, unit * 0.018);
		ctx.textAlign = 'center';
		ctx.fillText(cap, cx, by + box + capH * 0.45);
	}

	function drawQr(ctx, text, x, y, size) {
		if (typeof window.qrcode !== 'function') { return; }
		var qr = window.qrcode(0, 'H');
		qr.addData(text); qr.make();
		var n = qr.getModuleCount(), cell = size / n;
		ctx.fillStyle = '#111111';
		for (var r = 0; r < n; r++) {
			for (var c = 0; c < n; c++) {
				// Lekkie nachodzenie modułów usuwa cienkie szczeliny przy antyaliasingu.
				if (qr.isDark(r, c)) { ctx.fillRect(x + c * cell, y + r * cell, cell + 0.01, cell + 0.01); }
			}
		}
		// Logo Instagrama w środku (poziom korekcji H wytrzymuje ~30% zasłonięcia).
		var ls = size * 0.24, lx = x + size / 2, ly = y + size / 2;
		ctx.fillStyle = '#ffffff';
		roundRect(ctx, lx - ls / 2, ly - ls / 2, ls, ls, ls * 0.2); ctx.fill();
		iconInstagram(ctx, lx, ly, ls * 0.7, '#111111', ls * 0.07);
	}

	// ---------------------------------------------------------------- tył (profil Instagram)

	function drawBack(ctx, m, spec) {
		var b = spec.bleed, tw = spec.trimW, th = spec.trimH, s = spec.safe;
		var seed = hashString(m.username || 'x');
		var ink = '#000000', gray = '#737373', line = '#dbdbdb';
		var u = tw / 55; // skala względem wizytówki 55 mm szerokości.

		ctx.fillStyle = '#ffffff';
		ctx.fillRect(-b, -b, tw + 2 * b, th + 2 * b);
		ctx.textBaseline = 'alphabetic';

		var y = s;

		// Nagłówek: nazwa użytkownika + ikony.
		ctx.textAlign = 'left'; ctx.fillStyle = ink;
		var unameSize = fitFont(ctx, m.username || '', tw - 2 * s - 9 * u, 700, 3 * u, SANS, 1.8 * u);
		ctx.fillText(m.username || '', s, y + 2.6 * u);
		if (m.isVerified) {
			verifiedBadge(ctx, s + ctx.measureText(m.username || '').width + 1.4 * u, y + 1.6 * u, unameSize * 0.32);
		}
		iconPlus(ctx, tw - s - 6.2 * u, y + 1.6 * u, 2.4 * u, ink, 0.22 * u);
		iconMenu(ctx, tw - s - 2.6 * u, y + 0.75 * u, 2.6 * u, ink, 0.25 * u);
		y += 5 * u;

		// Zdjęcie + liczniki.
		var ar = 6.2 * u;
		avatar(ctx, m.avatarImg, s + ar + 1 * u, y + ar + 0.8 * u, ar, 0.55 * u, 0.4 * u, '#ffffff', initialsOf(m.fullName));
		var cx0 = s + ar * 2 + 3 * u, colW = (tw - s - cx0) / 3;
		var stats = [[m.counts.posts, 'posty'], [m.counts.followers, 'obserwujący'], [m.counts.following, 'obserwowani']];
		ctx.textAlign = 'center';
		stats.forEach(function (st, i) {
			var x = cx0 + colW * (i + 0.5);
			ctx.fillStyle = ink;
			var num = formatCount(st[0]);
			fitFont(ctx, num, colW * 0.95, 700, 2.6 * u, SANS, 1.6 * u);
			ctx.fillText(num, x, y + ar + 0.4 * u);
			ctx.fillStyle = ink;
			fitFont(ctx, st[1], colW * 0.98, 400, 1.6 * u, SANS, 1.1 * u);
			ctx.fillText(st[1], x, y + ar + 3 * u);
		});
		y += ar * 2 + 3.2 * u;

		// Imię, kategoria, bio, link.
		ctx.textAlign = 'left';
		var textW = tw - 2 * s;
		if (m.fullName) {
			ctx.fillStyle = ink; fitFont(ctx, m.fullName, textW, 600, 2 * u, SANS, 1.4 * u);
			ctx.fillText(ellipsize(ctx, m.fullName, textW), s, y); y += 2.4 * u;
		}
		if (m.category) {
			ctx.fillStyle = gray; font(ctx, 400, 1.75 * u, SANS);
			ctx.fillText(ellipsize(ctx, m.category, textW), s, y); y += 2.3 * u;
		}
		if (m.bio) {
			ctx.fillStyle = ink; font(ctx, 400, 1.75 * u, SANS);
			wrapLines(ctx, m.bio, textW, 4).forEach(function (l) { ctx.fillText(l, s, y); y += 2.3 * u; });
		}
		if (m.website) {
			ctx.fillStyle = '#00376b'; font(ctx, 600, 1.75 * u, SANS);
			ctx.fillText(ellipsize(ctx, m.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), textW), s, y); y += 2.3 * u;
		}
		y += 0.8 * u;

		// Wyróżnione relacje.
		var hl = (m.highlights || []).filter(function (h) { return h && (h.title || h.img); }).slice(0, 5);
		if (hl.length) {
			var slot = (tw - 2 * s) / 5, hr = Math.min(3.4 * u, slot * 0.36);
			hl.forEach(function (h, i) {
				var hx = s + slot * (i + 0.5), hy = y + hr + 0.4 * u;
				ctx.save();
				ctx.beginPath(); ctx.arc(hx, hy, hr + 0.35 * u, 0, Math.PI * 2);
				ctx.strokeStyle = line; ctx.lineWidth = 0.22 * u; ctx.stroke();
				ctx.beginPath(); ctx.arc(hx, hy, hr - 0.15 * u, 0, Math.PI * 2); ctx.clip();
				if (h.img) { drawCover(ctx, h.img, hx - hr, hy - hr, hr * 2, hr * 2); }
				else {
					ctx.fillStyle = '#f2efec'; ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
					ctx.fillStyle = '#b9aea4'; font(ctx, 600, hr * 0.8, SANS); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
					ctx.fillText((h.title || '?').charAt(0).toUpperCase(), hx, hy);
				}
				ctx.restore();
				ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ink;
				font(ctx, 400, 1.4 * u, SANS);
				ctx.fillText(ellipsize(ctx, h.title || '', slot * 0.95), hx, hy + hr + 2.2 * u);
			});
			y += hr * 2 + 3.6 * u;
		}

		// Zakładki.
		var tabY = y + 1.5 * u;
		var tabs = [iconGrid, iconReels, iconTagged];
		tabs.forEach(function (fn, i) {
			fn(ctx, tw * (i + 0.5) / 3, tabY, 2.2 * u, i === 0 ? ink : gray, 0.2 * u);
		});
		var lineY = tabY + 2.3 * u;
		ctx.fillStyle = line; ctx.fillRect(-b, lineY, tw + 2 * b, 0.12 * u);
		ctx.fillStyle = ink; ctx.fillRect(tw / 6 - 4 * u, lineY - 0.12 * u, 8 * u, 0.24 * u);

		// Siatka 3×3 – skrajne kafelki wychodzą na spad, żeby po przycięciu nie było białych pasków.
		var gap = 0.3 * u, top = lineY + 0.3 * u;
		var cw = (tw - 2 * gap) / 3, rh = (th - top - 2 * gap) / 3;
		for (var i = 0; i < 9; i++) {
			var col = i % 3, row = Math.floor(i / 3);
			var x = col * (cw + gap), yy = top + row * (rh + gap), w = cw, h = rh;
			if (col === 0) { x -= b; w += b; }
			if (col === 2) { w += b; }
			if (row === 2) { h += b; }
			var post = (m.posts || [])[i] || {};
			ctx.save();
			ctx.beginPath(); ctx.rect(x, yy, w, h); ctx.clip();
			if (post.img) { drawCover(ctx, post.img, x, yy, w, h); } else { placeholder(ctx, x, yy, w, h, i, seed); }
			ctx.restore();
			var ix = col * (cw + gap) + cw - 2.6 * u, iy = yy + 0.8 * u;
			if (post.type === 'carousel') { iconCarousel(ctx, ix, iy, 1.8 * u); }
			else if (post.type === 'reel' || post.type === 'video') { iconPlay(ctx, ix + 0.3 * u, iy, 1.6 * u); }
		}
	}

	// ---------------------------------------------------------------- API

	/**
	 * Rysuje stronę wizytówki.
	 * @param {HTMLCanvasElement} canvas
	 * @param {'front'|'back'} side
	 * @param {object} model   dane wizytówki (patrz configurator.js)
	 * @param {object} spec    specyfikacja druku (mm)
	 * @param {object} opts    { pxPerMm, trimmed: bool (podgląd po wycięciu), guides: bool }
	 */
	function render(canvas, side, model, spec, opts) {
		opts = opts || {};
		var k = opts.pxPerMm;
		var b = spec.bleed;
		var wMm = opts.trimmed ? spec.trimW : spec.trimW + 2 * b;
		var hMm = opts.trimmed ? spec.trimH : spec.trimH + 2 * b;
		canvas.width = Math.round(wMm * k);
		canvas.height = Math.round(hMm * k);
		var ctx = canvas.getContext('2d');
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.scale(k, k);
		if (opts.trimmed) {
			roundRect(ctx, 0, 0, spec.trimW, spec.trimH, spec.cornerRadius || 0);
			ctx.clip();
		} else {
			ctx.translate(b, b);
		}
		ctx.save();
		(side === 'front' ? drawFront : drawBack)(ctx, model, spec);
		ctx.restore();
		if (opts.guides && !opts.trimmed) { drawGuides(ctx, spec); }
		return canvas;
	}

	/** Linie pomocnicze: obszar spadu (do odcięcia), linia cięcia, strefa bezpieczna. */
	function drawGuides(ctx, spec) {
		var b = spec.bleed, tw = spec.trimW, th = spec.trimH, s = spec.safe;
		ctx.save();
		ctx.fillStyle = 'rgba(255,0,80,0.22)';
		ctx.beginPath();
		ctx.rect(-b, -b, tw + 2 * b, th + 2 * b);
		ctx.rect(0, 0, tw, th);
		ctx.fill('evenodd');
		ctx.lineWidth = 0.15;
		ctx.strokeStyle = '#ff0050'; ctx.strokeRect(0, 0, tw, th);
		ctx.setLineDash([0.8, 0.6]); ctx.strokeStyle = '#00a2ff';
		ctx.strokeRect(s, s, tw - 2 * s, th - 2 * s);
		ctx.restore();
	}

	/**
	 * Średnia jasność (0–1), nasycenie i odcień obrazka – do doboru koloru tekstu i podpowiedzi teł.
	 * Opcjonalnie tylko z wycinka (rx, ry, rw, rh w ułamkach 0–1).
	 */
	function analyzeImage(img, region) {
		var c = document.createElement('canvas'), n = 24;
		c.width = c.height = n;
		var x = c.getContext('2d', { willReadFrequently: true });
		var rg = region || [0, 0, 1, 1];
		var W = img.naturalWidth, H = img.naturalHeight;
		x.drawImage(img, rg[0] * W, rg[1] * H, rg[2] * W, rg[3] * H, 0, 0, n, n);
		var d;
		try { d = x.getImageData(0, 0, n, n).data; } catch (e) { return null; }
		var lum = 0, sat = 0, sx = 0, sy = 0, cnt = n * n;
		for (var i = 0; i < d.length; i += 4) {
			var r = d[i] / 255, g = d[i + 1] / 255, bl = d[i + 2] / 255;
			var mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
			lum += 0.2126 * r + 0.7152 * g + 0.0722 * bl;
			var s2 = mx === 0 ? 0 : (mx - mn) / mx;
			sat += s2;
			if (mx !== mn) {
				var h = mx === r ? ((g - bl) / (mx - mn)) % 6 : mx === g ? (bl - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
				var a = h / 6 * Math.PI * 2;
				sx += Math.cos(a) * s2; sy += Math.sin(a) * s2;
			}
		}
		var hue = (Math.atan2(sy, sx) / (Math.PI * 2) * 360 + 360) % 360;
		return { lum: lum / cnt, sat: sat / cnt, hue: hue };
	}

	window.IWRenderer = { render: render, themes: THEMES, formatCount: formatCount, analyzeImage: analyzeImage };
})();
