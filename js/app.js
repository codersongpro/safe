(function () {
  'use strict';

  var ROOMS = window.ROOMS;
  var PLEDGES = window.PLEDGES;
  var CODE = ROOMS.filter(function (r) { return r.letter; }).map(function (r) { return r.letter; }).join('');
  var STORE_KEY = 'safety-escape-kids-v2';
  var app = document.getElementById('app');
  var keyBar = document.getElementById('keyBar');

  // ---------- 상태 ----------
  var state = load() || { team: '', cleared: {}, escaped: false };
  var play = null; // 진행 중인 방 정보 { room, qIndex, mistakes, solved }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경 */ }
  }

  // ---------- 도우미 ----------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') el.className = attrs[k];
        else if (k === 'text') el.textContent = attrs[k];
        else if (k === 'html') el.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
        else el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function render(nodes) {
    app.innerHTML = '';
    nodes.forEach(function (n) { app.appendChild(n); });
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
    renderKeys();
  }
  function isUnlocked(i) {
    return i === 0 || !!state.cleared[ROOMS[i - 1].id];
  }
  function starText(n) {
    return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
  }
  function totalStars() {
    return ROOMS.reduce(function (s, r) { return s + (state.cleared[r.id] || 0); }, 0);
  }
  function renderKeys() {
    keyBar.innerHTML = '';
    ROOMS.forEach(function (r) {
      if (!r.letter) return;
      var got = !!state.cleared[r.id];
      keyBar.appendChild(h('span', { class: 'key' + (got ? ' got' : ''), title: r.title }, [got ? r.letter : '?']));
    });
  }

  // ---------- 화면: 시작 ----------
  function showIntro() {
    var input = h('input', { id: 'team', type: 'text', maxlength: '20', placeholder: '예) 3모둠 독수리팀', value: state.team || '' });
    render([
      h('section', { class: 'hero' }, [
        h('div', { class: 'hero-icon', 'aria-hidden': 'true' }, ['🗝️']),
        h('p', { class: 'eyebrow', text: '현장체험학습 · 수학여행 사전 안전교육' }),
        h('h1', { text: '안전 탐험대 방탈출' }),
        h('p', { class: 'lead', text: '체험학습 날, ' + ROOMS.length + '개의 방이 잠겨 버렸어요! 방마다 안전 문제를 풀고 열쇠 글자를 모아 마지막 문을 열어 보세요.' }),
        h('ul', { class: 'how' }, [
          h('li', null, [h('b', { text: '① ' }), '방을 차례로 열고 문제 3개를 풀어요.']),
          h('li', null, [h('b', { text: '② ' }), '틀려도 괜찮아요. 힌트를 보고 다시 도전해요.']),
          h('li', null, [h('b', { text: '③ ' }), '열쇠 글자를 모아 비밀번호를 맞히면 탈출!'])
        ]),
        h('label', { class: 'field', for: 'team' }, [h('span', { text: '우리 모둠(또는 내) 이름' }), input]),
        h('button', {
          class: 'btn primary big', type: 'button',
          onclick: function () { state.team = input.value.trim(); save(); showMap(); }
        }, [Object.keys(state.cleared).length ? '이어서 탐험하기 →' : '탐험 시작하기 →'])
      ])
    ]);
  }

  // ---------- 화면: 지도 ----------
  function showMap() {
    var grid = h('div', { class: 'map' });
    ROOMS.forEach(function (r, i) {
      var open = isUnlocked(i);
      var done = state.cleared[r.id];
      var card = h('button', {
        class: 'room-card' + (done ? ' done' : '') + (open ? '' : ' locked'),
        type: 'button',
        style: '--c:' + r.color,
        'aria-label': (i + 1) + '번 방 ' + r.title + (done ? ' 완료' : open ? ' 열림' : ' 잠김'),
        onclick: function () { if (open) startRoom(r); }
      }, [
        h('span', { class: 'room-no', text: (i + 1) + '' }),
        h('span', { class: 'room-icon', 'aria-hidden': 'true' }, [open ? r.icon : '🔒']),
        h('span', { class: 'room-title', text: r.title }),
        h('span', { class: 'room-status', text: done ? starText(done) : open ? '도전!' : '잠김' })
      ]);
      grid.appendChild(card);
    });

    var allDone = ROOMS.every(function (r) { return state.cleared[r.id]; });
    render([
      h('section', { class: 'panel' }, [
        h('p', { class: 'eyebrow', text: state.team ? state.team + ' 탐험대' : '안전 탐험대' }),
        h('h2', { text: '탐험 지도' }),
        h('p', { class: 'muted', text: '앞의 방을 탈출해야 다음 방이 열려요.' }),
        grid,
        allDone ? h('button', { class: 'btn primary big', type: 'button', onclick: showCertificate }, ['🏅 수료증 다시 보기']) : null
      ])
    ]);
  }

  // ---------- 화면: 방 ----------
  function startRoom(room) {
    play = { room: room, qIndex: 0, mistakes: 0 };
    render([
      h('section', { class: 'panel story', style: '--c:' + room.color }, [
        h('div', { class: 'story-icon', 'aria-hidden': 'true' }, [room.icon]),
        h('p', { class: 'eyebrow', text: (ROOMS.indexOf(room) + 1) + '번 방' }),
        h('h2', { text: room.title }),
        h('p', { class: 'lead', text: room.story }),
        h('button', { class: 'btn primary big', type: 'button', onclick: showQuestion }, ['문 열고 들어가기 🚪'])
      ])
    ]);
  }

  function showQuestion() {
    var room = play.room;
    var q = room.questions[play.qIndex];
    var feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    var body;

    if (q.type === 'ox') body = buildOX(q, feedback);
    else if (q.type === 'choice') body = buildChoice(q, feedback);
    else if (q.type === 'multi') body = buildMulti(q, feedback);
    else if (q.type === 'spot') body = buildSpot(q, feedback);
    else body = buildOrder(q, feedback);

    var progress = h('div', { class: 'progress', 'aria-label': '문제 진행' },
      room.questions.map(function (_, i) {
        return h('span', { class: i < play.qIndex ? 'on' : i === play.qIndex ? 'now' : '' });
      }));

    var hintBox = h('p', { class: 'hint', hidden: 'hidden' }, ['💡 ', q.hint]);
    render([
      h('section', { class: 'panel', style: '--c:' + room.color }, [
        h('div', { class: 'q-head' }, [
          h('span', { class: 'tag', text: room.icon + ' ' + room.title }),
          h('span', { class: 'muted', text: '문제 ' + (play.qIndex + 1) + ' / ' + room.questions.length })
        ]),
        progress,
        h('h2', { class: 'question', text: q.q }),
        typeGuide(q),
        body,
        hintBox,
        feedback,
        h('button', {
          class: 'btn ghost small', type: 'button',
          onclick: function () { hintBox.hidden = false; }
        }, ['💡 힌트 보기'])
      ])
    ]);
  }

  function typeGuide(q) {
    var t = { ox: 'O 또는 X를 골라요', choice: '알맞은 답 하나를 골라요', multi: '정답을 모두 고른 뒤 [확인]을 눌러요', order: '순서대로 하나씩 눌러요', spot: '그림 속 친구를 누르고 ⭕ 안전해요 / ❌ 위험해요 중에서 골라요' }[q.type];
    return h('p', { class: 'guide', text: t });
  }

  function buildOX(q, fb) {
    var wrap = h('div', { class: 'ox' });
    [true, false].forEach(function (v) {
      wrap.appendChild(h('button', {
        class: 'ox-btn ' + (v ? 'o' : 'x'), type: 'button', 'aria-label': v ? 'O 맞다' : 'X 아니다',
        onclick: function (e) { judge(v === q.answer, q, fb, e.currentTarget, wrap); }
      }, [v ? 'O' : 'X']));
    });
    return wrap;
  }

  function buildChoice(q, fb) {
    var wrap = h('div', { class: 'choices' });
    q.options.forEach(function (opt, i) {
      wrap.appendChild(h('button', {
        class: 'choice', type: 'button',
        onclick: function (e) { judge(i === q.answer, q, fb, e.currentTarget, wrap); }
      }, [h('span', { class: 'num', text: String.fromCharCode(9312 + i) }), opt]));
    });
    return wrap;
  }

  function buildMulti(q, fb) {
    var picked = {};
    var wrap = h('div', { class: q.cards ? 'cards' : 'choices' });
    q.options.forEach(function (opt, i) {
      var b = h('button', {
        class: q.cards ? 'card-opt' : 'choice', type: 'button', 'aria-pressed': 'false',
        onclick: function () {
          picked[i] = !picked[i];
          b.classList.toggle('picked', picked[i]);
          b.setAttribute('aria-pressed', picked[i] ? 'true' : 'false');
          b.classList.remove('wrong');
        }
      }, [h('span', { class: 'check', 'aria-hidden': 'true' }), opt]);
      wrap.appendChild(b);
    });
    var check = h('button', {
      class: 'btn primary', type: 'button',
      onclick: function () {
        var chosen = Object.keys(picked).filter(function (k) { return picked[k]; }).map(Number).sort();
        var ok = chosen.length === q.answers.length && chosen.every(function (v, i) { return v === q.answers.slice().sort()[i]; });
        if (!ok) {
          chosen.forEach(function (k) {
            if (q.answers.indexOf(k) < 0) wrap.children[k].classList.add('wrong');
          });
        }
        judge(ok, q, fb, null, wrap, check);
      }
    }, ['확인']);
    return h('div', null, [wrap, h('div', { class: 'row' }, [check])]);
  }

  function buildOrder(q, fb) {
    var seq = [];
    var order = shuffle(q.items.map(function (_, i) { return i; }));
    var wrap = h('div', { class: 'choices order' });
    order.forEach(function (idx) {
      var b = h('button', {
        class: 'choice', type: 'button',
        onclick: function () {
          if (b.disabled) return;
          if (idx === seq.length) {
            seq.push(idx);
            b.disabled = true;
            b.classList.add('placed');
            b.querySelector('.num').textContent = seq.length;
            if (seq.length === q.items.length) judge(true, q, fb, null, wrap);
          } else {
            b.classList.add('wrong');
            setTimeout(function () {
              b.classList.remove('wrong');
              seq = [];
              Array.prototype.forEach.call(wrap.children, function (c) {
                c.disabled = false; c.classList.remove('placed');
                c.querySelector('.num').textContent = '?';
              });
            }, 650);
            judge(false, q, fb, null, wrap, null, '순서가 달라요! 처음부터 다시 눌러 보세요.');
          }
        }
      }, [h('span', { class: 'num', text: '?' }), q.items[idx]]);
      wrap.appendChild(b);
    });
    return wrap;
  }

  function buildSpot(q, fb) {
    var found = {};
    var total = q.spots.length;
    var dangerCount = q.spots.filter(function (s) { return !s.safe; }).length;
    var counter = h('p', { class: 'spot-count', 'aria-live': 'polite' });
    var img = h('img', { src: q.img, alt: q.alt, draggable: 'false' });
    var stage = h('div', { class: 'spot-stage' }, [img]);
    var popup = null;
    var list = h('ul', { class: 'spot-list' });

    function updateCount() {
      var n = Object.keys(found).length;
      counter.textContent = '찾은 곳 ' + n + ' / ' + total + '  (❌ 위험 ' + dangerCount + ' · ⭕ 안전 ' + (total - dangerCount) + ')';
    }
    function closePopup() {
      if (popup) { popup.remove(); popup = null; }
    }
    function hitTest(px, py) {
      var best = -1, area = Infinity;
      q.spots.forEach(function (s, i) {
        if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h && s.w * s.h < area) {
          best = i; area = s.w * s.h;
        }
      });
      return best;
    }
    function mark(i) {
      var s = q.spots[i];
      stage.appendChild(h('div', {
        class: 'spot-box ' + (s.safe ? 'safe' : 'danger'),
        style: 'left:' + s.x + '%;top:' + s.y + '%;width:' + s.w + '%;height:' + s.h + '%'
      }, [h('span', { class: 'spot-badge', 'aria-hidden': 'true', text: s.safe ? '⭕' : '❌' })]));
      list.appendChild(h('li', { class: s.safe ? 'safe' : 'danger' }, [(s.safe ? '⭕ ' : '❌ ') + s.label]));
    }
    function answer(i, saysSafe) {
      var s = q.spots[i];
      closePopup();
      if (saysSafe !== s.safe) {
        judge(false, q, fb, null, stage, null, '그 친구의 행동을 다시 살펴보세요.');
        return;
      }
      found[i] = true;
      mark(i);
      updateCount();
      if (Object.keys(found).length === total) {
        stage.classList.add('done');
        judge(true, q, fb, null, stage);
      } else {
        fb.className = 'feedback ' + (s.safe ? 'good' : 'bad');
        fb.innerHTML = '';
        fb.appendChild(h('p', null, [h('b', { text: (s.safe ? '⭕ 안전해요! ' : '❌ 위험해요! ') }), s.label + ' — ' + s.why]));
      }
    }

    stage.addEventListener('click', function (e) {
      if (e.target.closest('.spot-pop') || stage.classList.contains('done')) return;
      closePopup();
      var rect = stage.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width * 100;
      var py = (e.clientY - rect.top) / rect.height * 100;
      var i = hitTest(px, py);
      if (i < 0) {
        fb.className = 'feedback';
        fb.textContent = '🔍 여기에는 찾을 것이 없어요. 친구들의 행동을 눌러 보세요.';
        return;
      }
      if (found[i]) return;
      var left = Math.min(Math.max(px, 22), 78);
      popup = h('div', {
        class: 'spot-pop' + (py > 62 ? ' up' : ''),
        style: 'left:' + left + '%;top:' + py + '%',
        role: 'dialog', 'aria-label': '안전한지 위험한지 고르기'
      }, [
        h('button', { class: 'pop-btn safe', type: 'button', onclick: function () { answer(i, true); } }, ['⭕ 안전해요']),
        h('button', { class: 'pop-btn danger', type: 'button', onclick: function () { answer(i, false); } }, ['❌ 위험해요'])
      ]);
      stage.appendChild(popup);
      popup.querySelector('button').focus();
    });

    updateCount();
    return h('div', { class: 'spot-wrap' }, [counter, stage, list]);
  }

  function judge(ok, q, fb, btn, wrap, extraBtn, wrongMsg) {
    fb.innerHTML = '';
    if (!ok) {
      play.mistakes++;
      if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
      fb.className = 'feedback bad';
      fb.appendChild(h('p', null, [h('b', { text: '앗, 다시 생각해 봐요! ' }), wrongMsg || '💡 힌트를 보면 도움이 돼요.']));
      return;
    }
    if (btn) btn.classList.add('right');
    Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (b) { b.disabled = true; });
    if (extraBtn) extraBtn.disabled = true;
    if (q.type === 'multi') {
      q.answers.forEach(function (k) { wrap.children[k].classList.add('right'); });
    }
    fb.className = 'feedback good';
    var last = play.qIndex === play.room.questions.length - 1;
    fb.appendChild(h('p', null, [h('b', { text: '정답이에요! 🎉 ' }), q.explain]));
    fb.appendChild(h('button', {
      class: 'btn primary', type: 'button',
      onclick: function () {
        if (last) clearRoom();
        else { play.qIndex++; showQuestion(); }
      }
    }, [last ? (play.room.final ? '마지막 문으로 →' : '방 탈출하기 🔓') : '다음 문제 →']));
    fb.querySelector('.btn').focus();
  }

  function clearRoom() {
    var room = play.room;
    var stars = play.mistakes === 0 ? 3 : play.mistakes <= 2 ? 2 : 1;
    if (room.final) { play.stars = stars; showCodeLock(); return; }
    state.cleared[room.id] = Math.max(stars, state.cleared[room.id] || 0);
    save();
    var next = ROOMS[ROOMS.indexOf(room) + 1];
    render([
      h('section', { class: 'panel clear', style: '--c:' + room.color }, [
        h('p', { class: 'eyebrow', text: room.title + ' 탈출 성공!' }),
        h('div', { class: 'big-key', 'aria-label': '열쇠 글자 ' + room.letter }, [room.letter]),
        h('p', { class: 'stars', 'aria-label': '별 ' + stars + '개', text: starText(stars) }),
        h('p', { class: 'lead', text: '열쇠 글자 "' + room.letter + '"을(를) 얻었어요. 꼭 기억해요!' }),
        rulesBox(room),
        h('div', { class: 'row' }, [
          h('button', { class: 'btn ghost', type: 'button', onclick: showMap }, ['지도 보기']),
          next ? h('button', { class: 'btn primary', type: 'button', onclick: function () { startRoom(next); } }, ['다음 방: ' + next.title + ' →']) : null
        ])
      ])
    ]);
  }

  function rulesBox(room) {
    return h('div', { class: 'rules' }, [
      h('h3', { text: '✅ 이 방의 안전 약속' }),
      h('ul', null, room.rules.map(function (t) { return h('li', { text: t }); }))
    ]);
  }

  // ---------- 화면: 비밀번호 자물쇠 ----------
  function showCodeLock() {
    var letters = shuffle(CODE.split('').concat(['위', '놀', '빨']));
    var slots = h('div', { class: 'slots', 'aria-live': 'polite' });
    var entered = [];
    var msg = h('p', { class: 'feedback', 'aria-live': 'polite' });
    var tiles = h('div', { class: 'tiles' });

    function drawSlots() {
      slots.innerHTML = '';
      for (var i = 0; i < CODE.length; i++) {
        slots.appendChild(h('span', { class: 'slot' + (entered[i] ? ' fill' : '') }, [entered[i] ? entered[i].ch : '']));
      }
    }
    letters.forEach(function (ch) {
      var t = h('button', {
        class: 'tile', type: 'button',
        onclick: function () {
          if (entered.length >= CODE.length) return;
          entered.push({ ch: ch, el: t });
          t.disabled = true;
          drawSlots();
          if (entered.length === CODE.length) check();
        }
      }, [ch]);
      tiles.appendChild(t);
    });

    function check() {
      var word = entered.map(function (e) { return e.ch; }).join('');
      if (word === CODE) {
        state.cleared[play.room.id] = play.stars;
        state.escaped = true;
        save();
        slots.classList.add('open');
        msg.className = 'feedback good';
        msg.textContent = '🔓 철커덕! 문이 열렸어요!';
        setTimeout(showCertificate, 1100);
      } else {
        play.mistakes++;
        msg.className = 'feedback bad';
        msg.textContent = '비밀번호가 달라요. 방을 지나온 순서를 떠올려 보세요!';
        slots.classList.add('shake');
        setTimeout(function () { slots.classList.remove('shake'); undoAll(); }, 700);
      }
    }
    function undoAll() {
      entered.forEach(function (e) { e.el.disabled = false; });
      entered = [];
      drawSlots();
    }
    drawSlots();

    render([
      h('section', { class: 'panel lock' }, [
        h('div', { class: 'story-icon', 'aria-hidden': 'true' }, ['🔐']),
        h('h2', { text: '마지막 자물쇠' }),
        h('p', { class: 'lead', text: '방 1번부터 ' + CODE.length + '번까지 모은 열쇠 글자를 순서대로 눌러 비밀번호를 완성하세요. (가짜 글자도 섞여 있어요!)' }),
        slots,
        tiles,
        msg,
        h('div', { class: 'row' }, [
          h('button', {
            class: 'btn ghost small', type: 'button',
            onclick: function () { if (entered.length) { entered.pop().el.disabled = false; drawSlots(); } }
          }, ['⌫ 한 글자 지우기']),
          h('button', {
            class: 'btn ghost small', type: 'button',
            onclick: function () { msg.className = 'feedback'; msg.textContent = '💡 열쇠 글자는 화면 위쪽에도 보여요: ' + CODE.split('').join(' · '); }
          }, ['💡 힌트'])
        ])
      ])
    ]);
  }

  // ---------- 화면: 수료증 ----------
  function showCertificate() {
    var today = new Date();
    var dateText = today.getFullYear() + '년 ' + (today.getMonth() + 1) + '월 ' + today.getDate() + '일';
    var nameInput = h('input', { type: 'text', maxlength: '20', placeholder: '이름을 적어요', 'aria-label': '이름' });
    var nameOut = h('span', { class: 'cert-name', text: '' });
    nameInput.addEventListener('input', function () { nameOut.textContent = nameInput.value; });

    var pledgeList = h('ul', { class: 'pledges' }, PLEDGES.map(function (p, i) {
      var id = 'pledge' + i;
      return h('li', null, [
        h('input', { type: 'checkbox', id: id }),
        h('label', { for: id, text: p })
      ]);
    }));

    render([
      h('section', { class: 'panel celebrate no-print' }, [
        h('div', { class: 'story-icon', 'aria-hidden': 'true' }, ['🎉']),
        h('h2', { text: '탈출 성공! 안전한 체험학습을 떠날 준비 완료!' }),
        h('p', { class: 'lead', text: '비밀번호는 "' + CODE.slice(0, 3) + ' ' + CODE.slice(3) + '"이었어요. 오늘 배운 약속을 지키면 체험학습이 훨씬 즐거워져요.' })
      ]),
      h('section', { class: 'cert' }, [
        h('p', { class: 'cert-top', text: '안전 탐험대 수료증' }),
        h('h2', { class: 'cert-title' }, ['🏅 ', h('span', { text: '안전 지킴이' })]),
        h('p', { class: 'cert-who' }, [
          state.team ? h('span', { text: state.team + ' ' }) : null,
          nameOut
        ]),
        h('label', { class: 'field no-print' }, [h('span', { text: '수료증에 들어갈 이름' }), nameInput]),
        h('p', { class: 'cert-body', text: '위 탐험대원은 현장체험학습 사전 안전교육 방탈출 ' + ROOMS.length + '개 방을 모두 통과하고, 안전한 체험학습을 위한 약속을 다짐하였기에 이 수료증을 드립니다.' }),
        h('p', { class: 'stars', text: '획득한 별 ' + totalStars() + ' / ' + ROOMS.length * 3 }),
        h('h3', { text: '나의 안전 다짐' }),
        pledgeList,
        h('p', { class: 'cert-date', text: dateText })
      ]),
      h('div', { class: 'row no-print' }, [
        h('button', { class: 'btn ghost', type: 'button', onclick: showMap }, ['지도 보기']),
        h('button', { class: 'btn ghost', type: 'button', onclick: showRules }, ['📋 안전 수칙 모아보기']),
        h('button', { class: 'btn primary', type: 'button', onclick: function () { window.print(); } }, ['🖨️ 수료증 인쇄'])
      ])
    ]);
    confetti();
  }

  // ---------- 화면: 안전 수칙 모아보기 ----------
  function showRules() {
    render([
      h('section', { class: 'panel' }, [
        h('p', { class: 'eyebrow', text: '교실 게시·복습용' }),
        h('h2', { text: '체험학습 안전 수칙 모아보기' }),
        h('p', { class: 'muted no-print', text: '방탈출을 마친 뒤 함께 읽거나 인쇄해서 게시판에 붙여 보세요.' }),
        h('div', { class: 'rules-grid' }, ROOMS.map(function (r) {
          return h('article', { class: 'rule-card', style: '--c:' + r.color }, [
            h('h3', null, [r.icon + ' ', r.title]),
            h('ul', null, r.rules.map(function (t) { return h('li', { text: t }); }))
          ]);
        })),
        h('div', { class: 'row no-print' }, [
          h('button', { class: 'btn ghost', type: 'button', onclick: function () { state.escaped ? showCertificate() : showMap(); } }, ['← 돌아가기']),
          h('button', { class: 'btn primary', type: 'button', onclick: function () { window.print(); } }, ['🖨️ 인쇄하기'])
        ])
      ])
    ]);
  }

  // ---------- 효과 ----------
  function confetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var colors = ['#ff8a5b', '#4fa3f7', '#9b6bf2', '#2bb673', '#ffc93c', '#e5484d'];
    var layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (var i = 0; i < 60; i++) {
      layer.appendChild(h('i', {
        style: 'left:' + Math.random() * 100 + '%;background:' + colors[i % colors.length] +
          ';animation-delay:' + Math.random() * 0.8 + 's;animation-duration:' + (2 + Math.random() * 1.5) + 's'
      }));
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 4200);
  }

  // ---------- 공통 버튼 ----------
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (!go) return;
    if (go.getAttribute('data-go') === 'rules') showRules();
    else if (state.team || Object.keys(state.cleared).length) showMap();
    else showIntro();
  });
  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!window.confirm('모든 진행 기록을 지우고 처음부터 시작할까요?')) return;
    state = { team: '', cleared: {}, escaped: false };
    save();
    showIntro();
  });

  showIntro();
})();
