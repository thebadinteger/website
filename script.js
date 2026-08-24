(function() {
    var canvas = document.getElementById('life-canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var CELL_SIZE = 8;
    var cols = 0;
    var rows = 0;
    var grid = null;
    var nextGrid = null;
    var isDrawing = false;

    var requestAnimFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) { return window.setTimeout(callback, 16); };

    function createNoise2D(seed) {
        var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        var p = new Array(256);
        for (var i = 0; i < 256; i++) p[i] = i;
        var s = ((seed || new Date().getTime()) ^ 0xdeadbeef) % 2147483647;
        if (s <= 0) s += 2147483646;
        for (var j = 255; j > 0; j--) {
            s = (s * 16807) % 2147483647;
            var k = Math.floor((s / 2147483647) * (j + 1));
            var temp = p[j];
            p[j] = p[k];
            p[k] = temp;
        }
        var perm = new Array(512);
        var gradP = new Array(1024);
        var grad2 = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];
        for (var l = 0; l < 512; l++) {
            perm[l] = p[l & 255];
            var g = grad2[perm[l] % 8];
            gradP[l * 2] = g[0];
            gradP[l * 2 + 1] = g[1];
        }

        return function(xin, yin) {
            var n0 = 0, n1 = 0, n2 = 0;
            var s = (xin + yin) * F2;
            var i = Math.floor(xin + s);
            var j = Math.floor(yin + s);
            var t = (i + j) * G2;
            var X0 = i - t;
            var Y0 = j - t;
            var x0 = xin - X0;
            var y0 = yin - Y0;

            var i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }

            var x1 = x0 - i1 + G2;
            var y1 = y0 - j1 + G2;
            var x2 = x0 - 1.0 + 2.0 * G2;
            var y2 = y0 - 1.0 + 2.0 * G2;

            var ii = i & 255;
            var jj = j & 255;

            var t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 > 0) {
                t0 *= t0;
                var gi0 = perm[ii + perm[jj]];
                n0 = t0 * t0 * (gradP[gi0 * 2] * x0 + gradP[gi0 * 2 + 1] * y0);
            }

            var t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 > 0) {
                t1 *= t1;
                var gi1 = perm[ii + i1 + perm[jj + j1]];
                n1 = t1 * t1 * (gradP[gi1 * 2] * x1 + gradP[gi1 * 2 + 1] * y1);
            }

            var t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 > 0) {
                t2 *= t2;
                var gi2 = perm[ii + 1 + perm[jj + 1]];
                n2 = t2 * t2 * (gradP[gi2 * 2] * x2 + gradP[gi2 * 2 + 1] * y2);
            }

            return 70.0 * (n0 + n1 + n2);
        };
    }

    function createArray(size) {
        if (typeof Uint8Array !== 'undefined') {
            return new Uint8Array(size);
        }
        var arr = new Array(size);
        for (var i = 0; i < size; i++) arr[i] = 0;
        return arr;
    }

    function initGrid() {
        var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 800;
        var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 600;
        cols = Math.ceil(w / CELL_SIZE);
        rows = Math.ceil(h / CELL_SIZE);
        canvas.width = w;
        canvas.height = h;

        var total = cols * rows;
        grid = createArray(total);
        nextGrid = createArray(total);

        var noise = createNoise2D(new Date().getTime());
        var scale1 = 0.035;
        var scale2 = 0.09;

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var n1 = noise(x * scale1, y * scale1);
                var n2 = noise(x * scale2 + 33.7, y * scale2 + 77.3);
                var val = n1 * 0.65 + n2 * 0.35;
                var inBand = (val > 0.12 && val < 0.34) || (val > -0.32 && val < -0.18);
                if (inBand && Math.random() < 0.42) {
                    grid[y * cols + x] = 2;
                } else {
                    grid[y * cols + x] = 0;
                }
            }
        }
    }

    function countAliveNeighbors(x, y) {
        var sum = 0;
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                var nx = (x + i + cols) % cols;
                var ny = (y + j + rows) % rows;
                if (grid[ny * cols + nx] === 2) {
                    sum++;
                }
            }
        }
        return sum;
    }

    function updateGameOfLife() {
        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var idx = y * cols + x;
                var state = grid[idx];
                var neighbors = countAliveNeighbors(x, y);

                if (state === 2) {
                    if (neighbors === 2 || neighbors === 3) {
                        nextGrid[idx] = 2;
                    } else {
                        nextGrid[idx] = 1;
                    }
                } else {
                    if (neighbors === 3) {
                        nextGrid[idx] = 2;
                    } else {
                        nextGrid[idx] = 0;
                    }
                }
            }
        }

        var temp = grid;
        grid = nextGrid;
        nextGrid = temp;
    }

    function drawLife() {
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var state = grid[y * cols + x];
                if (state === 2) {
                    ctx.fillStyle = "#345c2a";
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                } else if (state === 1) {
                    ctx.fillStyle = "#152a12";
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }

    function draw2x2(clientX, clientY) {
        var startX = Math.floor(clientX / CELL_SIZE);
        var startY = Math.floor(clientY / CELL_SIZE);

        for (var dy = 0; dy < 2; dy++) {
            for (var dx = 0; dx < 2; dx++) {
                var x = (startX + dx + cols) % cols;
                var y = (startY + dy + rows) % rows;
                grid[y * cols + x] = 2;
            }
        }
    }

    function isInteractiveTarget(target) {
        var el = target;
        while (el && el !== document.body && el !== document.documentElement) {
            var tag = (el.tagName || '').toLowerCase();
            if (tag === 'a' || tag === 'button' || tag === 'input' || tag === 'textarea') return true;
            var cls = el.className || '';
            if (typeof cls === 'string' && (cls.indexOf('crypto-item') !== -1 || cls.indexOf('lang-switch') !== -1 || cls.indexOf('thnx') !== -1)) return true;
            el = el.parentNode;
        }
        return false;
    }

    function onPointerDown(e) {
        if (isInteractiveTarget(e.target || e.srcElement)) return;
        isDrawing = true;
        var cx = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
        var cy = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
        draw2x2(cx, cy);
    }

    function onPointerMove(e) {
        if (isDrawing) {
            var cx = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
            var cy = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
            draw2x2(cx, cy);
        }
    }

    function onPointerUp() {
        isDrawing = false;
    }

    if (window.PointerEvent) {
        window.addEventListener('pointerdown', onPointerDown, false);
        window.addEventListener('pointermove', onPointerMove, false);
        window.addEventListener('pointerup', onPointerUp, false);
        window.addEventListener('pointercancel', onPointerUp, false);
    } else {
        window.addEventListener('mousedown', onPointerDown, false);
        window.addEventListener('mousemove', onPointerMove, false);
        window.addEventListener('mouseup', onPointerUp, false);
        window.addEventListener('touchstart', onPointerDown, false);
        window.addEventListener('touchmove', onPointerMove, false);
        window.addEventListener('touchend', onPointerUp, false);
    }

    var lastUpdate = 0;
    var UPDATE_INTERVAL = 70;

    function animate(now) {
        requestAnimFrame(animate);
        var current = now || new Date().getTime();
        if (current - lastUpdate > UPDATE_INTERVAL) {
            updateGameOfLife();
            lastUpdate = current;
        }
        drawLife();
    }

    window.addEventListener('resize', initGrid, false);
    window.addEventListener('orientationchange', initGrid, false);

    initGrid();
    requestAnimFrame(animate);

    var titleText = "badinteger";
    var typedTextElement = document.getElementById('typed-text');
    var charIndex = 0;
    var typingSpeed = 100;
    var startDelay = 350;

    function typeTitle() {
        if (typedTextElement && charIndex < titleText.length) {
            typedTextElement.appendChild(document.createTextNode(titleText.charAt(charIndex)));
            charIndex++;
            setTimeout(typeTitle, typingSpeed);
        }
    }
    setTimeout(typeTitle, startDelay);

    var translations = {
        en: {
            bioTitle: "hi.",
            bioDesc: 'i\'m <strong class="highlight">a reverse engineer</strong>, interested in IoT devices.<br>love all kinds of unusual gadgets.<br>from ukraine.<br><strong class="highlight">languages: Go, Nim, Python</strong>',
            support: "support",
            copyHint: "[copy]",
            copiedHint: "[copied!]"
        },
        ru: {
            bioTitle: "привет.",
            bioDesc: 'я <strong class="highlight">реверс-инженер</strong>, интересуюсь IoT девайсами.<br>люблю всякие необычные гаджеты.<br>из украины.<br><strong class="highlight">языки: Go, Nim, Python</strong>',
            support: "поддержать",
            copyHint: "[копировать]",
            copiedHint: "[скопировано!]"
        }
    };

    var currentLang = 'en';
    var langButtons = document.querySelectorAll('.lang-btn');
    var bioTitle = document.getElementById('bio-title');
    var bioDesc = document.getElementById('bio-desc');
    var supportLabel = document.getElementById('support-label');
    var mainContainer = document.querySelector('.container');

    function setLanguage(lang) {
        if (!translations[lang]) return;
        currentLang = lang;
        document.documentElement.setAttribute('lang', lang);

        if (bioTitle) {
            bioTitle.innerHTML = '';
            bioTitle.appendChild(document.createTextNode(translations[lang].bioTitle));
        }
        if (bioDesc) {
            bioDesc.innerHTML = translations[lang].bioDesc;
        }
        if (supportLabel) {
            supportLabel.innerHTML = '';
            supportLabel.appendChild(document.createTextNode(translations[lang].support));
        }

        var hints = document.querySelectorAll('[data-copy-hint]');
        for (var h = 0; h < hints.length; h++) {
            if (!hints[h].getAttribute('data-copied')) {
                hints[h].innerHTML = '';
                hints[h].appendChild(document.createTextNode(translations[lang].copyHint));
            }
        }

        for (var b = 0; b < langButtons.length; b++) {
            var btn = langButtons[b];
            var btnLang = btn.getAttribute('data-lang');
            if (btnLang === lang) {
                if (btn.className.indexOf('active') === -1) btn.className += ' active';
            } else {
                btn.className = btn.className.replace(/\bactive\b/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
            }
        }
    }

    for (var i = 0; i < langButtons.length; i++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                var lang = btn.getAttribute('data-lang');
                setLanguage(lang);
            }, false);
        })(langButtons[i]);
    }

    var supportWrapper = document.getElementById('support-wrapper');
    var supportToggle = document.getElementById('support-toggle');

    if (supportToggle && supportWrapper) {
        supportToggle.addEventListener('click', function(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var isOpen = supportWrapper.className.indexOf('open') !== -1;
            if (isOpen) {
                supportWrapper.className = supportWrapper.className.replace(/\bopen\b/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
                supportToggle.setAttribute('aria-expanded', 'false');
                if (mainContainer) {
                    mainContainer.className = mainContainer.className.replace(/\bsupport-open\b/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
                }
            } else {
                supportWrapper.className += ' open';
                supportToggle.setAttribute('aria-expanded', 'true');
                if (mainContainer && mainContainer.className.indexOf('support-open') === -1) {
                    mainContainer.className += ' support-open';
                }
            }
        }, false);
    }

    var thnxWrapper = document.getElementById('thnx-wrapper');
    var thnxToggle = document.getElementById('thnx-toggle');

    if (thnxToggle && thnxWrapper) {
        thnxToggle.addEventListener('click', function(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var isOpen = thnxWrapper.className.indexOf('open') !== -1;
            if (isOpen) {
                thnxWrapper.className = thnxWrapper.className.replace(/\bopen\b/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
                thnxToggle.setAttribute('aria-expanded', 'false');
            } else {
                thnxWrapper.className += ' open';
                thnxToggle.setAttribute('aria-expanded', 'true');
            }
        }, false);
    }

    function copyTextToClipboard(text, onSuccess) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess, function() {
                fallbackCopy(text, onSuccess);
            });
        } else {
            fallbackCopy(text, onSuccess);
        }
    }

    function fallbackCopy(text, onSuccess) {
        var textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            if (onSuccess) onSuccess();
        } catch (err) {}
        document.body.removeChild(textArea);
    }

    var cryptoItems = document.querySelectorAll('.crypto-item');
    for (var c = 0; c < cryptoItems.length; c++) {
        (function(item) {
            item.addEventListener('click', function() {
                var address = item.getAttribute('data-address');
                if (!address) return;
                copyTextToClipboard(address, function() {
                    var hint = item.querySelector('[data-copy-hint]');
                    if (hint) {
                        hint.setAttribute('data-copied', 'true');
                        hint.innerHTML = '';
                        hint.appendChild(document.createTextNode(translations[currentLang].copiedHint));
                        hint.style.color = '#ffffff';
                        hint.style.opacity = '1';

                        setTimeout(function() {
                            hint.removeAttribute('data-copied');
                            hint.innerHTML = '';
                            hint.appendChild(document.createTextNode(translations[currentLang].copyHint));
                            hint.style.color = '';
                            hint.style.opacity = '';
                        }, 1600);
                    }
                });
            }, false);
        })(cryptoItems[c]);
    }

    setLanguage('en');
})();
