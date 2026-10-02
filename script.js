(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;
    const isMobile = window.innerWidth < 860;
    const $ = (s, root = document) => root.querySelector(s);
    const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

    /* ---------- Loader ---------- */
    let ready = false;
    document.body.classList.add('loading');
    function finishLoading() {
        if (ready) return;
        ready = true;
        $('#loader').classList.add('done');
        document.body.classList.remove('loading');
        initReveal();
        initTyper();
    }
    window.addEventListener('load', () => setTimeout(finishLoading, 300));
    setTimeout(finishLoading, 2500);

    $('#year').textContent = new Date().getFullYear();

    /* ---------- Role typer ---------- */
    function initTyper() {
        const el = $('#role-typer');
        const roles = ['Software Engineer', 'Full-Stack Developer', 'AI Application Builder', 'Databricks · Azure OpenAI', 'Competitive Programmer'];
        if (reduceMotion) { el.textContent = roles[0]; return; }
        let r = 0, c = 0, deleting = false;
        (function step() {
            const word = roles[r];
            c += deleting ? -1 : 1;
            el.textContent = word.slice(0, c);
            let delay = deleting ? 35 : 75;
            if (!deleting && c === word.length) { deleting = true; delay = 1700; }
            else if (deleting && c === 0) { deleting = false; r = (r + 1) % roles.length; delay = 300; }
            setTimeout(step, delay);
        })();
    }

    /* ---------- Reveal + counters ---------- */
    function animateCount(el) {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = reduceMotion ? 0 : 1800;
        const start = performance.now();
        (function frame(now) {
            const p = duration ? Math.min((now - start) / duration, 1) : 1;
            const eased = 1 - Math.pow(2, -10 * p);
            el.textContent = prefix + (target * (p === 1 ? 1 : eased)).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(frame);
        })(start);
    }

    function initReveal() {
        // Stagger siblings that reveal together
        $$('.reveal').forEach(el => {
            const siblings = Array.from(el.parentElement.children).filter(n => n.classList.contains('reveal'));
            el.style.setProperty('--delay', `${siblings.indexOf(el) * 0.08}s`);
        });

        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        $$('.reveal').forEach(el => io.observe(el));

        const countIO = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                animateCount(entry.target);
                countIO.unobserve(entry.target);
            });
        }, { threshold: 0.6 });
        $$('[data-count]').forEach(el => countIO.observe(el));
    }

    /* ---------- Nav ---------- */
    const nav = $('#nav');
    const navToggle = $('#nav-toggle');
    const navLinks = $('#nav-links');

    function setMenu(open) {
        navLinks.classList.toggle('open', open);
        navToggle.classList.toggle('open', open);
        nav.classList.toggle('menu-open', open);
        navToggle.setAttribute('aria-expanded', String(open));
    }
    navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
    $$('a', navLinks).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('click', e => {
        if (navLinks.classList.contains('open') && !nav.contains(e.target)) setMenu(false);
    });

    /* ---------- Theme ---------- */
    const themeBtn = $('#theme-toggle');
    const currentTheme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch { /* storage blocked */ }
        $('meta[name="theme-color"]').setAttribute('content', theme === 'light' ? '#f5f6fb' : '#05060f');
        themeBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
        document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    }
    themeBtn.setAttribute('aria-label', currentTheme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode');

    themeBtn.addEventListener('click', () => {
        const next = currentTheme() === 'light' ? 'dark' : 'light';
        if (!document.startViewTransition || reduceMotion) { setTheme(next); return; }

        // Expanding circle reveal from the toggle button
        const r = themeBtn.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        const transition = document.startViewTransition(() => setTheme(next));
        transition.ready.then(() => {
            document.documentElement.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
            );
        });
    });

    /* ---------- Scroll-driven UI ---------- */
    const progress = $('.scroll-progress');
    const timeline = $('.timeline');
    const dotNav = $('#dot-nav');
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let scrollTicking = false;
    let navPinned = false;

    function onScroll() {
        const y = window.scrollY;
        scrollVelocity = y - lastScrollY;
        lastScrollY = y;

        nav.classList.toggle('scrolled', y > 30);
        // Hide nav while reading downward; bring it back on any upward scroll
        if (y < 150 || navPinned || navLinks.classList.contains('open')) nav.classList.remove('nav-hidden');
        else if (scrollVelocity > 6) nav.classList.add('nav-hidden');
        else if (scrollVelocity < -6) nav.classList.remove('nav-hidden');
        dotNav.classList.toggle('show', y > window.innerHeight * 0.6);

        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

        if (timeline) {
            const rect = timeline.getBoundingClientRect();
            const fill = Math.min(Math.max((window.innerHeight * 0.7 - rect.top) / rect.height, 0), 1);
            timeline.style.setProperty('--fill', fill.toFixed(3));
        }
        scrollTicking = false;
    }
    window.addEventListener('scroll', () => {
        if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    // Reveal nav when the pointer approaches the top edge or keyboard focus enters it
    if (!isTouch) {
        window.addEventListener('pointermove', e => {
            const near = e.clientY < 90;
            if (near !== navPinned) {
                navPinned = near;
                if (near) nav.classList.remove('nav-hidden');
            }
        }, { passive: true });
    }
    nav.addEventListener('focusin', () => nav.classList.remove('nav-hidden'));

    /* ---------- Active section (nav + 3D scene) ---------- */
    let activeScene = 'core';
    const linkMap = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
    const dotLinks = $$('.dot-nav a');
    const sectionIO = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            activeScene = entry.target.dataset.scene || activeScene;
            linkMap.forEach((a, key) => a.classList.toggle('active', key === id));
            dotLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('section[id]').forEach(s => sectionIO.observe(s));

    /* ---------- Cursor ---------- */
    if (!isTouch) {
        const dot = $('.cursor-dot');
        const ring = $('.cursor-ring');
        let mx = -100, my = -100, rx = -100, ry = -100;
        window.addEventListener('pointermove', e => {
            mx = e.clientX; my = e.clientY;
            document.body.classList.add('has-cursor');
        }, { passive: true });
        document.addEventListener('pointerleave', () => document.body.classList.remove('has-cursor'));
        document.addEventListener('pointerover', e => {
            const hit = e.target.closest('a, button, input, textarea, .tilt, .chips span');
            document.body.classList.toggle('cursor-hover', Boolean(hit));
        });
        (function loop() {
            rx += (mx - rx) * 0.18;
            ry += (my - ry) * 0.18;
            dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
            requestAnimationFrame(loop);
        })();
    }

    /* ---------- Tilt, spotlight, magnetic ---------- */
    if (!isTouch && !reduceMotion) {
        $$('.tilt').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                el.style.transition = 'transform 0.12s ease-out';
                el.style.transform = `perspective(900px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg) scale(1.02)`;
            });
            el.addEventListener('pointerleave', () => {
                el.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
                el.style.transform = '';
            });
        });

        $$('.magnetic').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - (r.left + r.width / 2);
                const y = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
    }

    $$('.spotlight').forEach(el => {
        el.addEventListener('pointermove', e => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${e.clientX - r.left}px`);
            el.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });

    /* ---------- Project screenshots + lightbox ---------- */
    const lightbox = $('#lightbox');
    const lb = { gallery: null, index: 0 };

    function showInLightbox(i) {
        const imgs = lb.gallery.imgs;
        lb.index = (i + imgs.length) % imgs.length;
        const src = imgs[lb.index];
        const img = $('figure img', lightbox);
        img.src = src.src;
        img.alt = src.alt;
        $('figcaption', lightbox).textContent = src.dataset.caption;
        $('.lightbox-count', lightbox).textContent = `${lb.index + 1} / ${imgs.length}`;
    }

    $$('.shots').forEach(shots => {
        const imgs = $$('.shots-stage img', shots);
        const caption = $('.shots-caption', shots);
        const dotsHost = $('.shots-dots', shots);
        const gallery = { title: shots.dataset.gallery, imgs };
        let index = 0;
        let timer = null;

        const show = i => {
            index = (i + imgs.length) % imgs.length;
            imgs.forEach((img, k) => img.classList.toggle('active', k === index));
            dots.forEach((d, k) => d.setAttribute('aria-current', String(k === index)));
            caption.textContent = imgs[index].dataset.caption;
        };
        const dots = imgs.map((img, k) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', `Show screenshot ${k + 1}: ${img.dataset.caption}`);
            b.addEventListener('click', () => { show(k); restart(); });
            dotsHost.appendChild(b);
            return b;
        });
        const stop = () => { clearInterval(timer); timer = null; };
        const start = () => { if (!reduceMotion && !timer && !lightbox.open) timer = setInterval(() => show(index + 1), 3800); };
        const restart = () => { stop(); start(); };

        show(0);
        new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { threshold: 0.35 }).observe(shots);
        shots.addEventListener('pointerenter', stop);
        shots.addEventListener('pointerleave', start);

        $('.shots-stage', shots).addEventListener('click', () => {
            stop();
            lb.gallery = gallery;
            $('.lightbox-title', lightbox).textContent = gallery.title;
            showInLightbox(index);
            lightbox.showModal();
        });
    });

    $('.lightbox-close', lightbox).addEventListener('click', () => lightbox.close());
    $('.lightbox-nav.prev', lightbox).addEventListener('click', () => showInLightbox(lb.index - 1));
    $('.lightbox-nav.next', lightbox).addEventListener('click', () => showInLightbox(lb.index + 1));
    lightbox.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') showInLightbox(lb.index - 1);
        if (e.key === 'ArrowRight') showInLightbox(lb.index + 1);
        if (e.key === 'Escape') { e.preventDefault(); lightbox.close(); }
    });
    // Clicking the dimmed backdrop (outside the dialog box) closes it
    lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });

    /* ---------- Email copy ---------- */
    const emailBtn = $('#email-copy');
    emailBtn.addEventListener('click', async () => {
        const state = $('.copy-state', emailBtn);
        try {
            await navigator.clipboard.writeText(emailBtn.dataset.email);
            state.innerHTML = '<i class="fa-solid fa-check"></i> copied';
        } catch {
            window.location.href = `mailto:${emailBtn.dataset.email}`;
            return;
        }
        setTimeout(() => { state.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 2000);
    });

    /* ---------- Contact form (opens user's mail client; no backend) ---------- */
    const form = $('#contact-form');
    const status = $('#form-status');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const name = form.elements.name.value.trim();
        const email = form.elements.email.value.trim();
        const message = form.elements.message.value.trim();
        status.className = 'form-status mono';

        if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            status.textContent = '// please fill in all fields with a valid email';
            status.classList.add('error');
            return;
        }
        const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
        const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
        window.location.href = `mailto:${emailBtn.dataset.email}?subject=${subject}&body=${body}`;
        status.textContent = '// opening your mail client...';
        status.classList.add('ok');
        form.reset();
    });

    /* ---------- 3D particle scene ---------- */
    initScene();

    function initScene() {
        const THREE = window.THREE;
        if (!THREE) return;

        const canvas = $('#bg-canvas');
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch {
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
        renderer.setSize(window.innerWidth, window.innerHeight);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x05060f, 0.055);
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 7);

        const COUNT = isMobile ? 2200 : 4500;
        const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.66;

        // ---- Target shapes the particles morph between ----
        function sphereShape() {
            const a = new Float32Array(COUNT * 3);
            const golden = Math.PI * (3 - Math.sqrt(5));
            for (let i = 0; i < COUNT; i++) {
                const y = 1 - (i / (COUNT - 1)) * 2;
                const rad = Math.sqrt(1 - y * y);
                const th = golden * i;
                const r = 2.1 + (Math.random() - 0.5) * 0.1;
                a.set([Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r], i * 3);
            }
            return a;
        }

        function knotShape() {
            const a = new Float32Array(COUNT * 3);
            const p = 2, q = 3, s = 0.75;
            for (let i = 0; i < COUNT; i++) {
                const t = (i / COUNT) * Math.PI * 2;
                const r = 2 + Math.cos(q * t);
                const j = 0.22 * Math.sqrt(Math.random());
                a.set([
                    r * Math.cos(p * t) * s + gauss() * j,
                    r * Math.sin(p * t) * s + gauss() * j,
                    Math.sin(q * t) * s + gauss() * j,
                ], i * 3);
            }
            return a;
        }

        function helixShape() {
            const a = new Float32Array(COUNT * 3);
            const strandCount = Math.floor(COUNT * 0.72);
            const rungs = 36, turns = Math.PI * 6, R = 1.1;
            for (let i = 0; i < COUNT; i++) {
                let x, y, z;
                if (i < strandCount) {
                    const f = i / strandCount;
                    const ang = f * turns + (i % 2) * Math.PI;
                    y = f * 6.4 - 3.2;
                    x = Math.cos(ang) * R + gauss() * 0.06;
                    z = Math.sin(ang) * R + gauss() * 0.06;
                } else {
                    const k = (i - strandCount) % rungs;
                    const f = k / rungs;
                    const ang = f * turns;
                    const along = 1 - 2 * Math.random();
                    y = f * 6.4 - 3.2;
                    x = Math.cos(ang) * R * along;
                    z = Math.sin(ang) * R * along;
                }
                a.set([x, y, z], i * 3);
            }
            return a;
        }

        const waveSide = Math.ceil(Math.sqrt(COUNT));
        function waveShape() {
            const a = new Float32Array(COUNT * 3);
            for (let i = 0; i < COUNT; i++) {
                a[i * 3] = ((i % waveSide) / waveSide - 0.5) * 10;
                a[i * 3 + 2] = (Math.floor(i / waveSide) / waveSide - 0.5) * 10;
            }
            return a;
        }

        function galaxyShape() {
            const a = new Float32Array(COUNT * 3);
            for (let i = 0; i < COUNT; i++) {
                const r = Math.pow(Math.random(), 0.7) * 3.3;
                const ang = (i % 3) * (Math.PI * 2 / 3) + r * 1.7;
                a.set([
                    Math.cos(ang) * r + gauss() * 0.28,
                    gauss() * 0.18 * (1.3 - r / 3.3),
                    Math.sin(ang) * r + gauss() * 0.28,
                ], i * 3);
            }
            return a;
        }

        const shapes = { core: sphereShape(), knot: knotShape(), helix: helixShape(), wave: waveShape(), galaxy: galaxyShape() };

        const configs = {
            // On phones the core sits top-right, behind the nav area, so hero text stays readable
            core:   { x: isMobile ? 1.5 : 2.7, y: isMobile ? 2.3 : 0, scale: isMobile ? 0.7 : 1, rx: 0, rz: 0, opacity: isMobile ? 0.7 : 0.95, neural: 1 },
            knot:   { x: isMobile ? 0 : -3.3, y: 0, scale: 0.9, rx: 0.4, rz: 0, opacity: 0.55, neural: 0 },
            helix:  { x: isMobile ? 0 : 3.6, y: 0, scale: 1, rx: 0, rz: 0.5, opacity: 0.55, neural: 0 },
            wave:   { x: 0, y: -2.4, scale: 1.1, rx: 0.38, rz: 0, opacity: 0.5, neural: 0 },
            galaxy: { x: isMobile ? 0 : 3, y: 0, scale: 1, rx: 0.9, rz: 0.25, opacity: 0.55, neural: 0 },
        };

        // ---- Particles ----
        const current = new Float32Array(shapes.core);
        const positions = new Float32Array(COUNT * 3);
        const colors = new Float32Array(COUNT * 3);
        const phase = new Float32Array(COUNT);
        const speed = new Float32Array(COUNT);
        const shade = new Float32Array(COUNT);
        const palettes = {
            dark: ['#7c5cff', '#22d3ee', '#f472b6'].map(c => new THREE.Color(c)),
            light: ['#4316d9', '#0369a1', '#c0136a'].map(c => new THREE.Color(c)),
        };
        const tmp = new THREE.Color();

        for (let i = 0; i < COUNT; i++) {
            shade[i] = (Math.random() - 0.5) * 0.15;
            phase[i] = shapes.core[i * 3 + 1] * 1.8;
            speed[i] = 0.018 + Math.random() * 0.035;
        }

        function paintParticles(theme) {
            const p = palettes[theme];
            for (let i = 0; i < COUNT; i++) {
                const f = i / COUNT;
                if (f < 0.5) tmp.copy(p[0]).lerp(p[1], f * 2);
                else tmp.copy(p[1]).lerp(p[2], (f - 0.5) * 2);
                tmp.offsetHSL(0, 0, shade[i]);
                colors.set([tmp.r, tmp.g, tmp.b], i * 3);
            }
        }
        paintParticles(currentTheme());

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const sprite = (() => {
            const c = document.createElement('canvas');
            c.width = c.height = 64;
            const ctx = c.getContext('2d');
            const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 64, 64);
            return new THREE.CanvasTexture(c);
        })();

        const pointsMat = new THREE.PointsMaterial({
            size: isMobile ? 0.065 : 0.055,
            map: sprite,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        });

        const outer = new THREE.Group();
        const spinner = new THREE.Group();
        outer.add(spinner);
        scene.add(outer);
        spinner.add(new THREE.Points(geo, pointsMat));

        // ---- Neural core: nodes + synapses inside the sphere ----
        const neural = new THREE.Group();
        const nodeCount = isMobile ? 45 : 75;
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            const v = new THREE.Vector3().randomDirection().multiplyScalar(0.4 + Math.random() * 1.35);
            nodes.push(v);
        }
        const linePts = [];
        for (let i = 0; i < nodeCount; i++) {
            for (let j = i + 1; j < nodeCount; j++) {
                if (nodes[i].distanceTo(nodes[j]) < 0.85) linePts.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
            }
        }
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
        neural.add(new THREE.LineSegments(lineGeo, lineMat));

        const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
        const nodeMat = new THREE.PointsMaterial({ size: 0.13, map: sprite, color: 0x22d3ee, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
        neural.add(new THREE.Points(nodeGeo, nodeMat));
        spinner.add(neural);

        // ---- Orbit rings ----
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.007, 8, 220), ringMat);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.005, 8, 220), ringMat.clone());
        ring2.material.color.set(0xf472b6);
        ring1.rotation.x = Math.PI / 2.4;
        ring2.rotation.x = Math.PI / 1.8;
        ring2.rotation.y = 0.5;
        outer.add(ring1, ring2);

        // ---- Distant star dust for depth ----
        const dustCount = isMobile ? 400 : 900;
        const dust = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
            dust.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, -Math.random() * 25 - 3], i * 3);
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
        const dustPoints = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.06, map: sprite, color: 0x9aa3ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
        scene.add(dustPoints);

        // Additive glow vanishes on a light background, so switch to normal blending + deeper colours
        let lightMode = false;
        const basePointSize = pointsMat.size;
        function applySceneTheme(theme) {
            const light = theme === 'light';
            lightMode = light;
            paintParticles(theme);
            geo.attributes.color.needsUpdate = true;
            const blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
            [pointsMat, lineMat, nodeMat, ring1.material, ring2.material, dustPoints.material].forEach(m => {
                m.blending = blending;
                m.needsUpdate = true;
            });
            scene.fog.color.set(light ? 0xf5f6fb : 0x05060f);
            scene.fog.density = light ? 0.018 : 0.055;
            pointsMat.size = basePointSize * (light ? 1.55 : 1);
            nodeMat.size = light ? 0.17 : 0.13;
            lineMat.color.set(light ? 0x4316d9 : 0x7c5cff);
            nodeMat.color.set(light ? 0x0369a1 : 0x22d3ee);
            ring1.material.color.set(light ? 0x0369a1 : 0x22d3ee);
            ring2.material.color.set(light ? 0xc0136a : 0xf472b6);
            dustPoints.material.color.set(light ? 0x5b21b6 : 0x9aa3ff);
            dustPoints.material.opacity = light ? 0.55 : 0.5;
            renderer.render(scene, camera);
        }
        applySceneTheme(currentTheme());
        document.addEventListener('themechange', e => applySceneTheme(e.detail));

        // ---- Interaction ----
        const mouse = { x: 0, y: 0 };
        window.addEventListener('pointermove', e => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
        }, { passive: true });

        // Click empty space to send a shockwave through the particles
        window.addEventListener('pointerdown', e => {
            if (e.target.closest('a, button, input, textarea, label, .glass')) return;
            for (let i = 0; i < COUNT * 3; i++) current[i] *= 1.35 + Math.random() * 0.5;
        });

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // ---- Render loop ----
        const clock = new THREE.Clock();
        const lerp = (a, b, t) => a + (b - a) * t;
        let spinBoost = 0;
        let neuralLevel = 1;

        function tick() {
            const t = clock.getElapsedTime();
            const target = shapes[activeScene] || shapes.core;
            const cfg = configs[activeScene] || configs.core;

            if (activeScene === 'wave') {
                for (let i = 0; i < COUNT; i++) {
                    const x = target[i * 3], z = target[i * 3 + 2];
                    target[i * 3 + 1] = Math.sin(x * 0.9 + t * 1.2) * 0.35 + Math.cos(z * 0.8 + t) * 0.35;
                }
            }

            const breathe = activeScene === 'core' ? 0.05 : 0.015;
            for (let i = 0; i < COUNT; i++) {
                const k = i * 3;
                const s = reduceMotion ? 1 : speed[i];
                current[k] += (target[k] - current[k]) * s;
                current[k + 1] += (target[k + 1] - current[k + 1]) * s;
                current[k + 2] += (target[k + 2] - current[k + 2]) * s;
                const w = 1 + Math.sin(t * 1.6 + phase[i]) * breathe;
                positions[k] = current[k] * w;
                positions[k + 1] = current[k + 1] * w;
                positions[k + 2] = current[k + 2] * w;
            }
            geo.attributes.position.needsUpdate = true;

            outer.position.x = lerp(outer.position.x, cfg.x, 0.04);
            outer.position.y = lerp(outer.position.y, cfg.y - window.scrollY * 0.0004, 0.04);
            outer.scale.setScalar(lerp(outer.scale.x, cfg.scale, 0.04));
            outer.rotation.x = lerp(outer.rotation.x, cfg.rx + mouse.y * 0.15, 0.04);
            outer.rotation.z = lerp(outer.rotation.z, cfg.rz, 0.04);

            spinBoost = lerp(spinBoost, Math.min(Math.abs(scrollVelocity) * 0.004, 0.08), 0.1);
            scrollVelocity *= 0.9;
            if (!reduceMotion) {
                spinner.rotation.y += 0.0025 + spinBoost;
                neural.rotation.x += 0.0015;
                ring1.rotation.z += 0.003;
                ring2.rotation.z -= 0.002;
                dustPoints.rotation.y = t * 0.01;
            }

            const boost = lightMode ? 1.6 : 1;
            pointsMat.opacity = lerp(pointsMat.opacity, Math.min(cfg.opacity * boost, 1), 0.05);
            neuralLevel = lerp(neuralLevel, cfg.neural, 0.05);
            lineMat.opacity = (lightMode ? 0.55 : 0.3) * neuralLevel;
            nodeMat.opacity = neuralLevel * (0.7 + Math.sin(t * 3) * 0.3);
            ring1.material.opacity = (lightMode ? 0.6 : 0.35) * neuralLevel;
            ring2.material.opacity = (lightMode ? 0.5 : 0.25) * neuralLevel;

            camera.position.x = lerp(camera.position.x, mouse.x * 0.6, 0.03);
            camera.position.y = lerp(camera.position.y, -mouse.y * 0.4, 0.03);
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        }
        tick();
    }
})();
