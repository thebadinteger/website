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
        function(cb) { return window.setTimeout(cb, 16); };

    function noise2D(x, y) {
        var x0 = Math.floor(x), y0 = Math.floor(y);
        var fx = x - x0, fy = y - y0;
        fx = fx * fx * (3 - 2 * fx);
        fy = fy * fy * (3 - 2 * fy);
        function h(ix, iy) {
            var n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
            return (n - Math.floor(n)) * 2 - 1;
        }
        var t0 = h(x0, y0) * (1 - fx) + h(x0 + 1, y0) * fx;
        var t1 = h(x0, y0 + 1) * (1 - fx) + h(x0 + 1, y0 + 1) * fx;
        return t0 * (1 - fy) + t1 * fy;
    }

    function createArray(size) {
        if (typeof Uint8Array !== 'undefined') return new Uint8Array(size);
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

        var offsetX = Math.random() * 500;
        var offsetY = Math.random() * 500;

        for (var y = 0; y < rows; y++) {
            var rowOffset = y * cols;
            for (var x = 0; x < cols; x++) {
                var v = noise2D((x + offsetX) * 0.045, (y + offsetY) * 0.045) * 0.65 +
                        noise2D((x + offsetX) * 0.11 + 33, (y + offsetY) * 0.11 + 77) * 0.35;
                var inBand = (v > 0.12 && v < 0.34) || (v > -0.34 && v < -0.12);
                grid[rowOffset + x] = (inBand && Math.random() < 0.42) ? 2 : 0;
            }
        }
    }

    function updateGameOfLife() {
        for (var y = 0; y < rows; y++) {
            var up = (y === 0 ? rows - 1 : y - 1) * cols;
            var mid = y * cols;
            var down = (y === rows - 1 ? 0 : y + 1) * cols;

            for (var x = 0; x < cols; x++) {
                var left = x === 0 ? cols - 1 : x - 1;
                var right = x === cols - 1 ? 0 : x + 1;

                var neighbors = 0;
                if (grid[up + left] === 2) neighbors++;
                if (grid[up + x] === 2) neighbors++;
                if (grid[up + right] === 2) neighbors++;
                if (grid[mid + left] === 2) neighbors++;
                if (grid[mid + right] === 2) neighbors++;
                if (grid[down + left] === 2) neighbors++;
                if (grid[down + x] === 2) neighbors++;
                if (grid[down + right] === 2) neighbors++;

                var idx = mid + x;
                var state = grid[idx];
                if (state === 2) {
                    nextGrid[idx] = (neighbors === 2 || neighbors === 3) ? 2 : 1;
                } else {
                    nextGrid[idx] = (neighbors === 3) ? 2 : 0;
                }
            }
        }

        var temp = grid;
        grid = nextGrid;
        nextGrid = temp;
    }

    function drawLife() {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var currentStyle = '';
        for (var y = 0; y < rows; y++) {
            var rowOffset = y * cols;
            var py = y * CELL_SIZE;
            for (var x = 0; x < cols; x++) {
                var state = grid[rowOffset + x];
                if (state === 0) continue;
                var color = (state === 2) ? '#345c2a' : '#152a12';
                if (currentStyle !== color) {
                    ctx.fillStyle = color;
                    currentStyle = color;
                }
                ctx.fillRect(x * CELL_SIZE, py, CELL_SIZE, CELL_SIZE);
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

    function isInteractive(el) {
        while (el && el !== document.body && el !== document.documentElement) {
            var tag = (el.tagName || '').toLowerCase();
            if (tag === 'a' || tag === 'button' || tag === 'input' || tag === 'textarea') return true;
            var c = el.className || '';
            if (typeof c === 'string' && (c.indexOf('container') !== -1 || c.indexOf('lang-switch') !== -1 || c.indexOf('webring') !== -1 || c.indexOf('thnx') !== -1)) return true;
            el = el.parentNode;
        }
        return false;
    }

    function onPointerDown(e) {
        if (isInteractive(e.target || e.srcElement)) return;
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

    window.addEventListener('resize', function() {
        initGrid();
        syncAccordionHeight();
    }, false);

    window.addEventListener('orientationchange', function() {
        initGrid();
        syncAccordionHeight();
    }, false);

    initGrid();
    requestAnimFrame(animate);

    var titleText = 'badinteger';
    var typedTextElement = document.getElementById('typed-text');
    var charIndex = 0;

    function typeTitle() {
        if (typedTextElement && charIndex < titleText.length) {
            if ('textContent' in typedTextElement) {
                typedTextElement.textContent += titleText.charAt(charIndex);
            } else {
                typedTextElement.innerText += titleText.charAt(charIndex);
            }
            charIndex++;
            setTimeout(typeTitle, 100);
        }
    }
    setTimeout(typeTitle, 350);

    var translations = {
        en: {
            bioTitle: 'hi.',
            bioDesc: 'i\'m <strong class="highlight">a reverse engineer</strong>.<br>love all kinds of unusual gadgets.<br>from ukraine.<br><strong class="highlight">languages:</strong> Go, Nim, Python, Java, JS<br><strong class="highlight">ide:</strong> Zed',
            channel: 'channel',
            projects: 'projects',
            support: 'support',
            copyHint: '[copy]',
            copiedHint: '[copied!]'
        },
        ru: {
            bioTitle: 'привет.',
            bioDesc: 'я <strong class="highlight">реверс-инженер</strong>.<br>люблю всякие необычные гаджеты.<br>из украины.<br><strong class="highlight">языки:</strong> Go, Nim, Python, Java, JS<br><strong class="highlight">ide:</strong> Zed',
            channel: 'канал',
            projects: 'проекты',
            support: 'поддержать',
            copyHint: '[копировать]',
            copiedHint: '[скопировано!]'
        }
    };

    var defaultProjects = [
        {
            name: 'p2pwn',
            url: 'https://github.com/thebadinteger/p2pwn',
            desc: {
                en: 'Dahua cameras security scanner via P2P',
                ru: 'cканер безопасности камер Dahua через P2P'
            }
        },
        {
            name: 'bio',
            url: 'https://github.com/thebadinteger/thebadinteger',
            desc: {
                en: 'my bio',
                ru: 'мое био'
            }
        },
        {
            name: 'website',
            url: 'https://github.com/thebadinteger/website',
            desc: {
                en: 'my website',
                ru: 'мой вебсайт'
            }
        }
    ];

    var defaultSupport = [
        { name: 'gram', address: 'UQDhC6F5A6lHq3WMk80klpFoxfPlviY0URLN7MnfLXbfXJLn' },
        { name: 'solana', address: 'EBzxd3aD9AJJCiJihh45mPns22LBTFG1UUhGEQawaHC3' },
        { name: 'bitcoin', address: 'bc1q3hcddk5h7lk9gmyz4qevt4zdrae28wd0h9fc9k' },
        { name: 'litecoin', address: 'LNvCLwaYj91dwe1wWEHuQybgGu7N53fG1J' },
        { name: 'dogecoin', address: 'D6TasSMp86DWj7ovyzoroSdZFYt65pMNyC' },
        { name: 'tron', address: 'TSzSPDRZxyQy6w5US88ur5SCgcZgPubDzC' },
        { name: 'polygon', address: '0x48a1577525e1057923bb760d62b2b98e0caff4e4' }
    ];

    var projectsList = defaultProjects;
    var supportList = defaultSupport;

    function escapeHTML(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function loadJSON(url, fallback, callback) {
        try {
            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
                        try {
                            callback(JSON.parse(xhr.responseText));
                            return;
                        } catch (e) {}
                    }
                    callback(fallback);
                }
            };
            xhr.send(null);
        } catch (e) {
            callback(fallback);
        }
    }

    var currentLang = 'en';
    var activeTab = null;
    var langButtons = document.querySelectorAll('.lang-btn');
    var bioTitle = document.getElementById('bio-title');
    var bioDesc = document.getElementById('bio-desc');
    var channelLabel = document.getElementById('channel-label');
    var projectsLabel = document.getElementById('projects-label');
    var supportLabel = document.getElementById('support-label');
    var projectsContent = document.getElementById('projects-content');
    var supportContent = document.getElementById('support-content');
    var projectsPanel = document.getElementById('projects-panel');
    var supportPanel = document.getElementById('support-panel');
    var projectsToggle = document.getElementById('projects-toggle');
    var supportToggle = document.getElementById('support-toggle');
    var accordionContainer = document.getElementById('accordion-container');
    var mainContainer = document.querySelector('.container');
    var closeTimer = null;

    function renderProjects(lang) {
        if (!projectsContent) return;
        var html = '';
        for (var i = 0; i < projectsList.length; i++) {
            var p = projectsList[i];
            var displayUrl = (p.url || '').replace(/^https?:\/\//i, '');
            var desc = (p.desc && p.desc[lang]) || (p.desc && p.desc.en) || '';
            html += '<a href="' + escapeHTML(p.url) + '" target="_blank" rel="noopener noreferrer" class="project-item">' +
                '<div class="project-header">' +
                    '<span class="project-name">' + escapeHTML(p.name) + '</span>' +
                    '<span class="project-url">' + escapeHTML(displayUrl) + '</span>' +
                '</div>' +
                '<div class="project-desc">' + escapeHTML(desc) + '</div>' +
            '</a>';
        }
        projectsContent.innerHTML = html;
    }

    function renderSupport(lang) {
        if (!supportContent) return;
        var t = translations[lang] || translations.en;
        var html = '';
        for (var i = 0; i < supportList.length; i++) {
            var s = supportList[i];
            html += '<div class="crypto-item" data-address="' + escapeHTML(s.address) + '">' +
                '<div class="crypto-header">' +
                    '<span class="crypto-name">' + escapeHTML(s.name) + '</span>' +
                    '<span class="copy-hint" data-copy-hint="true">' + escapeHTML(t.copyHint) + '</span>' +
                '</div>' +
                '<code class="crypto-addr">' + escapeHTML(s.address) + '</code>' +
            '</div>';
        }
        supportContent.innerHTML = html;
    }

    if (supportContent) {
        supportContent.onclick = function(e) {
            var el = e.target || e.srcElement;
            while (el && el !== supportContent) {
                if (el.getAttribute && el.getAttribute('data-address')) break;
                el = el.parentNode;
            }
            if (!el || el === supportContent) return;
            var addr = el.getAttribute('data-address');
            copyTextToClipboard(addr, function() {
                var hint = el.querySelector('[data-copy-hint]');
                if (!hint) return;
                var t = translations[currentLang] || translations.en;
                hint.innerHTML = escapeHTML(t.copiedHint);
                hint.style.color = '#ffffff';
                hint.style.opacity = '1';
                setTimeout(function() {
                    hint.innerHTML = escapeHTML(t.copyHint);
                    hint.style.color = '';
                    hint.style.opacity = '';
                }, 1600);
            });
        };
    }

    function setLanguage(lang) {
        if (!translations[lang]) return;
        currentLang = lang;
        document.documentElement.setAttribute('lang', lang);

        var t = translations[lang];
        if (bioTitle) bioTitle.innerHTML = escapeHTML(t.bioTitle);
        if (bioDesc) bioDesc.innerHTML = t.bioDesc;
        if (channelLabel) channelLabel.innerHTML = escapeHTML(t.channel);
        if (projectsLabel) projectsLabel.innerHTML = escapeHTML(t.projects);
        if (supportLabel) supportLabel.innerHTML = escapeHTML(t.support);

        renderProjects(lang);
        renderSupport(lang);
        syncAccordionHeight();

        for (var i = 0; i < langButtons.length; i++) {
            var b = langButtons[i];
            b.className = b.getAttribute('data-lang') === lang ? 'lang-btn active' : 'lang-btn';
        }
    }

    for (var i = 0; i < langButtons.length; i++) {
        (function(btn) {
            btn.onclick = function() {
                setLanguage(btn.getAttribute('data-lang'));
            };
        })(langButtons[i]);
    }

    function updateContainerState() {
        if (mainContainer) {
            mainContainer.className = activeTab ? 'container support-open' : 'container';
        }
    }

    function syncAccordionHeight() {
        if (!accordionContainer) return;
        var p = activeTab === 'projects' ? projectsPanel : (activeTab === 'support' ? supportPanel : null);
        if (p) {
            accordionContainer.style.height = (p.offsetHeight + 8) + 'px';
        }
    }

    function closeTabs() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        var prev = activeTab;
        activeTab = null;
        if (projectsToggle) {
            projectsToggle.className = 'site-btn toggle-btn';
            projectsToggle.setAttribute('aria-expanded', 'false');
        }
        if (supportToggle) {
            supportToggle.className = 'site-btn toggle-btn';
            supportToggle.setAttribute('aria-expanded', 'false');
        }
        if (prev === 'projects' && projectsPanel) projectsPanel.className = 'accordion-dropdown closing';
        if (prev === 'support' && supportPanel) supportPanel.className = 'accordion-dropdown closing';
        if (accordionContainer) accordionContainer.style.height = '0px';
        updateContainerState();

        closeTimer = setTimeout(function() {
            if (projectsPanel) projectsPanel.className = 'accordion-dropdown';
            if (supportPanel) supportPanel.className = 'accordion-dropdown';
            closeTimer = null;
        }, 220);
    }

    function toggleTab(name) {
        if (activeTab === name) {
            closeTabs();
            return;
        }
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        var prev = activeTab;
        activeTab = name;

        var isProjects = name === 'projects';
        var activePanel = isProjects ? projectsPanel : supportPanel;
        var inactivePanel = isProjects ? supportPanel : projectsPanel;
        var activeBtn = isProjects ? projectsToggle : supportToggle;
        var inactiveBtn = isProjects ? supportToggle : projectsToggle;

        var slideIn = prev ? (isProjects ? ' slide-left' : ' slide-right') : '';
        var slideOut = isProjects ? ' slide-out-right' : ' slide-out-left';

        if (activeBtn) {
            activeBtn.className = 'site-btn toggle-btn active';
            activeBtn.setAttribute('aria-expanded', 'true');
        }
        if (inactiveBtn) {
            inactiveBtn.className = 'site-btn toggle-btn';
            inactiveBtn.setAttribute('aria-expanded', 'false');
        }

        if (activePanel) activePanel.className = 'accordion-dropdown open' + slideIn;
        if (prev && inactivePanel) {
            inactivePanel.className = 'accordion-dropdown closing' + slideOut;
        } else if (inactivePanel) {
            inactivePanel.className = 'accordion-dropdown';
        }

        if (accordionContainer && activePanel) {
            accordionContainer.style.height = (activePanel.offsetHeight + 8) + 'px';
        }
        updateContainerState();

        if (prev) {
            closeTimer = setTimeout(function() {
                if (inactivePanel) inactivePanel.className = 'accordion-dropdown';
                closeTimer = null;
            }, 220);
        }
    }

    if (projectsToggle) {
        projectsToggle.onclick = function(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            toggleTab('projects');
        };
    }

    if (supportToggle) {
        supportToggle.onclick = function(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            toggleTab('support');
        };
    }

    var thnxWrapper = document.getElementById('thnx-wrapper');
    var thnxToggle = document.getElementById('thnx-toggle');
    if (thnxToggle && thnxWrapper) {
        thnxToggle.onclick = function(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var isOpen = thnxWrapper.className.indexOf('open') !== -1;
            thnxWrapper.className = isOpen ? 'thnx-wrapper' : 'thnx-wrapper open';
            thnxToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        };
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

    loadJSON('projects.json', defaultProjects, function(data) {
        projectsList = data;
        renderProjects(currentLang);
        syncAccordionHeight();
    });

    loadJSON('support.json', defaultSupport, function(data) {
        supportList = data;
        renderSupport(currentLang);
        syncAccordionHeight();
    });

    setLanguage('en');

    var webringPrev = document.getElementById('webring-prev');
    var webringNext = document.getElementById('webring-next');
    var webringPrevName = document.getElementById('webring-prev-name');
    var webringNextName = document.getElementById('webring-next-name');

    loadJSON('https://webring.otomir23.me/badinteger/data', null, function(data) {
        if (data && data.prev && data.next) {
            applyWebringData(data.prev, data.next);
        } else {
            loadJSON('https://webring.otomir23.me/sites', null, function(sites) {
                if (!sites || !sites.length) return;
                var idx = -1;
                for (var i = 0; i < sites.length; i++) {
                    var s = sites[i];
                    if (s.slug === 'badinteger' || (s.url && s.url.indexOf('badinteger') !== -1)) {
                        idx = i;
                        break;
                    }
                }
                var prevSite, nextSite;
                if (idx !== -1) {
                    prevSite = sites[(idx - 1 + sites.length) % sites.length];
                    nextSite = sites[(idx + 1) % sites.length];
                } else {
                    prevSite = sites[sites.length - 1];
                    nextSite = sites[0];
                }
                applyWebringData(prevSite, nextSite);
            });
        }
    });

    function applyWebringData(prev, next) {
        if (prev && webringPrev && webringPrevName) {
            webringPrevName.innerHTML = escapeHTML(prev.name || prev.slug || '');
            if (prev.slug) webringPrev.href = 'https://webring.otomir23.me/' + prev.slug;
            else if (prev.url) webringPrev.href = prev.url;
        }
        if (next && webringNext && webringNextName) {
            webringNextName.innerHTML = escapeHTML(next.name || next.slug || '');
            if (next.slug) webringNext.href = 'https://webring.otomir23.me/' + next.slug;
            else if (next.url) webringNext.href = next.url;
        }
    }
})();
