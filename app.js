(() => {
    'use strict';

    // ── Image Data ──────────────────────────
    const artworks = {
        full: Array.from({ length: 12 }, (_, i) => ({
            src: `assets/images/full/full_${String(i + 1).padStart(2, '0')}.jpg`,
            title: `Полноценка ${i + 1}`,
            category: 'full',
        })),
        characters: Array.from({ length: 7 }, (_, i) => ({
            src: `assets/images/characters/characters_${String(i + 1).padStart(2, '0')}.jpg`,
            title: `Персонаж ${i + 1}`,
            category: 'characters',
        })),
        sketches: Array.from({ length: 10 }, (_, i) => ({
            src: `assets/images/sketches/sketches_${String(i + 1).padStart(2, '0')}.jpg`,
            title: `Скетч ${i + 1}`,
            category: 'sketches',
        })),
    };

    // Flatten all works
    const allWorks = [...artworks.full, ...artworks.sketches, ...artworks.characters];

    // ── DOM References ──────────────────────
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    const cursor = $('#cursor');
    const cursorFollower = $('#cursor-follower');
    const loader = $('#loader');
    const nav = $('#nav');
    const navBurger = $('#nav-burger');
    const mobileMenu = $('#mobile-menu');
    const themeToggle = $('#theme-toggle');
    const galleryGrid = $('#gallery-grid');
    const lightbox = $('#lightbox');
    const lightboxImg = $('#lightbox-img');
    const lightboxCounter = $('#lightbox-counter');

    // ── State ───────────────────────────────
    let currentFilter = 'all';
    let currentLightboxIndex = 0;
    let filteredWorks = allWorks;
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;

    // ── Loader ──────────────────────────────
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.classList.add('hidden');
            initAnimations();
        }, 1200);
    });

    // ── Custom Cursor ───────────────────────
    if (window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            followerX += (mouseX - followerX) * 0.08;
            followerY += (mouseY - followerY) * 0.08;

            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';
            cursorFollower.style.left = followerX + 'px';
            cursorFollower.style.top = followerY + 'px';

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover states
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('a, button, .gallery-item, .filter-btn');
            if (target) {
                cursor.classList.add('hovering');
                cursorFollower.classList.add('hovering');
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('a, button, .gallery-item, .filter-btn');
            if (target) {
                cursor.classList.remove('hovering');
                cursorFollower.classList.remove('hovering');
            }
        });
    }

    // ── Magnetic Buttons ────────────────────
    $$('.magnetic').forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });

    // ── Theme Toggle ────────────────────────
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }

    themeToggle.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });

    // ── Navigation ──────────────────────────
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        nav.classList.toggle('scrolled', scrollY > 80);
        lastScroll = scrollY;
    }, { passive: true });

    // Mobile menu
    navBurger.addEventListener('click', () => {
        navBurger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    $$('.mobile-link').forEach((link) => {
        link.addEventListener('click', () => {
            navBurger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ── Gallery ─────────────────────────────
    // Preload all images on startup so columns never reflow
    const imageCache = new Map();
    function preloadImages(works) {
        return Promise.all(works.map(work => {
            if (imageCache.has(work.src)) return imageCache.get(work.src);
            const p = new Promise(resolve => {
                const img = new Image();
                img.onload = img.onerror = () => resolve();
                img.src = work.src;
            });
            imageCache.set(work.src, p);
            return p;
        }));
    }

    // Reorder array so column-fill order looks like row order
    function reorderForColumns(arr, cols) {
        const rows = Math.ceil(arr.length / cols);
        const reordered = [];
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const idx = row * cols + col;
                if (idx < arr.length) reordered.push(arr[idx]);
            }
        }
        return reordered;
    }

    function getColumnCount() {
        if (window.innerWidth <= 540) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
    }

    function buildGallery(filter) {
        filteredWorks = filter === 'all' ? allWorks : (artworks[filter] || []);
        galleryGrid.style.opacity = '0';
        galleryGrid.innerHTML = '';

        const cols = getColumnCount();
        const displayOrder = reorderForColumns(filteredWorks, cols);

        preloadImages(filteredWorks).then(() => {
            galleryGrid.innerHTML = '';
            displayOrder.forEach((work) => {
                const realIdx = filteredWorks.indexOf(work);
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.setAttribute('data-category', work.category);
                item.innerHTML = `
                    <img src="${work.src}" alt="${work.title}" decoding="sync">
                    <div class="gallery-item-overlay">
                        <span class="gallery-item-title">${work.title}</span>
                    </div>
                `;
                item.addEventListener('click', () => openLightbox(realIdx));
                galleryGrid.appendChild(item);
            });
            galleryGrid.style.opacity = '1';
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        });
    }

    const cssEase = 'cubic-bezier(0.16, 1, 0.3, 1)';

    // Filter buttons
    $$('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            $$('.filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            buildGallery(currentFilter);
        });
    });

    // Preload all images, then build gallery
    preloadImages(allWorks).then(() => buildGallery('all'));

    // ── Lightbox ────────────────────────────
    function openLightbox(index) {
        currentLightboxIndex = index;
        updateLightbox();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateLightbox() {
        const work = filteredWorks[currentLightboxIndex];
        if (!work) return;
        lightboxImg.src = work.src;
        lightboxImg.alt = work.title;
        lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${filteredWorks.length}`;
    }

    function prevImage() {
        currentLightboxIndex = (currentLightboxIndex - 1 + filteredWorks.length) % filteredWorks.length;
        updateLightbox();
    }

    function nextImage() {
        currentLightboxIndex = (currentLightboxIndex + 1) % filteredWorks.length;
        updateLightbox();
    }

    $('.lightbox-close').addEventListener('click', closeLightbox);
    $('.lightbox-prev').addEventListener('click', prevImage);
    $('.lightbox-next').addEventListener('click', nextImage);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === $('.lightbox-content')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
    });

    // Touch swipe for lightbox
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? prevImage() : nextImage();
        }
    }, { passive: true });

    // ── Scroll Animations (GSAP) ────────────
    function initAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // Reveal up elements
        $$('.reveal-up').forEach((el) => {
            ScrollTrigger.create({
                trigger: el,
                start: 'top 90%',
                once: true,
                onEnter: () => el.classList.add('revealed'),
            });
        });

        // Reveal images
        $$('.reveal-image').forEach((el) => {
            ScrollTrigger.create({
                trigger: el,
                start: 'top 85%',
                once: true,
                onEnter: () => el.classList.add('revealed'),
            });
        });

        // Hero parallax
        const heroContent = $('.hero-content');
        if (heroContent) {
            gsap.to(heroContent, {
                y: 100,
                opacity: 0.3,
                scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1,
                },
            });
        }

        // Parallax on project images
        $$('.project-image img').forEach((img) => {
            gsap.to(img, {
                y: -30,
                scrollTrigger: {
                    trigger: img.closest('.project-card'),
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1,
                },
            });
        });

        // Counter animation
        $$('.stat-number').forEach((el) => {
            const target = parseInt(el.dataset.count, 10);
            ScrollTrigger.create({
                trigger: el,
                start: 'top 90%',
                once: true,
                onEnter: () => {
                    gsap.to(el, {
                        duration: 2,
                        ease: 'power2.out',
                        innerText: target,
                        snap: { innerText: 1 },
                        onUpdate() {
                            el.textContent = Math.round(parseFloat(el.textContent)) + '+';
                        },
                    });
                },
            });
        });

        // Gradient orbs parallax
        $$('.gradient-orb').forEach((orb, i) => {
            gsap.to(orb, {
                y: (i + 1) * -80,
                scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1.5,
                },
            });
        });
    }

    // ── Smooth anchor scroll ────────────────
    $$('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

})();
