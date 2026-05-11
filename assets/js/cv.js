(function () {
  'use strict';

  const LOCALE_STORAGE_KEY = 'cv-locale';

  function getLocaleMap(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (!payload.cv || typeof payload.cv !== 'object' || Array.isArray(payload.cv)) {
      return null;
    }
    return payload.cv;
  }

  function getOrderedLocales(payload) {
    const localeMap = getLocaleMap(payload);
    return localeMap ? Object.keys(localeMap) : [];
  }

  function readSavedLocale() {
    try {
      return localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function saveLocale(locale) {
    if (!locale) return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage failures (private mode, blocked storage).
    }
  }

  function readQueryLocale() {
    try {
      const lang = new URLSearchParams(window.location.search).get('lang');
      return lang ? lang.trim() : null;
    } catch {
      return null;
    }
  }

  function resolveCvData(payload) {
    const localeMap = getLocaleMap(payload);
    if (!localeMap) {
      return {
        locale: null,
        locales: [],
        isMultilingual: false,
        data: payload,
      };
    }

    const locales = getOrderedLocales(payload);
    if (locales.length === 0) {
      return {
        locale: null,
        locales: [],
        isMultilingual: false,
        data: null,
        error: 'No locales found in cv-data.json. Add at least one locale under "cv".',
      };
    }

    const queryLocale = readQueryLocale();
    const savedLocale = readSavedLocale();

    let activeLocale = null;
    if (queryLocale && Object.prototype.hasOwnProperty.call(localeMap, queryLocale)) {
      activeLocale = queryLocale;
    } else if (savedLocale && Object.prototype.hasOwnProperty.call(localeMap, savedLocale)) {
      activeLocale = savedLocale;
    } else {
      activeLocale = locales[0] || null;
    }

    if (activeLocale) {
      saveLocale(activeLocale);
    }

    return {
      locale: activeLocale,
      locales,
      isMultilingual: true,
      data: activeLocale ? localeMap[activeLocale] : payload,
    };
  }

  window.__cvLocale = {
    resolveCvData,
  };
})();

(function () {
  'use strict';

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el && value) el.setAttribute(attr, value);
  }

  function setDocumentLang(locale) {
    if (locale) {
      document.documentElement.setAttribute('lang', locale);
    }
  }

  function setMetaFromData(data) {
    if (!data) return;

    const personal = data.personal || {};
    const skills = (data.skills && data.skills.categories) || [];

    const keywords = [];
    if (personal.title) keywords.push(personal.title);
    skills.forEach(cat => {
      if (cat.name) keywords.push(cat.name);
      (cat.skills || []).forEach(skill => {
        if (skill.name) keywords.push(skill.name);
      });
    });

    const uniqueKeywords = Array.from(new Set(keywords.filter(Boolean)));

    const titleText = [personal.name || '', personal.title || ''].filter(Boolean).join(' - ');
    if (titleText) {
      document.title = titleText;
      setText('meta-title', titleText);
    }

    setAttr('meta-author', 'content', personal.name || '');
    setAttr('meta-description', 'content', personal.summary || 'CV profile');
    setAttr('meta-keywords', 'content', uniqueKeywords.join(', '));

  }

  function applyExperience(experience) {
    const timeline = document.getElementById('timeline-list');
    if (!timeline || !Array.isArray(experience)) return;

    const arrows = Array.from(timeline.querySelectorAll('.tl-arrow, .tl-axis-label'));
    timeline.innerHTML = '';
    arrows.forEach(node => timeline.appendChild(node));

    experience.filter(item => item.enabled !== false).forEach(item => {
      const classes = ['tl-item'];
      if (item.highlight) classes.push('hi');
      if (item.type === 'education') classes.push('edu');
      if (item.type === 'other') classes.push('other');

      const block = document.createElement('div');
      block.className = classes.join(' ');

      const year = document.createElement('span');
      year.className = 'tl-year';
      year.textContent = item.period || '';

      const dot = document.createElement('div');
      dot.className = 'tl-dot';

      const card = document.createElement('div');
      card.className = 'tl-card';

      const role = document.createElement('div');
      role.className = 'tl-role';
      role.textContent = item.role || '';

      const company = document.createElement('div');
      company.className = 'tl-company';
      company.textContent = item.company || '';

      const desc = document.createElement('div');
      desc.className = 'tl-desc';
      desc.textContent = item.description || '';

      card.appendChild(role);
      card.appendChild(company);
      card.appendChild(desc);

      block.appendChild(year);
      block.appendChild(dot);
      block.appendChild(card);
      timeline.appendChild(block);
    });
  }

  function applyPersonal(personal) {
    if (!personal) return;

    const contact = personal.contact || {};
    const name = personal.name || '';
    const title = personal.title || '';
    const location = personal.location || '';

    setText('person-name', name);
    setText('person-title', title);
    setText('person-summary', personal.summary || '');
    setText('person-summary-impact', personal.summaryImpactEnabled !== false ? (personal.summaryImpact || '') : '');
    setText('person-location', location ? '📍 ' + location : '');

    setText('person-phone', contact.phone || '');
    setAttr('person-phone', 'href', contact.phone ? 'tel:' + contact.phone.replace(/\s+/g, '') : '');

    setText('person-email', contact.email || '');
    setAttr('person-email', 'href', contact.email ? 'mailto:' + contact.email : '');

    const linkedinText = contact.linkedin || '';
    const linkedinUrl = contact.linkedinUrl || (linkedinText ? 'https://' + linkedinText.replace(/^https?:\/\//, '') : '');
    setText('person-linkedin', linkedinText.replace(/^https?:\/\//, ''));
    setAttr('person-linkedin', 'href', linkedinUrl);

    const footerLine = [name, title, location].filter(Boolean).join(' · ');
    setText('footer-person', footerLine);
    setText('footer-formal-person', footerLine);

    const photo = document.getElementById('photo-img');
    if (photo && personal.photo) {
      photo.onerror = function () {
        const parent = this.parentElement;
        if (parent) parent.innerHTML = '<span class="icon">👤</span>';
      };
      photo.setAttribute('src', personal.photo);
      photo.setAttribute('alt', name || 'Profile photo');
    } else if (photo && !personal.photo) {
      const parent = photo.parentElement;
      if (parent) parent.innerHTML = '<span class="icon">👤</span>';
    }
  }

  function applyFooter(meta, ui) {
    const branding = (meta && meta.branding) || '';
    const year = (meta && meta.lastUpdated) || '';
    const prefix = (ui && ui.updatedPrefix) || 'Updated';
    const text = branding || (year ? prefix + ' ' + year : '');
    setText('footer-updated', text);
    setText('footer-formal-updated', text);
  }

  function applyUi(ui) {
    if (!ui) return;
    setText('ui-tag-profile',  ui.tagProfile);
    setText('ui-tag-career',   ui.tagCareer);
    setText('ui-tag-stack',    ui.tagStack);
    setText('ui-tl-now',       ui.timelineNow);
    setText('ui-tl-past',      ui.timelinePast);
    setText('ui-available',    ui.available);
    setText('ui-stack-note',   ui.stackNote);
    setText('btn-theme',       ui.btnTheme);
    setText('btn-print',       ui.btnPrint);
    setText('ftitle-work',     ui.fWorkExp);
    setText('ftitle-edu',      ui.fEducation);
    setText('ftitle-lang',     ui.fLanguages);
    setText('ftitle-cert',     ui.fCertifications);
    setText('ftitle-skills',   ui.fTechSkills);
    setText('ui-lang-label',   ui.langLabel || 'Language');
    const colTimeline = document.getElementById('col-timeline');
    if (colTimeline && ui.tagCareer) colTimeline.setAttribute('aria-label', ui.tagCareer.replace(/^\/\/ /, ''));
    const colSkills = document.getElementById('col-skills');
    if (colSkills && ui.tagStack) colSkills.setAttribute('aria-label', ui.tagStack.replace(/^\/\/ /, ''));
  }

  function renderLocaleSelector(resolved, ui) {
    const wrap = document.getElementById('locale-switch');
    const select = document.getElementById('locale-select');
    if (!wrap || !select) return;

    const locales = (resolved && resolved.locales) || [];
    if (!resolved || !resolved.isMultilingual || locales.length === 0) {
      wrap.hidden = true;
      return;
    }

    const label = document.getElementById('ui-lang-label');
    if (label) {
      label.textContent = (ui && ui.langLabel) || 'Language';
    }

    const activeLocale = (resolved && resolved.locale) || locales[0];
    const previous = select.value;

    select.innerHTML = '';
    locales.forEach(locale => {
      const option = document.createElement('option');
      option.value = locale;
      option.textContent = locale.toUpperCase();
      select.appendChild(option);
    });

    select.value = locales.includes(activeLocale) ? activeLocale : locales[0];
    if (previous && previous === select.value) {
      // Keep current value if already selected.
    }

    const isSingleLocale = locales.length === 1;
    select.disabled = isSingleLocale;

    select.setAttribute('aria-label', ((ui && ui.langLabel) || 'Language') + ' selector');
    select.onchange = function () {
      if (isSingleLocale) return;
      const nextLocale = this.value;
      if (!nextLocale || nextLocale === activeLocale) return;

      // Keep locale preference across sessions.
      try {
        localStorage.setItem('cv-locale', nextLocale);
      } catch {
        // Ignore storage failures.
      }

      // Re-render in place to avoid full-page reload side effects
      // (for example browser zoom/layout inconsistencies between locales).
      const payload = window.__cvData;
      const localeMap = payload && payload.cv;
      const nextData = localeMap && localeMap[nextLocale];
      if (!nextData || typeof nextData !== 'object') return;

      const nextResolved = {
        locale: nextLocale,
        locales,
        isMultilingual: true,
        data: nextData,
      };

      window.__cvResolved = nextResolved;
      setDocumentLang(nextLocale);
      renderLocaleSelector(nextResolved, nextData.ui || {});
      applyPersonal(nextData.personal || {});
      applyExperience(nextData.experience || []);
      applyFooter(nextData.meta || {}, nextData.ui || {});
      applyUi(nextData.ui || {});
      setMetaFromData(nextData);
      applyFormalPage(nextData);
      window.dispatchEvent(new CustomEvent('cv-data-ready', { detail: nextData }));

      // Preserve shareable state in URL without reloading.
      try {
        const params = new URLSearchParams(window.location.search);
        params.set('lang', nextLocale);
        const nextQuery = params.toString();
        const nextUrl = window.location.pathname + (nextQuery ? '?' + nextQuery : '') + window.location.hash;
        window.history.replaceState({}, '', nextUrl);
      } catch {
        // Ignore URL update failures.
      }
    };

    wrap.hidden = false;
  }

  function renderDataError(message) {
    const summary = document.getElementById('person-summary');
    if (summary) {
      summary.textContent = message || 'Invalid cv-data.json locale structure.';
    }
  }

  fetch('assets/data/cv-data.json')
    .then(response => {
      if (!response.ok) throw new Error('Unable to load assets/data/cv-data.json');
      return response.json();
    })
    .then(data => {
      window.__cvData = data;
      const resolved = window.__cvLocale.resolveCvData(data);
      const activeData = resolved.data || data;
      window.__cvResolved = resolved;
      setDocumentLang(resolved.locale);

      if (resolved.error || !activeData || !activeData.personal) {
        renderLocaleSelector(resolved, {});
        renderDataError(resolved.error);
        return;
      }

      renderLocaleSelector(resolved, activeData.ui || {});
      applyPersonal(activeData.personal || {});
      applyExperience(activeData.experience || []);
      applyFooter(activeData.meta || {}, activeData.ui || {});
      applyUi(activeData.ui || {});
      setMetaFromData(activeData);
      applyFormalPage(activeData);
      window.dispatchEvent(new CustomEvent('cv-data-ready', { detail: activeData }));
    })
    .catch(() => {
      // If JSON fetch fails, use already-loaded window.__cvData if available
      if (window.__cvData) {
        const resolved = window.__cvLocale.resolveCvData(window.__cvData);
        const activeData = resolved.data || window.__cvData;
        window.__cvResolved = resolved;
        setDocumentLang(resolved.locale);

        if (resolved.error || !activeData || !activeData.personal) {
          renderLocaleSelector(resolved, {});
          renderDataError(resolved.error);
          return;
        }

        renderLocaleSelector(resolved, activeData.ui || {});
        applyPersonal(activeData.personal || {});
        applyExperience(activeData.experience || []);
        applyFooter(activeData.meta || {}, activeData.ui || {});
        applyUi(activeData.ui || {});
        setMetaFromData(activeData);
        applyFormalPage(activeData);
        window.dispatchEvent(new CustomEvent('cv-data-ready', { detail: activeData }));
      } else {
        const summary = document.getElementById('person-summary');
        if (summary) {
          summary.textContent = 'Unable to load assets/data/cv-data.json. Run this page through a local server so JSON can be fetched.';
        }
      }
    });
})();

(function () {
  'use strict';

  /* ── Config ── */
  const W = 220, H = 220;
  const CX = W / 2, CY = H / 2;
  const MAX_R = 70;
  /* SVG helper */
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (parent) parent.appendChild(e);
    return e;
  };

  const svg = document.getElementById('radar-svg');
  const skillBars = document.getElementById('skill-bars');
  const radarWrap = document.getElementById('radar-wrap');
  const stackNote = radarWrap ? radarWrap.querySelector('.stack-note') : null;
  svg.setAttribute('viewBox', '-10 -10 240 240');

  /* Detect print for colour */
  const pr = () => window.matchMedia('print').matches;
  let state = null;

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeLevels(levelsMap, categories) {
    const entries = Object.entries(levelsMap || {})
      .map(([k, v]) => [toNumber(k, NaN), String(v)])
      .filter(([k]) => Number.isFinite(k))
      .sort((a, b) => a[0] - b[0]);

    if (entries.length) return entries;

    let detectedMax = 3;
    (categories || []).forEach(c => (c.skills || []).forEach(s => {
      detectedMax = Math.max(detectedMax, toNumber(s.level, 1));
    }));

    return Array.from({ length: detectedMax }, (_, i) => [i + 1, 'Level ' + (i + 1)]);
  }

  function normalizeCategories(rawCategories) {
    const pastelFallback = ['#ec9f9f', '#89cfa1', '#8fb3ef', '#eacd88'];
    return (rawCategories || [])
      .filter(cat => cat.enabled !== false)
      .map((cat, idx) => ({
        name: cat.name || 'Category',
        color: cat.color || '#6b7f99',
        pastelColor: cat.pastelColor || pastelFallback[idx % pastelFallback.length],
        skills: (cat.skills || [])
          .filter(skill => skill.enabled !== false)
          .map(skill => ({
            name: skill.name || 'Skill',
            level: toNumber(skill.level, 1)
          }))
      }));
  }

  function renderLevelLegend(levelEntries, ui) {
    const oldLegend = radarWrap ? radarWrap.querySelector('.lv-legend') : null;
    if (oldLegend) oldLegend.remove();
    if (!radarWrap || !levelEntries.length) return;

    const legend = document.createElement('div');
    legend.className = 'lv-legend';
    legend.style.flexWrap = 'wrap';
    legend.style.justifyContent = 'center';

    levelEntries.forEach(([num, label]) => {
      const item = document.createElement('span');
      item.className = 'lv-item';
      item.textContent = num + ' - ' + label;
      legend.appendChild(item);
    });

    radarWrap.appendChild(legend);

    if (stackNote) {
      stackNote.textContent = (ui && ui.stackNote) || 'Representative technologies delivered in production';
    }
  }

  function renderSkillBars(categories, maxLevel) {
    if (!skillBars) return;
    skillBars.innerHTML = '';

    categories.forEach(cat => {
      const block = document.createElement('div');
      block.className = 'cat-block';

      const name = document.createElement('div');
      name.className = 'cat-name';
      const dot = document.createElement('span');
      dot.className = 'cat-dot';
      dot.style.background = cat.color;
      const txt = document.createElement('span');
      txt.style.color = cat.color;
      txt.textContent = cat.name;
      name.appendChild(dot);
      name.appendChild(txt);
      block.appendChild(name);

      (cat.skills || []).forEach(skill => {
        const row = document.createElement('div');
        row.className = 'skill-row';

        const skillName = document.createElement('span');
        skillName.className = 'skill-name';
        skillName.textContent = skill.name;

        const track = document.createElement('div');
        track.className = 'bar-track';
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.background = cat.color;
        fill.style.setProperty('--w', ((Math.max(1, skill.level) / maxLevel) * 100).toFixed(0) + '%');

        track.appendChild(fill);
        row.appendChild(skillName);
        row.appendChild(track);
        block.appendChild(row);
      });

      skillBars.appendChild(block);
    });
  }

  function hexRgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return `rgba(200,200,200,${a})`;
    return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})`;
  }

  function buildSVG(categories, maxLevel) {
    if (!categories || !categories.length) return;

    const all = [];
    categories.forEach(c => (c.skills || []).forEach(s => all.push({
      ...s,
      color: c.color,
      pastelColor: c.pastelColor,
      cat: c.name
    })));
    if (!all.length) return;

    const N = all.length;
    const labelR = MAX_R + (N > 18 ? 12 : 15);
    const ang = i => (i * 2 * Math.PI / N) - Math.PI / 2;
    const pt  = (r, i) => ({ x: CX + r * Math.cos(ang(i)), y: CY + r * Math.sin(ang(i)) });

    svg.innerHTML = '';
    const dark = !pr() && !document.body.classList.contains('light-mode');
    const bdCol  = dark ? 'rgba(58,143,255,.18)'  : 'rgba(0,60,150,.16)';
    const bdHi   = dark ? 'rgba(58,143,255,.45)'  : 'rgba(0,60,150,.35)';
    const txtCol = dark ? '#4a6e92'               : '#5a6e85';

    /* No background rect — inherits column bg */

    /* Grid rings */
    for (let l = 1; l <= maxLevel; l++) {
      const r = (l / maxLevel) * MAX_R;
      const pts = Array.from({ length: N }, (_, i) => {
        const p = pt(r, i); return `${p.x},${p.y}`;
      }).join(' ');
      el('polygon', {
        points: pts,
        fill: dark ? `rgba(58,143,255,${.016 * l})` : `rgba(0,60,150,${.013 * l})`,
        stroke: l === maxLevel ? bdHi : bdCol,
        'stroke-width': l === maxLevel ? 1.2 : .7,
      }, svg);
    }

    /* Per-category filled polygons */
    categories.forEach(cat => {
      const idx = all.map((s,i) => s.cat === cat.name ? i : -1).filter(i => i >= 0);
      if (!idx.length) return;
      const pts = idx.map(i => {
        const p = pt((all[i].level / maxLevel) * MAX_R, i);
        return `${p.x},${p.y}`;
      }).join(' ');
      const drawColor = (!dark && cat.pastelColor) ? cat.pastelColor : cat.color;
      el('polygon', {
        points: pts,
        fill: hexRgba(drawColor, dark ? .14 : .09),
        stroke: hexRgba(drawColor, dark ? .62 : .42),
        'stroke-width': 1.4,
        'stroke-linejoin': 'round',
      }, svg);
    });

    /* Dot glow + dot */
    all.forEach((s, i) => {
      const { x, y } = pt((s.level / maxLevel) * MAX_R, i);
      const dotColor = (!dark && s.pastelColor) ? s.pastelColor : s.color;
      if (dark) el('circle', { cx:x, cy:y, r:6, fill: hexRgba(dotColor, .14) }, svg);
      el('circle', { cx:x, cy:y, r:3, fill: dotColor }, svg);
    });

    /* Labels */
    all.forEach((s, i) => {
      const a = ang(i);
      const { x: lx, y: ly } = pt(labelR, i);
      const cos = Math.cos(a);
      /* nudge left/right anchors slightly away from the chart edge */
      const ox = Math.abs(cos) < .15 ? 0 : cos > 0 ? 2 : -2;
      const anchor = Math.abs(cos) < .15 ? 'middle' : cos > 0 ? 'start' : 'end';

      const words = s.name.split(/[\s&]/);
      const baseAttrs = {
        'text-anchor': anchor,
        fill: txtCol,
        'font-family': 'Space Mono, monospace',
        'font-size': '6.8',
        'font-weight': '700',
      };

      if (words.length === 1 || s.name.length <= 8) {
        el('text', { ...baseAttrs, x: lx + ox, y: ly + 3 }, svg).textContent = s.name;
      } else {
        const mid = Math.ceil(words.length / 2);
        [words.slice(0, mid).join(' '), words.slice(mid).join(' ')].forEach((ln, li) => {
          el('text', { ...baseAttrs, x: lx + ox, y: ly + (li === 0 ? -3 : 7) }, svg).textContent = ln;
        });
      }
    });

    /* Centre pip */
    el('circle', { cx:CX, cy:CY, r:2.5, fill: dark ? 'rgba(58,143,255,.5)' : 'rgba(0,80,200,.4)' }, svg);
  }

  function renderSkillsFromData(data) {
    const skillData = (data && data.skills) || {};
    const categories = normalizeCategories(skillData.categories || []);
    const levelEntries = normalizeLevels(skillData.levels || {}, categories);
    const maxLevel = Math.max(1, levelEntries[levelEntries.length - 1][0]);

    renderLevelLegend(levelEntries, (data && data.ui) || {});
    renderSkillBars(categories, maxLevel);
    buildSVG(categories, maxLevel);

    state = { categories, maxLevel };
  }

  function ensureDataAndRender() {
    if (window.__cvData) {
      const resolved = window.__cvLocale.resolveCvData(window.__cvData);
      renderSkillsFromData(resolved.data || window.__cvData);
      return;
    }

    fetch('assets/data/cv-data.json')
      .then(response => {
        if (!response.ok) throw new Error('Unable to load assets/data/cv-data.json');
        return response.json();
      })
      .then(data => {
        window.__cvData = data;
        const resolved = window.__cvLocale.resolveCvData(data);
        renderSkillsFromData(resolved.data || data);
      })
      .catch(() => {
        // If JSON fetch fails, use already-loaded window.__cvData if available
        if (window.__cvData) {
          const resolved = window.__cvLocale.resolveCvData(window.__cvData);
          renderSkillsFromData(resolved.data || window.__cvData);
        } else if (skillBars) {
          skillBars.innerHTML = '';
        }
      });
  }

  ensureDataAndRender();
  window.addEventListener('cv-data-ready', e => renderSkillsFromData(e.detail));

  /* Rebuild on print to apply light palette */
  window.addEventListener('beforeprint', () => {
    if (state) buildSVG(state.categories, state.maxLevel);
  });
  window.addEventListener('afterprint', () => {
    if (state) buildSVG(state.categories, state.maxLevel);
  });
  
  /* Rebuild on theme toggle */
  window.addEventListener('rebuild-svg', () => {
    if (state) buildSVG(state.categories, state.maxLevel);
  });

})();

/* ═══════════════════════════════════════════════════════════
   FORMAL PAGE (page 2) RENDERER
═══════════════════════════════════════════════════════════ */
function applyFormalPage(data) {
  const formal = data.formal;
  if (!formal) return;

  const personal = data.personal || {};
  const contact  = personal.contact || {};

  // Header — name + title
  const nameEl  = document.getElementById('fperson-name');
  const titleEl = document.getElementById('fperson-title');
  if (nameEl)  nameEl.textContent  = personal.name  || '';
  if (titleEl) titleEl.textContent = personal.title || '';

  // Header — contact block (address, phone · email, linkedin)
  const contactEl = document.getElementById('fhdr-contact');
  if (contactEl) {
    contactEl.innerHTML = '';

    if (formal.address) {
      const addr = document.createElement('div');
      addr.textContent = formal.address;
      contactEl.appendChild(addr);
    }

    // phone · email on one line
    const line1 = document.createElement('div');
    if (contact.phone) {
      const a = document.createElement('a');
      a.href = 'tel:' + contact.phone.replace(/\s+/g, '');
      a.textContent = contact.phone;
      line1.appendChild(a);
    }
    if (contact.email) {
      if (line1.childNodes.length) line1.appendChild(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = 'mailto:' + contact.email;
      a.textContent = contact.email;
      line1.appendChild(a);
    }
    if (line1.childNodes.length) contactEl.appendChild(line1);

    if (contact.linkedin) {
      const line2 = document.createElement('div');
      const a = document.createElement('a');
      a.href = contact.linkedinUrl || ('#');
      a.target = '_blank';
      a.textContent = contact.linkedin.replace(/^https?:\/\//, '');
      line2.appendChild(a);
      contactEl.appendChild(line2);
    }
  }

  // Helper: build a .fentry row (work or edu)
  function buildEntry(period, role, company, location, desc, stack) {
    const entry = document.createElement('div');
    entry.className = 'fentry';

    const dateCol = document.createElement('div');
    dateCol.className = 'fentry-date';
    dateCol.textContent = period || '';

    const content = document.createElement('div');

    const head = document.createElement('div');
    head.className = 'fentry-head';

    const roleEl = document.createElement('span');
    roleEl.className = 'fentry-role';
    roleEl.textContent = role || '';
    head.appendChild(roleEl);

    if (company) {
      const sep = document.createElement('span');
      sep.className = 'fentry-company';
      sep.textContent = company;
      head.appendChild(sep);
    }
    if (location) {
      const loc = document.createElement('span');
      loc.className = 'fentry-location';
      loc.textContent = '· ' + location;
      head.appendChild(loc);
    }
    content.appendChild(head);

    if (desc) {
      const descEl = document.createElement('div');
      descEl.className = 'fentry-desc';
      descEl.textContent = desc;
      content.appendChild(descEl);
    }
    if (stack) {
      const stackEl = document.createElement('div');
      stackEl.className = 'fentry-stack';
      stackEl.textContent = stack;
      content.appendChild(stackEl);
    }

    entry.appendChild(dateCol);
    entry.appendChild(content);
    return entry;
  }

  // Work experience
  const workList = document.getElementById('fwork-list');
  if (workList && Array.isArray(formal.workExperience)) {
    workList.innerHTML = '';
    formal.workExperience.filter(item => item.enabled !== false).forEach(item => {
      workList.appendChild(buildEntry(
        item.period, item.role, item.company, item.location,
        item.description, item.stack
      ));
    });
  }

  // Education
  const eduList = document.getElementById('fedu-list');
  if (eduList && Array.isArray(formal.education)) {
    eduList.innerHTML = '';
    formal.education.filter(item => item.enabled !== false).forEach(item => {
      eduList.appendChild(buildEntry(
        item.period, item.degree, item.institution, item.location,
        item.detail, null
      ));
    });
  }

  // Languages
  const langList = document.getElementById('flang-list');
  if (langList && Array.isArray(formal.languages)) {
    langList.innerHTML = '';
    formal.languages.forEach(item => {
      const row = document.createElement('div');
      row.className = 'flang-row';
      const name = document.createElement('span');
      name.className = 'flang-name';
      name.textContent = item.language || '';
      const level = document.createElement('span');
      level.className = 'flang-level';
      level.textContent = item.level || '';
      row.appendChild(name);
      row.appendChild(level);
      langList.appendChild(row);
    });
  }

  // Certifications
  const certList = document.getElementById('fcert-list');
  if (certList && Array.isArray(formal.certifications)) {
    certList.innerHTML = '';
    formal.certifications.forEach(item => {
      const block = document.createElement('div');
      block.className = 'fcert-item';

      const name = document.createElement('div');
      name.className = 'fcert-name';
      name.textContent = item.name || '';

      const meta = document.createElement('div');
      meta.className = 'fcert-meta';
      meta.textContent = [item.issuer, item.year].filter(Boolean).join(', ');

      block.appendChild(name);
      block.appendChild(meta);

      if (item.detail) {
        const det = document.createElement('div');
        det.className = 'fcert-detail';
        det.textContent = item.detail;
        block.appendChild(det);
      }
      certList.appendChild(block);
    });
  }

  // Technical skills (2-column grid via CSS)
  const skillsList = document.getElementById('fskills-list');
  if (skillsList && Array.isArray(formal.skills)) {
    skillsList.innerHTML = '';
    formal.skills.forEach(item => {
      const row = document.createElement('div');
      row.className = 'fskill-row';
      const cat = document.createElement('span');
      cat.className = 'fskill-cat';
      cat.textContent = item.category || '';
      const items = document.createElement('span');
      items.className = 'fskill-items';
      items.textContent = item.items || '';
      row.appendChild(cat);
      row.appendChild(items);
      skillsList.appendChild(row);
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════════════ */
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('btn-theme');
  
  if (body.classList.contains('light-mode')) {
    body.classList.remove('light-mode');
    btn.textContent = '☀ Light Mode';
    localStorage.setItem('cv-theme', 'dark');
  } else {
    body.classList.add('light-mode');
    btn.textContent = '🌙 Dark Mode';
    localStorage.setItem('cv-theme', 'light');
  }
  
  // Rebuild radar SVG with new colors
  const buildEvent = new CustomEvent('rebuild-svg');
  window.dispatchEvent(buildEvent);
}

// Restore saved theme on load
(function() {
  const saved = localStorage.getItem('cv-theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById('btn-theme').textContent = '🌙 Dark Mode';
  }
})();
