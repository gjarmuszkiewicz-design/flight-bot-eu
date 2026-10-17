/**
 * Konfigurator instawizytówki: pobranie profilu, edycja, podgląd 1:1 i generowanie PDF do druku.
 * Wymaga: window.IW_CONFIG (z WordPressa), IWRenderer, jsPDF, qrcode.
 */
(function () {
	'use strict';

	var CFG = window.IW_CONFIG || {};
	var SPEC = CFG.print;
	var R = window.IWRenderer;

	function el(tag, attrs, children) {
		var e = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) {
			if (k === 'class') { e.className = attrs[k]; }
			else if (k === 'text') { e.textContent = attrs[k]; }
			else if (k.indexOf('on') === 0) { e.addEventListener(k.slice(2), attrs[k]); }
			else { e.setAttribute(k, attrs[k]); }
		});
		(children || []).forEach(function (c) { if (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } });
		return e;
	}

	function loadImage(src) {
		return new Promise(function (resolve) {
			if (!src) { resolve(null); return; }
			var img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = function () { resolve(img); };
			img.onerror = function () { resolve(null); };
			img.src = src;
		});
	}

	function readFile(file) {
		return new Promise(function (resolve) {
			var fr = new FileReader();
			fr.onload = function () { loadImage(fr.result).then(resolve); };
			fr.readAsDataURL(file);
		});
	}

	function pickImage() {
		return new Promise(function (resolve) {
			var input = el('input', { type: 'file', accept: 'image/*' });
			input.addEventListener('change', function () { resolve(input.files[0] ? readFile(input.files[0]) : null); });
			input.click();
		});
	}

	function fontsReady() {
		if (!document.fonts || !document.fonts.load) { return Promise.resolve(); }
		return Promise.all([
			'500 20px "Playfair Display"', '400 20px Inter', '500 20px Inter', '600 20px Inter', '700 20px Inter'
		].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
	}

	function canvasToBlob(canvas, type, q) {
		return new Promise(function (resolve) { canvas.toBlob(resolve, type, q); });
	}

	// ======================================================================= aplikacja

	function App(root) {
		this.root = root;
		this.mode = root.getAttribute('data-mode') || 'standalone';
		this.model = null;
		this.view = 'trimmed';
		this.dirty = true;
		this.build();
		if (this.mode === 'product') { this.hookCartForm(); }
	}

	App.prototype.build = function () {
		var self = this;
		this.input = el('input', { type: 'text', class: 'iw-input', placeholder: 'Link do Instagrama lub @nazwa', autocomplete: 'off' });
		this.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); self.fetchProfile(); } });
		this.fetchBtn = el('button', { type: 'button', class: 'iw-btn iw-btn-primary', text: 'Pokaż podgląd', onclick: function () { self.fetchProfile(); } });
		this.status = el('div', { class: 'iw-status', role: 'status' });

		this.cFront = el('canvas', { class: 'iw-canvas', 'aria-label': 'Przód wizytówki' });
		this.cBack = el('canvas', { class: 'iw-canvas', 'aria-label': 'Tył wizytówki – profil Instagram' });

		var viewSwitch = el('div', { class: 'iw-switch' }, [
			this.viewBtn('trimmed', 'Po wycięciu'),
			this.viewBtn('print', 'Plik do druku (spady)')
		]);

		this.form = el('div', { class: 'iw-form' });
		this.actions = el('div', { class: 'iw-actions' });

		this.workspace = el('div', { class: 'iw-workspace', hidden: 'hidden' }, [
			el('div', { class: 'iw-preview' }, [
				viewSwitch,
				el('div', { class: 'iw-sides' }, [
					el('figure', {}, [this.cFront, el('figcaption', { text: 'Przód' })]),
					el('figure', {}, [this.cBack, el('figcaption', { text: 'Tył – Twój profil' })])
				]),
				this.legend = el('p', { class: 'iw-legend', hidden: 'hidden', text: 'Różowy pas to spad – zostanie odcięty. Czerwona linia: cięcie. Niebieska przerywana: strefa bezpieczna dla tekstu.' })
			]),
			el('div', { class: 'iw-panel' }, [this.form, this.actions])
		]);

		this.root.appendChild(el('div', { class: 'iw-start' }, [
			el('label', { class: 'iw-label', text: 'Twój Instagram' }),
			el('div', { class: 'iw-row' }, [this.input, this.fetchBtn]),
			this.status
		]));
		this.root.appendChild(this.workspace);
	};

	App.prototype.viewBtn = function (view, label) {
		var self = this;
		var b = el('button', { type: 'button', class: 'iw-switch-btn' + (view === this.view ? ' is-active' : ''), text: label });
		b.addEventListener('click', function () {
			self.view = view;
			Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.toggle('is-active', x === b); });
			self.legend.hidden = view !== 'print';
			self.redraw();
		});
		return b;
	};

	App.prototype.setStatus = function (text, type) {
		this.status.textContent = text || '';
		this.status.className = 'iw-status' + (type ? ' is-' + type : '');
	};

	App.prototype.fetchProfile = function () {
		var self = this;
		var q = this.input.value.trim();
		if (!q) { this.setStatus('Wpisz link do profilu albo nazwę użytkownika.', 'error'); return; }
		this.fetchBtn.disabled = true;
		this.setStatus('Pobieram profil…', 'info');
		fetch(CFG.restUrl + '/profile?username=' + encodeURIComponent(q), { headers: { 'X-WP-Nonce': CFG.nonce } })
			.then(function (r) { return r.json().then(function (j) { if (!r.ok) { throw new Error(j.message || 'Błąd'); } return j; }); })
			.then(function (p) { return self.setProfile(p); })
			.then(function () {
				self.setStatus(self.model.isPrivate ? 'Profil jest prywatny – dodaj zdjęcia do siatki ręcznie.' : 'Gotowe! Możesz poprawić dane poniżej.', self.model.isPrivate ? 'info' : 'ok');
			})
			.catch(function (e) { self.setStatus(e.message || 'Nie udało się pobrać profilu.', 'error'); })
			.then(function () { self.fetchBtn.disabled = false; });
	};

	App.prototype.setProfile = function (p) {
		var self = this;
		var posts = (p.posts || []).slice(0, 9);
		while (posts.length < 9) { posts.push({ image: null, type: 'photo' }); }
		var hls = (p.highlights || []).slice(0, 5);

		return Promise.all([
			loadImage(p.avatar),
			Promise.all(posts.map(function (x) { return loadImage(x.image); })),
			Promise.all(hls.map(function (h) { return loadImage(h.image); })),
			fontsReady()
		]).then(function (res) {
			self.model = {
				username: p.username,
				fullName: p.full_name || '',
				category: p.category || '',
				bio: p.biography || '',
				website: p.website || '',
				isVerified: !!p.is_verified,
				isPrivate: !!p.is_private,
				counts: { posts: p.counts.posts, followers: p.counts.followers, following: p.counts.following },
				avatarImg: res[0],
				avatarSrc: p.avatar,
				posts: posts.map(function (x, i) { return { img: res[1][i], src: x.image, type: x.type }; }),
				highlights: hls.map(function (h, i) { return { title: h.title || '', img: res[2][i], src: h.image }; }),
				front: { name: p.full_name || '', tagline: '', phone: '', email: '', theme: 'marmur' }
			};
			self.workspace.hidden = false;
			self.buildForm();
			self.redraw();
		});
	};

	// ---------------------------------------------------------------- formularz edycji

	App.prototype.field = function (label, get, set, opts) {
		var self = this;
		opts = opts || {};
		var input;
		if (opts.type === 'textarea') { input = el('textarea', { rows: '4', class: 'iw-input' }); }
		else if (opts.type === 'select') {
			input = el('select', { class: 'iw-input' });
			Object.keys(opts.options).forEach(function (k) { input.appendChild(el('option', { value: k, text: opts.options[k] })); });
		} else { input = el('input', { type: opts.type || 'text', class: 'iw-input', placeholder: opts.placeholder || '' }); }
		input.value = get();
		input.addEventListener('input', function () { set(input.value); self.changed(); });
		return el('label', { class: 'iw-field' }, [el('span', { text: label }), input]);
	};

	App.prototype.buildForm = function () {
		var self = this, m = this.model, f = this.form;
		f.innerHTML = '';
		var themes = {};
		Object.keys(R.themes).forEach(function (k) { themes[k] = R.themes[k].label; });

		f.appendChild(el('h3', { text: 'Przód wizytówki' }));
		f.appendChild(this.field('Imię i nazwisko', function () { return m.front.name; }, function (v) { m.front.name = v; }));
		f.appendChild(this.field('Hasło pod nazwiskiem', function () { return m.front.tagline; }, function (v) { m.front.tagline = v; }, { placeholder: 'np. Zdrowie • Rozwój • Biznes' }));
		f.appendChild(this.field('Telefon', function () { return m.front.phone; }, function (v) { m.front.phone = v; }, { type: 'tel', placeholder: '+48 600 000 000' }));
		f.appendChild(this.field('E-mail', function () { return m.front.email; }, function (v) { m.front.email = v; }, { type: 'email' }));
		f.appendChild(this.field('Motyw', function () { return m.front.theme; }, function (v) { m.front.theme = v; }, { type: 'select', options: themes }));

		f.appendChild(el('h3', { text: 'Profil (tył)' }));
		f.appendChild(el('div', { class: 'iw-row' }, [
			el('button', { type: 'button', class: 'iw-btn', text: 'Zmień zdjęcie profilowe', onclick: function () {
				pickImage().then(function (img) { if (img) { m.avatarImg = img; m.avatarSrc = 'upload'; self.changed(); } });
			} })
		]));
		f.appendChild(this.field('Nazwa wyświetlana', function () { return m.fullName; }, function (v) { m.fullName = v; }));
		f.appendChild(this.field('Kategoria', function () { return m.category; }, function (v) { m.category = v; }, { placeholder: 'np. Przedsiębiorca' }));
		f.appendChild(this.field('Bio', function () { return m.bio; }, function (v) { m.bio = v; }, { type: 'textarea' }));
		f.appendChild(this.field('Link w bio', function () { return m.website; }, function (v) { m.website = v; }));
		f.appendChild(el('div', { class: 'iw-grid3' }, [
			this.field('Posty', function () { return m.counts.posts; }, function (v) { m.counts.posts = v; }, { type: 'number' }),
			this.field('Obserwujący', function () { return m.counts.followers; }, function (v) { m.counts.followers = v; }, { type: 'number' }),
			this.field('Obserwowani', function () { return m.counts.following; }, function (v) { m.counts.following = v; }, { type: 'number' })
		]));

		f.appendChild(el('h3', { text: 'Wyróżnione relacje' }));
		while (m.highlights.length < 5) { m.highlights.push({ title: '', img: null, src: null }); }
		m.highlights.forEach(function (h) {
			var t = self.field('', function () { return h.title; }, function (v) { h.title = v; }, { placeholder: 'Nazwa (puste = ukryj)' });
			f.appendChild(el('div', { class: 'iw-row iw-hl' }, [t, el('button', { type: 'button', class: 'iw-btn iw-btn-small', text: 'Okładka', onclick: function () {
				pickImage().then(function (img) { if (img) { h.img = img; h.src = 'upload'; self.changed(); } });
			} })]));
		});

		f.appendChild(el('h3', { text: 'Siatka – 9 zdjęć' }));
		f.appendChild(el('p', { class: 'iw-hint', text: 'Kliknij kafelek, aby podmienić zdjęcie.' }));
		this.tiles = el('div', { class: 'iw-tiles' });
		f.appendChild(this.tiles);
		this.buildTiles();

		this.actions.innerHTML = '';
		if (this.mode === 'product') {
			this.actions.appendChild(el('p', { class: 'iw-hint', text: 'Projekt zostanie dołączony do zamówienia po kliknięciu „Dodaj do koszyka”.' }));
		}
		if (this.mode === 'standalone' || CFG.canDownload) {
			this.actions.appendChild(el('button', { type: 'button', class: 'iw-btn iw-btn-primary', text: 'Pobierz PDF do druku', onclick: function (e) { self.downloadPdf(e.currentTarget); } }));
		}
	};

	App.prototype.buildTiles = function () {
		var self = this;
		this.tiles.innerHTML = '';
		this.model.posts.forEach(function (p, i) {
			var c = el('canvas', { width: '120', height: '120', class: 'iw-tile' });
			var ctx = c.getContext('2d');
			if (p.img) {
				var s = Math.min(p.img.naturalWidth, p.img.naturalHeight);
				ctx.drawImage(p.img, (p.img.naturalWidth - s) / 2, (p.img.naturalHeight - s) / 2, s, s, 0, 0, 120, 120);
			} else { ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, 120, 120); ctx.fillStyle = '#999'; ctx.font = '600 40px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', 60, 74); }
			var btn = el('button', { type: 'button', class: 'iw-tile-btn', title: 'Podmień zdjęcie ' + (i + 1) }, [c]);
			btn.addEventListener('click', function () {
				pickImage().then(function (img) { if (img) { p.img = img; p.src = 'upload'; p.type = 'photo'; self.buildTiles(); self.changed(); } });
			});
			self.tiles.appendChild(btn);
		});
	};

	App.prototype.changed = function () {
		this.dirty = true;
		if (this.hidden) { this.hidden.value = ''; }
		this.redraw();
	};

	// ---------------------------------------------------------------- rysowanie

	App.prototype.redraw = function () {
		var self = this;
		if (!this.model || this.raf) { return; }
		this.raf = requestAnimationFrame(function () {
			self.raf = null;
			var trimmed = self.view === 'trimmed';
			var cssW = Math.min(300, (self.cFront.parentNode.clientWidth || 300));
			var wMm = trimmed ? SPEC.trimW : SPEC.trimW + 2 * SPEC.bleed;
			var k = (cssW * (window.devicePixelRatio || 1)) / wMm;
			[['front', self.cFront], ['back', self.cBack]].forEach(function (x) {
				R.render(x[1], x[0], self.model, SPEC, { pxPerMm: k, trimmed: trimmed, guides: !trimmed });
				x[1].style.width = cssW + 'px';
			});
		});
	};

	// ---------------------------------------------------------------- plik do druku

	/** Buduje PDF: 2 strony (przód, tył), wymiar netto + spady (+ opcjonalnie znaczniki cięcia). */
	App.prototype.buildPdf = function () {
		var jsPDF = window.jspdf.jsPDF;
		var b = SPEC.bleed, W = SPEC.trimW + 2 * b, H = SPEC.trimH + 2 * b;
		var off = SPEC.cropMarks ? SPEC.slug : 0;
		var pw = W + 2 * off, ph = H + 2 * off;
		var orient = pw > ph ? 'landscape' : 'portrait';
		var doc = new jsPDF({ unit: 'mm', format: [pw, ph], orientation: orient, compress: true });
		var k = SPEC.dpi / 25.4;
		var self = this;

		doc.setProperties({ title: 'Wizytówka @' + this.model.username, creator: 'Insta Wizytówki', subject: SPEC.trimW + '×' + SPEC.trimH + ' mm + spad ' + b + ' mm, ' + SPEC.dpi + ' DPI' });

		['front', 'back'].forEach(function (side, i) {
			if (i > 0) { doc.addPage([pw, ph], orient); }
			var c = R.render(document.createElement('canvas'), side, self.model, SPEC, { pxPerMm: k });
			doc.addImage(c.toDataURL('image/jpeg', SPEC.jpegQuality), 'JPEG', off, off, W, H, undefined, 'NONE');
			if (SPEC.cropMarks) { cropMarks(doc, off, b, SPEC.trimW, SPEC.trimH); }
		});
		return doc;
	};

	function cropMarks(doc, off, b, tw, th) {
		doc.setDrawColor(0); doc.setLineWidth(0.2);
		var xs = [off + b, off + b + tw], ys = [off + b, off + b + th];
		var fullW = tw + 2 * b + 2 * off, fullH = th + 2 * b + 2 * off;
		xs.forEach(function (x) { doc.line(x, 0, x, off - 1); doc.line(x, fullH - off + 1, x, fullH); });
		ys.forEach(function (y) { doc.line(0, y, off - 1, y); doc.line(fullW - off + 1, y, fullW, y); });
	}

	App.prototype.previewBlob = function (side) {
		var c = R.render(document.createElement('canvas'), side, this.model, SPEC, { pxPerMm: 600 / SPEC.trimW, trimmed: true });
		return canvasToBlob(c, 'image/png');
	};

	App.prototype.downloadPdf = function (btn) {
		var self = this;
		btn.disabled = true;
		this.setStatus('Generuję plik do druku…', 'info');
		setTimeout(function () {
			try {
				self.buildPdf().save('wizytowka-' + self.model.username + '.pdf');
				self.setStatus('Plik PDF pobrany.', 'ok');
			} catch (e) { self.setStatus('Błąd generowania PDF: ' + e.message, 'error'); }
			btn.disabled = false;
		}, 30);
	};

	/** Zapisuje projekt na serwerze. Zwraca ID projektu. */
	App.prototype.saveProject = function () {
		var self = this, m = this.model;
		var pdf = this.buildPdf().output('blob');
		return Promise.all([this.previewBlob('front'), this.previewBlob('back')]).then(function (prev) {
			var fd = new FormData();
			fd.append('print', pdf, 'print.pdf');
			fd.append('front', prev[0], 'front.png');
			fd.append('back', prev[1], 'back.png');
			fd.append('data', JSON.stringify({
				username: m.username, name: m.front.name, phone: m.front.phone, email: m.front.email, theme: m.front.theme,
				state: {
					front: m.front, fullName: m.fullName, category: m.category, bio: m.bio, website: m.website, counts: m.counts,
					avatar: m.avatarSrc, posts: m.posts.map(function (p) { return { src: p.src, type: p.type }; }),
					highlights: m.highlights.map(function (h) { return { title: h.title, src: h.src }; })
				}
			}));
			return fetch(CFG.restUrl + '/project', { method: 'POST', body: fd, headers: { 'X-WP-Nonce': CFG.nonce } });
		}).then(function (r) {
			return r.json().then(function (j) { if (!r.ok) { throw new Error(j.message || 'Błąd zapisu projektu'); } self.dirty = false; return j.id; });
		});
	};

	// ---------------------------------------------------------------- WooCommerce

	App.prototype.hookCartForm = function () {
		var self = this;
		var form = this.root.closest('form.cart');
		if (!form) { return; }
		this.hidden = form.querySelector('.iw-project-id');
		form.addEventListener('submit', function (e) {
			if (self.hidden && self.hidden.value && !self.dirty) { return; }
			e.preventDefault();
			if (!self.model) {
				self.setStatus('Najpierw wpisz swój Instagram i zobacz podgląd.', 'error');
				self.input.focus();
				return;
			}
			var submitter = e.submitter || form.querySelector('[type=submit]');
			if (submitter) { submitter.disabled = true; }
			self.setStatus('Zapisuję projekt i przygotowuję plik do druku…', 'info');
			setTimeout(function () {
				self.saveProject().then(function (id) {
					self.hidden.value = id;
					if (submitter) { submitter.disabled = false; }
					// requestSubmit zachowuje name/value przycisku (add-to-cart) w danych formularza.
					if (form.requestSubmit) { form.requestSubmit(submitter && submitter.name ? submitter : undefined); }
					else { form.submit(); }
				}).catch(function (err) {
					if (submitter) { submitter.disabled = false; }
					self.setStatus(err.message, 'error');
				});
			}, 30);
		});
	};

	function boot() {
		Array.prototype.forEach.call(document.querySelectorAll('.iw-app'), function (root) {
			if (!root.__iw) { root.__iw = new App(root); }
		});
	}
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
