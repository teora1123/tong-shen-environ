/* ============================================
   江苏同申环境科技有限公司 - 交互逻辑 v3
   性能优化版：rAF节流、IntersectionObserver、
   CSS动画暂停、iframe延迟加载、零强制回流
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

    var homeWrap = document.querySelector('.home-wrap');

    // ===== 辅助：无回流动画重启 (替代 offsetHeight hack) =====
    function restartAnimation(el, animName) {
        el.style.animation = 'none';
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                el.style.animation = animName;
            });
        });
    }

    // ===== 辅助：rAF 节流包装 =====
    function rafThrottle(fn) {
        var ticking = false;
        return function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(function () {
                    fn();
                    ticking = false;
                });
            }
        };
    }

    // ===== 模块级 scrollToSlide 引用 (供 nav-dots 等外部调用) =====
    var scrollToSlide = null;

    // ===== Hero 背景轮播 =====
    var heroDots = document.getElementById('heroDots');
    var slideInterval;
    var currentSlide = 0;

    if (heroDots) {
        var bgLayers = document.querySelectorAll('.hero-bg-layer');
        var dots = heroDots.querySelectorAll('.hero-dot');
        var heroTitle = document.getElementById('heroTitle');
        var heroEnglish = document.getElementById('heroEnglish');
        var heroContent = document.getElementById('heroContent');

        var slideTexts = [
            { cn: '用科技创造<br>绿色未来', en: 'Create a Green Future with Technology' },
            { cn: '更清洁的能源<br>更聪明的用能', en: 'Cleaner Energy,<br>Smarter Usage' },
            { cn: '让发展与自然<br>和谐共生', en: 'Progress in Harmony<br>with Nature' }
        ];

        function goToSlide(index) {
            bgLayers.forEach(function (layer, i) {
                layer.classList.toggle('active', i === index);
            });
            dots.forEach(function (dot, i) {
                dot.classList.toggle('active', i === index);
            });

            if (heroTitle && heroEnglish) {
                heroTitle.innerHTML = slideTexts[index].cn;
                heroEnglish.innerHTML = slideTexts[index].en;
            }

            currentSlide = index;

            // 重播文字切入动画 — 零强制回流版 (双rAF)
            if (heroContent) {
                restartAnimation(heroContent, 'slideInLeft 1s ease');
            }
        }

        function nextSlide() {
            goToSlide((currentSlide + 1) % 3);
        }

        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                var idx = parseInt(dot.getAttribute('data-index'));
                goToSlide(idx);
                resetTimer();
            });
        });

        function startTimer() {
            slideInterval = setInterval(nextSlide, 5000);
        }
        function resetTimer() {
            clearInterval(slideInterval);
            startTimer();
        }
        startTimer();
    }

    // ===== 丝滑全屏滚动 (优化版) =====
    if (homeWrap) {
        var slides = homeWrap.querySelectorAll('.fullscreen');
        var currentIdx = 0;
        var isScrolling = false;
        var wheelAccum = 0;
        var wheelRAF = null;

        // 元素引用缓存
        var svcTabs = document.querySelectorAll('.tab3');
        var svcNavItems = document.querySelectorAll('#svcTabs li');
        var contactMap = document.getElementById('contactMap');
        var contactInfo = document.getElementById('contactInfo');
        var aboutText = document.getElementById('aboutText');
        var aboutImage = document.getElementById('aboutImage');
        var caseCards = document.querySelectorAll('.case-card');
        var servicesSlide = document.querySelector('.services-slide');

        // ---- 动画状态管理 ----
        function resetAnimState(idx) {
            if (idx === 1 && aboutText && aboutImage) {
                aboutText.classList.remove('visible');
                aboutImage.classList.remove('visible');
            }
            if (idx === 3 && caseCards.length) {
                caseCards.forEach(function (card) { card.classList.remove('visible'); });
            }
            if (idx === 2) {
                svcTabs.forEach(function (tab) { tab.classList.remove('open'); });
                if (svcTabs[0]) svcTabs[0].classList.add('open');
                svcNavItems.forEach(function (nav) { nav.classList.remove('on'); });
                if (svcNavItems[0]) svcNavItems[0].classList.add('on');
            }
            if (idx === 4 && contactMap && contactInfo) {
                contactMap.classList.remove('visible');
                contactInfo.classList.remove('visible');
            }
        }

        function enterAnimState(idx) {
            if (idx === 1 && aboutText && aboutImage) {
                setTimeout(function () {
                    aboutText.classList.add('visible');
                    aboutImage.classList.add('visible');
                }, 100);
            }
            if (idx === 3 && caseCards.length) {
                setTimeout(function () {
                    caseCards.forEach(function (card) { card.classList.add('visible'); });
                }, 100);
            }
            if (idx === 2) {
                setTimeout(function () {
                    svcTabs.forEach(function (tab) { tab.classList.remove('open'); });
                    if (svcTabs[0]) svcTabs[0].classList.add('open');
                    svcNavItems.forEach(function (nav) { nav.classList.remove('on'); });
                    if (svcNavItems[0]) svcNavItems[0].classList.add('on');
                }, 100);
            }
            if (idx === 4 && contactMap && contactInfo) {
                setTimeout(function () {
                    contactMap.classList.add('visible');
                    contactInfo.classList.add('visible');
                }, 100);
            }
        }

        // ---- 暂停/恢复服务区 CSS 动画 ----
        function setServicesAnimPaused(paused) {
            if (!servicesSlide) return;
            if (paused) {
                servicesSlide.classList.add('anim-paused');
            } else {
                servicesSlide.classList.remove('anim-paused');
            }
        }

        // ---- 延迟加载高德地图 iframe ----
        var mapIframe = document.querySelector('#contactMap iframe');
        var mapPlaceholder = document.getElementById('mapPlaceholder');
        var mapIframeLoaded = false;
        function loadMapIframe() {
            if (mapIframeLoaded || !mapIframe) return;
            mapIframeLoaded = true;
            var src = mapIframe.getAttribute('data-src');
            if (src) {
                mapIframe.setAttribute('src', src);
                // iframe 加载完成后隐藏占位层
                mapIframe.addEventListener('load', function () {
                    if (mapPlaceholder) {
                        mapPlaceholder.style.display = 'none';
                    }
                });
            }
        }

        // ---- 核心：滚动到指定 slide ----
        scrollToSlide = function (index) {
            if (index < 0 || index >= slides.length || isScrolling) return;

            // 离开当前屏 → 重置动画状态
            resetAnimState(currentIdx);

            // 服务区光环动画：离开暂停，进入恢复
            if (currentIdx === 2 && index !== 2) setServicesAnimPaused(true);
            if (index === 2 && currentIdx !== 2) setServicesAnimPaused(false);

            // 进入联系我们屏 → 延迟加载地图 iframe
            if (index === 4) loadMapIframe();

            isScrolling = true;
            currentIdx = index;

            // 更新右侧导航点激活状态
            var navDotsEl3 = document.getElementById('navDots');
            if (navDotsEl3) {
                var allDots = navDotsEl3.querySelectorAll('.nav-dot');
                allDots.forEach(function (d, i) { d.classList.toggle('active', i === index); });
            }

            slides[index].scrollIntoView({ behavior: 'smooth' });

            // 进入新屏 → 触发切入动画
            enterAnimState(index);

            setTimeout(function () { isScrolling = false; }, 600);
        };

        // ---- 滚轮事件：累积+RAF节流 ----
        homeWrap.addEventListener('wheel', function (e) {
            e.preventDefault();
            if (isScrolling) return;

            wheelAccum += e.deltaY;
            if (Math.abs(wheelAccum) < 40) return;

            if (!wheelRAF) {
                wheelRAF = requestAnimationFrame(function () {
                    if (wheelAccum > 0) scrollToSlide(currentIdx + 1);
                    else scrollToSlide(currentIdx - 1);
                    wheelAccum = 0;
                    wheelRAF = null;
                });
            }
        }, { passive: false });

        // ---- 触摸滑动 (passive 优化) ----
        var touchStartY = 0;
        homeWrap.addEventListener('touchstart', function (e) {
            if (isScrolling) return;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        homeWrap.addEventListener('touchend', function (e) {
            if (isScrolling) return;
            var diff = touchStartY - e.changedTouches[0].clientY;
            if (Math.abs(diff) > 40) {
                if (diff > 0) scrollToSlide(currentIdx + 1);
                else scrollToSlide(currentIdx - 1);
            }
        }, { passive: true });

        // ---- 键盘导航 ----
        document.addEventListener('keydown', function (e) {
            if (isScrolling || !homeWrap) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); scrollToSlide(currentIdx + 1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); scrollToSlide(currentIdx - 1); }
        });

        // ---- 初始状态：服务区光环动画默认暂停 (不在视口中) ----
        setServicesAnimPaused(true);
    }

    // ===== 导航栏滚动变色 (rAF 节流) =====
    var navbar = document.getElementById('navbar');

    if (navbar) {
        if (homeWrap) {
            var updateNavbar = rafThrottle(function () {
                if (homeWrap.scrollTop > 60) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
            homeWrap.addEventListener('scroll', updateNavbar, { passive: true });
        }
    }

    // ===== 移动端菜单 =====
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function () {
            navLinks.classList.toggle('active');
            var spans = navToggle.querySelectorAll('span');
            if (navLinks.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity = '';
                spans[2].style.transform = '';
            }
        });

        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                navLinks.classList.remove('active');
                var spans = navToggle.querySelectorAll('span');
                spans[0].style.transform = '';
                spans[1].style.opacity = '';
                spans[2].style.transform = '';
            });
        });
    }

    // ===== 右侧导航点交互 (rAF 节流滚动更新) =====
    var navDotsEl = document.getElementById('navDots');
    if (navDotsEl && homeWrap) {
        var navDotItems = navDotsEl.querySelectorAll('.nav-dot');

        // 点击导航点 → 跳转
        navDotItems.forEach(function (dot) {
            dot.addEventListener('click', function () {
                var index = parseInt(dot.getAttribute('data-slide'));
                if (typeof scrollToSlide === 'function') {
                    scrollToSlide(index);
                }
            });
        });

        // 滚动时更新激活点 (rAF 节流)
        var updateNavDots = rafThrottle(function () {
            var scrollTop = homeWrap.scrollTop;
            var height = homeWrap.clientHeight;
            if (height <= 0) return;
            var activeIndex = Math.round(scrollTop / height);

            navDotItems.forEach(function (dot, i) {
                if (i === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        });
        homeWrap.addEventListener('scroll', updateNavDots, { passive: true });
    }

    // ===== 服务领域 Tab 切换 =====
    var svcNavItems2 = document.querySelectorAll('#svcTabs li');
    var svcTabs2 = document.querySelectorAll('.tab3');
    if (svcNavItems2.length && svcTabs2.length) {
        svcNavItems2.forEach(function (li, index) {
            li.addEventListener('click', function () {
                svcTabs2.forEach(function (tab) { tab.classList.remove('open'); });
                svcNavItems2.forEach(function (nav) { nav.classList.remove('on'); });
                if (svcTabs2[index]) svcTabs2[index].classList.add('open');
                li.classList.add('on');
            });
        });
    }

    // ===== 联系表单验证 =====
    var contactForm = document.getElementById('contactForm');
    var formSuccess = document.getElementById('formSuccess');
    var messageForm = document.getElementById('messageForm');

    if (messageForm) {
        messageForm.addEventListener('submit', function (e) {
            e.preventDefault();

            var groups = messageForm.querySelectorAll('.form-group');
            groups.forEach(function (g) { g.classList.remove('error'); });

            var hasError = false;

            var name = document.getElementById('name');
            if (!name.value.trim()) {
                name.closest('.form-group').classList.add('error');
                hasError = true;
            }

            var email = document.getElementById('email');
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
                email.closest('.form-group').classList.add('error');
                hasError = true;
            }

            var msg = document.getElementById('message');
            if (!msg.value.trim()) {
                msg.closest('.form-group').classList.add('error');
                hasError = true;
            }

            if (hasError) return;

            contactForm.style.display = 'none';
            formSuccess.style.display = 'block';
        });
    }

});
