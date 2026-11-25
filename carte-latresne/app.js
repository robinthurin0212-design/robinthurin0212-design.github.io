(() => {
  'use strict';

  const WIDTH = 2048;
  const HEIGHT = 1160;
  const geo = {
    lonMin: -0.527374,
    lonMax: -0.468758,
    latMin: 44.773815,
    latMax: 44.806371,
    left: 430,
    right: 1507,
    top: 205,
    bottom: 1080
  };

  const roads = {
    d113: [
      [582,236],[600,292],[627,357],[653,405],[680,468],[706,532],
      [735,602],[764,672],[785,725],[798,765],[806,806],[809,819],
      [831,843],[861,870],[897,902],[930,932],[960,957],[983,973],[1007,983]
    ],
    d10: [
      [842,145],[854,218],[865,286],[875,350],[890,420],[902,490],[912,556],
      [922,620],[936,681],[950,727],[962,758],[977,782],[990,809],[1000,837],
      [1010,865],[1015,892],[1017,920],[1014,947],[1007,983],[1024,1001],
      [1041,1023],[1055,1047],[1068,1071]
    ],
    d240: [
      [1018,883],[1030,895],[1045,903],[1070,914],[1093,922],[1119,931],
      [1145,939],[1170,948],[1195,958],[1220,970],[1240,982],[1258,993]
    ]
  };

  // Coordonnées et dessertes issues des données officielles Nouvelle-Aquitaine
  // Mobilités. L'aire de covoiturage est représentée plus bas par ses deux
  // points de diagnostic et de solution, sans doublon d'arrêt blanc.
  const busStops = [
    {name:"Croix d’Ardit", lat:44.805107, lon:-0.498141, lines:['474','4782','R474'], labelDx:18, labelY:-22},
    {name:'La Seleyre', x:871, y:322, lines:['481','4881','R481'], labelDx:18, labelY:-22},
    {name:'Chemin de Coulon', x:890, y:420, lines:['481','R481'], labelDx:18, labelY:-17},
    {name:'Les Carrières', x:918, y:591, lines:['481','R481'], labelDx:18, labelY:-18},
    {name:'Rond-point du 5 Décembre', x:956, y:742, lines:['481','R481'], labelDx:18, labelY:-24, labelAnchor:'start'},
    {name:"Chemin du Port de l’Homme", x:858, y:798, lines:['481','R481'], labelDx:-22, labelY:-34, labelAnchor:'end'},
    // Ces trois arrêts sont calés visuellement sur les repères du fond fourni.
    {name:'Aérocampus', x:1002, y:843, lines:['481','R481'], labelDx:20, labelY:5},
    {name:'Arcins', x:640, y:380, lines:['4881'], labelDx:18, labelY:-20},
    {name:'Collège Camille Claudel', x:1097, y:765, lines:['4881'], school:true, labelDx:18, labelY:-20}
  ];

  // Arrêts TBM visibles dans le cadrage de Bouliac. Ils sont distingués des
  // cars régionaux et ne sont volontairement pas interactifs.
  const tbmStops = [
    {name:'Le Marais', lat:44.81297, lon:-0.50703, lines:['S5'], labelDx:18, labelY:20},
    {name:'Route de Latresne', x:859, y:278, lines:['S5'], labelDx:-18, labelY:-17, labelAnchor:'end'}
  ];

  const specialLocations = [
    {name:'Aire de covoiturage', x:1007, y:983},
    {name:"Rond-point du chemin d’Arcins", x:653, y:405, labelDx:-26, labelY:32, labelAnchor:'end'},
    {name:'Rond-point de la Seleyre', x:852, y:224, labelDx:0, labelY:-24, labelAnchor:'middle'}
  ];

  const roadStatsPoints = [
    {key:'d113', name:'D113', x:785, y:725},
    {key:'d10', name:'D10', x:922, y:620},
    {key:'d240', name:'D240', x:1210, y:965}
  ];

  const singlePoints = [
    {
      name:'Rond-point Marie Blachère',
      x:806,
      y:806,
      className:'issue-core',
      labelX:-24,
      labelY:5,
      labelAnchor:'end',
      kicker:'Problématique / diagnostic',
      body:'<p><strong>Timelapse</strong></p><p>Emplacement réservé. La vidéo sera intégrée dès sa réception.</p>'
    },
    {
      name:'Mairie',
      x:987,
      y:808,
      className:'quote-core',
      labelX:18,
      labelY:5,
      labelAnchor:'start',
      kicker:'Porteur de parole',
      body:'<p><strong>Statistiques du porteur de parole</strong></p><p>Données à intégrer : participation, thèmes exprimés et principaux verbatims.</p>'
    }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const svgNS = 'http://www.w3.org/2000/svg';
  const viewport = $('#map-viewport');
  const scene = $('#map-scene');
  const popup = $('#popup');
  const popupTitle = $('#popup-title');
  const popupKicker = $('#popup-kicker');
  const popupBody = $('#popup-body');
  const panel = $('#panel');
  const panelToggle = $('#panel-toggle');
  let state = { scale: 1, x: 0, y: 0 };
  let dragging = false;
  let pointerStart = null;
  let viewStart = null;

  function project(lat, lon) {
    const x = geo.left + ((lon - geo.lonMin) / (geo.lonMax - geo.lonMin)) * (geo.right - geo.left);
    const y = geo.top + ((geo.latMax - lat) / (geo.latMax - geo.latMin)) * (geo.bottom - geo.top);
    return [x, y];
  }

  function el(tag, attrs = {}, parent) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }

  function linePath(points) {
    return points.map(([x, y], index) => {
      return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  function renderWater() {
    const layer = $('#water-layer');
    const shape = [
      'M 195 -40',
      'C 220 42 255 112 295 180',
      'C 332 244 365 307 387 370',
      'C 405 433 415 500 420 566',
      'C 426 636 438 704 455 766',
      'C 474 832 502 896 528 960',
      'C 553 1021 574 1087 596 1160',
      'L 700 1160',
      'C 680 1082 659 1015 635 958',
      'C 614 905 594 856 582 817',
      'C 578 770 574 714 572 650',
      'C 570 591 571 534 568 481',
      'C 563 426 546 380 523 340',
      'C 503 287 472 224 438 165',
      'C 409 108 384 41 360 -40',
      'Z'
    ].join(' ');
    const mask = el('mask', {
      id:'garonne-mask',
      x:0,
      y:0,
      width:WIDTH,
      height:HEIGHT,
      maskUnits:'userSpaceOnUse'
    }, layer);
    el('rect', {x:0, y:0, width:WIDTH, height:HEIGHT, fill:'#fff'}, mask);
    // L'île est laissée transparente afin de conserver sa forme réelle et les
    // voies intérieures du fond cartographique visibles.
    const island = [
      'M 405 205',
      'L 396 225 L 401 247 L 408 270 L 414 291 L 420 312',
      'L 427 334 L 434 356 L 441 378 L 449 400 L 456 422',
      'L 460 444 L 462 468 L 465 492 L 470 515 L 476 538',
      'L 483 560 L 491 582 L 500 602 L 514 624',
      'L 531 627 L 544 612 L 549 591 L 546 568 L 548 545',
      'L 547 522 L 545 499 L 542 476 L 539 453 L 534 430',
      'L 529 407 L 523 384 L 515 361 L 506 338 L 498 315',
      'L 488 292 L 477 269 L 466 247 L 451 224 L 430 205',
      'Z'
    ].join(' ');
    el('path', {d:island, fill:'#000'}, mask);
    el('path', {d:shape, class:'garonne-shape', mask:'url(#garonne-mask)'}, layer);
    // Le masque de l'île peut interrompre visuellement le fin liseré de rive.
    // On repasse uniquement ce même liseré, sans remplir ni élargir le fleuve.
    const rightBank = [
      'M 360 -40',
      'C 384 41 409 108 438 165',
      'C 472 224 503 287 523 340',
      'C 546 380 563 426 568 481',
      'C 571 534 570 591 572 650',
      'C 574 714 578 770 582 817',
      'C 594 856 614 905 635 958',
      'C 659 1015 680 1082 700 1160'
    ].join(' ');
    el('path', {d:rightBank, class:'garonne-bank-line'}, layer);
    const label = el('text', {x:500, y:610, class:'garonne-label', transform:'rotate(78 500 610)', 'text-anchor':'middle'}, layer);
    label.textContent = 'La Garonne';
  }

  function renderRoads() {
    const layer = $('#roads-layer');
    Object.entries(roads).forEach(([key, points]) => {
      const d = linePath(points);
      el('path', {d, class:'road-case'}, layer);
      el('path', {d, class:`road-line road-${key}`}, layer);
    });

    const labels = [
      {text:'D113', x:704, y:534, w:64},
      {text:'D10', x:930, y:651, w:52},
      {text:'D240', x:1140, y:935, w:64}
    ];
    labels.forEach(item => {
      const {x,y} = item;
      const g = el('g', {class:'road-label', transform:`translate(${x - item.w / 2} ${y - 16})`}, layer);
      el('rect', {width:item.w, height:30}, g);
      const t = el('text', {x:item.w/2, y:21, 'text-anchor':'middle'}, g);
      t.textContent = item.text;
    });

    roadStatsPoints.forEach(item => {
      const {x,y} = item;
      const g = markerGroup(layer, x, y, `Statistiques ${item.name}`, () => openPopup({
        kicker:'Données de mobilité',
        title:item.name,
        body:'<div class="stats-placeholder"><p><strong>Flux de circulation</strong><span>À compléter</span></p><p><strong>Accidentologie</strong><span>À compléter</span></p><p><strong>Comptages</strong><span>À compléter</span></p></div>'
      }, g), 'road-stat-marker');
      el('circle', {cx:0, cy:0, r:22, class:'hit'}, g);
      el('circle', {cx:0, cy:0, r:18, class:'focus-ring'}, g);
      el('circle', {cx:0, cy:0, r:15, class:'road-stat-halo'}, g);
      el('circle', {cx:0, cy:0, r:11, class:`road-stat-core road-stat-${item.key}`}, g);
      const icon = el('text', {x:0, y:5, class:'road-stat-icon', 'text-anchor':'middle', 'aria-hidden':'true'}, g);
      icon.textContent = 'i';
    });
  }

  function renderBus() {
    const layer = $('#bus-layer');
    busStops.forEach(stop => {
      const [x,y] = Number.isFinite(stop.x) ? [stop.x, stop.y] : project(stop.lat, stop.lon);
      const g = stop.school ? markerGroup(layer, x, y, stop.name, () => openPopup({kicker:'Verbatims', title:stop.name, body:'<p>Les verbatims du collège seront ajoutés ici.</p>'}, g)) : el('g', {class:'stop-marker', transform:`translate(${x} ${y})`, 'aria-label':`Arrêt de car ${stop.name}, lignes ${stop.lines.join(', ')}`}, layer);
      const title = el('title', {}, g);
      title.textContent = `${stop.name} — ${stop.lines.join(' · ')}`;
      if (stop.school) { el('circle', {cx:0,cy:0,r:18,class:'hit'}, g); el('circle', {cx:0,cy:0,r:13,class:'focus-ring'}, g); el('circle', {cx:0,cy:0,r:9,class:'special-core quote-core'}, g); }
      else el('circle', {cx:0,cy:0,r:7.5,class:'stop-core'}, g);
      const labelX = stop.labelDx ?? 13;
      const labelY = stop.labelY ?? -9;
      const labelAnchor = stop.labelAnchor || 'start';
      const nameLabel = el('text', {x:labelX, y:labelY, class:'stop-name-label', 'text-anchor':labelAnchor}, g);
      nameLabel.textContent = stop.name;
      const lineLabel = el('text', {x:labelX, y:labelY + 17, class:'stop-lines-label', 'text-anchor':labelAnchor}, g);
      lineLabel.textContent = stop.lines.join(' · ');
    });

    tbmStops.forEach(stop => {
      const [x,y] = Number.isFinite(stop.x) ? [stop.x, stop.y] : project(stop.lat, stop.lon);
      const g = el('g', {class:'stop-marker tbm-stop-marker', transform:`translate(${x} ${y})`, 'aria-label':`Arrêt TBM ${stop.name}, ligne ${stop.lines.join(', ')}`}, layer);
      const title = el('title', {}, g);
      title.textContent = `${stop.name} — TBM ${stop.lines.join(' · ')}`;
      el('circle', {cx:0, cy:0, r:8, class:'stop-core tbm'}, g);
      const labelX = stop.labelDx ?? 14;
      const labelY = stop.labelY ?? -9;
      const labelAnchor = stop.labelAnchor || 'start';
      const nameLabel = el('text', {x:labelX, y:labelY, class:'stop-name-label tbm-label', 'text-anchor':labelAnchor}, g);
      nameLabel.textContent = stop.name;
      const lineLabel = el('text', {x:labelX, y:labelY + 17, class:'stop-lines-label tbm-lines-label', 'text-anchor':labelAnchor}, g);
      lineLabel.textContent = `TBM · ${stop.lines.join(' · ')}`;
    });
  }

  function renderSpecialPoints() {
    const layer = $('#future-layer');
    specialLocations.forEach(location => {
      const [x,y] = Number.isFinite(location.lat)
        ? project(location.lat, location.lon)
        : [location.x, location.y];
      const points = [
        {x:x-10, type:'solution', className:'solution-core', kicker:'Solution', body:`<p>Point solution pour ${location.name.toLowerCase()}. Les informations détaillées seront ajoutées ensuite.</p>`},
        {x:x+10, type:'diagnostic', className:'issue-core', kicker:'Problématique / diagnostic', body:`<p>Point de diagnostic pour ${location.name.toLowerCase()}. Les informations détaillées seront ajoutées ensuite.</p>`}
      ];
      if (location.name === 'Aire de covoiturage') {
        points[0].body = `<p>Nous proposons de créer un pôle multimodal sur l’aire de covoiturage, afin de faciliter les correspondances avec les transports en commun et de réduire l’usage de la voiture individuelle, qui contribue aux encombrements à Latresne.</p><figure class="popup-photo"><img src="./assets/aire-projet.webp" width="1704" height="962" alt="Illustration du projet de pôle multimodal à l’entrée de l’aire de covoiturage" loading="eager"><figcaption>Illustration du projet de pôle multimodal</figcaption></figure><p>Une liaison cyclable relierait ce pôle à la piste existante au nord, pour faciliter son accès à vélo et encourager son utilisation.</p><figure class="popup-photo"><img src="./assets/liaison-cyclable-projet.webp" width="717" height="480" alt="Illustration d’une voie cyclable pour la liaison projetée vers la piste existante" loading="eager"><figcaption>Illustration de la liaison cyclable envisagée</figcaption></figure>`;
        points[1].body = `<p>Vue actuelle de l’aire de covoiturage.</p><figure class="popup-photo"><img src="./assets/aire-diagnostic.webp" alt="Entrée actuelle de l’aire de covoiturage de Latresne" loading="eager"></figure>`;
      } else if (location.name === 'Rond-point du chemin d’Arcins') {
        points[1].body = `<p>Vue du secteur du chemin d’Arcins.</p><figure class="popup-photo"><img src="./assets/arcins-diagnostic.webp" alt="Vue du secteur du chemin d’Arcins" loading="eager"></figure>`;
      }
      points.forEach(point => {
        const label = `${location.name} — ${point.type}`;
        const g = markerGroup(layer, point.x, y, label, () => openPopup({kicker:point.kicker, title:location.name, body:point.body}, g));
        el('circle', {cx:0, cy:0, r:16, class:'hit'}, g);
        el('circle', {cx:0, cy:0, r:12, class:'focus-ring'}, g);
        el('circle', {cx:0, cy:0, r:8, class:`special-core ${point.className}`}, g);
      });
      const title = el('text', {
        x:x + (location.labelDx ?? 24),
        y:y + (location.labelY ?? 5),
        class:'marker-label',
        'text-anchor':location.labelAnchor || 'start'
      }, layer);
      title.textContent = location.name;
    });

    singlePoints.forEach(point => {
      const g = markerGroup(layer, point.x, point.y, point.name, () => openPopup({
        kicker:point.kicker,
        title:point.name,
        body:point.body
      }, g));
      el('circle', {cx:0, cy:0, r:18, class:'hit'}, g);
      el('circle', {cx:0, cy:0, r:13, class:'focus-ring'}, g);
      el('circle', {cx:0, cy:0, r:9, class:`special-core ${point.className}`}, g);
      const label = el('text', {
        x:point.labelX ?? 17,
        y:point.labelY ?? 5,
        class:'marker-label',
        'text-anchor':point.labelAnchor || 'start'
      }, g);
      label.textContent = point.name;
    });
  }

  function markerGroup(parent, x, y, label, handler, extraClass = '') {
    const group = el('g', {class:`interactive-marker ${extraClass}`.trim(), transform:`translate(${x} ${y})`, role:'button', tabindex:'0', 'aria-label':label}, parent);
    // Point géométrique indépendant des textes accolés au marqueur : la pointe
    // de la bulle vise ainsi toujours le centre du cercle cliqué.
    el('circle', {cx:0, cy:0, r:.1, class:'popup-anchor', 'aria-hidden':'true'}, group);
    group.addEventListener('click', event => { event.stopPropagation(); handler(); });
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(); }
    });
    return group;
  }

  function openPopup(content, anchor) {
    popupKicker.textContent = content.kicker;
    popupTitle.textContent = content.title;
    popupBody.innerHTML = content.body;
    popupBody.scrollTop = 0;
    popup.hidden = false;
    const viewportRect = viewport.getBoundingClientRect();
    const anchorTarget = anchor.querySelector('.popup-anchor') || anchor;
    const anchorRect = anchorTarget.getBoundingClientRect();
    const anchorX = anchorRect.left - viewportRect.left + anchorRect.width / 2;
    const anchorY = anchorRect.top - viewportRect.top + anchorRect.height / 2;
    const margin = 16;
    const pointerHeight = 14;
    const maxX = viewportRect.width - popup.offsetWidth - margin;
    const x = Math.max(margin, Math.min(anchorX - popup.offsetWidth / 2, maxX));
    const aboveY = anchorY - popup.offsetHeight - pointerHeight;
    const placeBelow = aboveY < margin;
    const belowY = anchorY + pointerHeight;
    const maxY = viewportRect.height - popup.offsetHeight - margin;
    const y = Math.max(margin, Math.min(placeBelow ? belowY : aboveY, maxY));
    const tipX = Math.max(18, Math.min(anchorX - x, popup.offsetWidth - 18));
    popup.classList.toggle('popup--below', placeBelow);
    popup.style.setProperty('--popup-tip-x', `${tipX}px`);
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
  }

  function closePopup() {
    popup.hidden = true;
    popup.classList.remove('popup--below');
  }

  function applyTransform() {
    scene.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function fitView() {
    const rect = viewport.getBoundingClientRect();
    // Le fond remplit l'écran : le cadrage reste serré sur la commune plutôt
    // que de laisser de grandes bandes vides au-dessus et au-dessous.
    const fitScale = Math.max(rect.width / WIDTH, rect.height / HEIGHT);
    state.scale = fitScale * 1.02;
    state.x = (rect.width - WIDTH * state.scale) / 2;
    state.y = (rect.height - HEIGHT * state.scale) / 2;
    applyTransform();
    closePopup();
  }

  function zoomAt(factor, clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const nextScale = Math.max(.36, Math.min(state.scale * factor, 3.4));
    const worldX = (px - state.x) / state.scale;
    const worldY = (py - state.y) / state.scale;
    state.x = px - worldX * nextScale;
    state.y = py - worldY * nextScale;
    state.scale = nextScale;
    applyTransform();
    closePopup();
  }


  // Déplace seulement les étiquettes : les coordonnées des points restent fixes.
  function arrangeMapLabels() {
    const svg = document.querySelector('#map-overlay');
    const scale = Math.abs(svg.getScreenCTM().a);
    if (!scale) return;
    const labels = [];
    svg.querySelectorAll('.stop-marker').forEach(g => {
      const texts = [...g.querySelectorAll('text')];
      if (!texts.length) return;
      const wrapper = el('g', {class:'label-placement'}, g);
      texts.forEach(t => wrapper.appendChild(t));
      labels.push(wrapper);
    });
    labels.push(...svg.querySelectorAll('.marker-label, .road-label'));
    const rect = node => { const r=node.getBoundingClientRect(); return {l:r.left,t:r.top,r:r.right,b:r.bottom}; };
    const blocked=[...svg.querySelectorAll('.stop-core,.special-core,.road-stat-core')].map(n=>{let b=rect(n);return {l:b.l-5,t:b.t-5,r:b.r+5,b:b.b+5}});
    const collides=(a,b)=>a.l<b.r+3 && a.r>b.l-3 && a.t<b.b+3 && a.b>b.t-3;
    for (const item of labels) {
      const b=rect(item); if(!b.r || b.r===b.l) continue;
      let chosen=null;
      for(let radius=0;radius<=180 && !chosen;radius+=10) {
        const count=radius===0?1:24;
        for(let k=0;k<count;k++){
          const angle=k*2*Math.PI/count;
          const dx=radius*Math.cos(angle)*scale,dy=radius*Math.sin(angle)*scale;
          const box={l:b.l+dx,r:b.r+dx,t:b.t+dy,b:b.b+dy};
          if(!blocked.some(other=>collides(box,other))) {chosen={dx,dy,box};break;}
        }
      }
      if(chosen){const before=item.getAttribute('transform')||'';item.setAttribute('transform',before+' translate('+(chosen.dx/scale)+' '+(chosen.dy/scale)+')');blocked.push(chosen.box);}
      else blocked.push(b);
    }
  }

  renderWater();
  renderRoads();
  renderBus();
  renderSpecialPoints();

  const introDialog = $('#intro-video-dialog');
  $('#intro-video-button').addEventListener('click', () => {
    introDialog.hidden = false;
    $('#intro-video-close').focus();
  });
  $('#intro-video-close').addEventListener('click', () => {
    introDialog.hidden = true;
    $('#intro-video-button').focus();
  });
  introDialog.addEventListener('click', event => {
    if (event.target === introDialog) introDialog.hidden = true;
  });

  document.querySelectorAll('[data-layer]').forEach(input => {
    input.addEventListener('change', () => {
      $(`#${input.dataset.layer}-layer`).classList.toggle('is-hidden', !input.checked);
      closePopup();
    });
  });

  viewport.addEventListener('wheel', event => {
    if (event.target.closest('.popup')) return;
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? 1.14 : .88, event.clientX, event.clientY);
  }, {passive:false});

  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('.interactive-marker') || event.target.closest('.popup')) return;
    dragging = true;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
    pointerStart = {x:event.clientX, y:event.clientY};
    viewStart = {x:state.x, y:state.y};
  });
  viewport.addEventListener('pointermove', event => {
    if (!dragging) return;
    state.x = viewStart.x + event.clientX - pointerStart.x;
    state.y = viewStart.y + event.clientY - pointerStart.y;
    applyTransform();
    closePopup();
  });
  viewport.addEventListener('pointerup', () => { dragging = false; viewport.classList.remove('is-dragging'); });
  viewport.addEventListener('pointercancel', () => { dragging = false; viewport.classList.remove('is-dragging'); });

  viewport.addEventListener('keydown', event => {
    if (event.target.closest('.popup')) return;
    const step = event.shiftKey ? 90 : 35;
    if (event.key === 'ArrowLeft') state.x += step;
    else if (event.key === 'ArrowRight') state.x -= step;
    else if (event.key === 'ArrowUp') state.y += step;
    else if (event.key === 'ArrowDown') state.y -= step;
    else if (event.key === '+' || event.key === '=') zoomAt(1.15, viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2);
    else if (event.key === '-') zoomAt(.87, viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2);
    else return;
    event.preventDefault();
    applyTransform();
    closePopup();
  });

  $('#zoom-in').addEventListener('click', () => zoomAt(1.18, viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2));
  $('#zoom-out').addEventListener('click', () => zoomAt(.84, viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2));
  $('#reset-view').addEventListener('click', fitView);
  $('#popup-close').addEventListener('click', closePopup);
  viewport.addEventListener('click', event => { if (!event.target.closest('.interactive-marker') && !event.target.closest('.popup')) closePopup(); });

  panelToggle.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    panelToggle.setAttribute('aria-expanded', String(open));
    setTimeout(fitView, 310);
  });

  window.addEventListener('resize', fitView);
  if (window.innerWidth <= 820) panel.classList.remove('is-open');
  requestAnimationFrame(fitView);
})();
