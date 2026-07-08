(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const PRODUCT_KEY = "icant.products.v2";
  const SETTINGS_KEY = "icant.settings.v2";
  const ORDERS_KEY = "icant.orders.v2";
  const TICKETS_KEY = "icant.tickets.v2";
  const SESSION_KEY = "icant.admin.session.v2";
  const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const getJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const id = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  let products = getJSON(PRODUCT_KEY, window.ICANT_DEFAULT_PRODUCTS).filter(Boolean);
  let settings = {...window.ICANT_DEFAULT_SETTINGS, ...getJSON(SETTINGS_KEY,{})};
  let orders = getJSON(ORDERS_KEY, []);
  let tickets = getJSON(TICKETS_KEY, []);
  let currentImage = "";

  function toast(msg){ const el=$('[data-toast]'); if(!el) return; el.textContent=msg; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2100); }
  function escapeHtml(str){ return String(str ?? '').replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function save(){ setJSON(PRODUCT_KEY, products); setJSON(SETTINGS_KEY, settings); setJSON(ORDERS_KEY, orders); setJSON(TICKETS_KEY, tickets); renderAll(); toast('Salvo'); }
  function logged(){ return sessionStorage.getItem(SESSION_KEY)==='yes'; }
  function showAdmin(){ $('[data-login]').classList.add('hidden'); $('[data-admin]').classList.remove('hidden'); renderAll(); }

  $('[data-login-form]')?.addEventListener('submit', ev => {
    ev.preventDefault();
    const pass = new FormData(ev.currentTarget).get('password');
    if (pass === (settings.adminPassword || window.ICANT_DEFAULT_SETTINGS.adminPassword)) { sessionStorage.setItem(SESSION_KEY,'yes'); showAdmin(); }
    else toast('Senha incorreta');
  });
  $('[data-logout]')?.addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); location.reload(); });
  if(logged()) showAdmin();

  $$('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-tab]').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    $$('[data-section]').forEach(s=>s.classList.remove('active'));
    $(`[data-section="${btn.dataset.tab}"]`)?.classList.add('active');
    $('[data-admin-title]').textContent = btn.textContent.trim();
    renderAll();
  }));

  function renderStats(){
    $('[data-stat-products]').textContent = products.length;
    $('[data-stat-orders]').textContent = orders.length;
    $('[data-stat-tickets]').textContent = tickets.length;
    $('[data-stat-total]').textContent = money(orders.reduce((s,o)=>s+Number(o.total||0),0));
  }

  function renderProducts(){
    const q = ($('[data-product-search]')?.value || '').toLowerCase().trim();
    const list = $('[data-products-list]'); if(!list) return;
    const rows = products.filter(p => !q || `${p.name} ${p.category}`.toLowerCase().includes(q));
    list.innerHTML = rows.map(p => `<div class="admin-product-row">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" onerror="this.src='assets/products/icant-logo-tee.png'">
      <div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.category)} • ${money(p.price)} • Estoque ${Number(p.stock||0)} • ${p.active!==false?'Ativo':'Oculto'} ${p.recent?'• Recente':''}</p></div>
      <div class="row-actions"><button class="mini" data-edit-product="${p.id}">Editar</button><button class="mini danger" data-delete-product="${p.id}">Excluir</button></div>
    </div>`).join('') || `<p class="muted">Nenhum produto.</p>`;
  }

  function fillProductForm(p){
    const f = $('[data-product-form]'); f.reset();
    f.elements.id.value = p?.id || '';
    f.elements.name.value = p?.name || '';
    f.elements.price.value = p?.price || '';
    f.elements.stock.value = p?.stock ?? 1;
    f.elements.category.value = p?.category || 'camisetas';
    f.elements.description.value = p?.description || '';
    f.elements.imageUrl.value = p?.image || '';
    f.elements.recent.checked = !!p?.recent;
    f.elements.active.checked = p ? p.active !== false : true;
    currentImage = p?.image || '';
    $('[data-product-form-title]').textContent = p ? 'Editar produto' : 'Novo produto';
    renderImagePreview();
    window.scrollTo({top:0, behavior:'smooth'});
  }
  function renderImagePreview(){
    const box = $('[data-image-preview]');
    if(currentImage) box.innerHTML = `<img src="${currentImage}" alt="Preview">`;
    else box.textContent = 'Preview da imagem';
  }

  $('[data-product-form]')?.addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.currentTarget;
    const pid = f.elements.id.value || id();
    const image = currentImage || f.elements.imageUrl.value || 'assets/products/icant-logo-tee.png';
    const p = { id: pid, name: f.elements.name.value.trim().toUpperCase(), price: Number(f.elements.price.value), stock: Number(f.elements.stock.value), category: f.elements.category.value, description: f.elements.description.value.trim(), image, recent: f.elements.recent.checked, active: f.elements.active.checked };
    const ix = products.findIndex(x => x.id === pid);
    if (ix >= 0) products[ix] = p; else products.unshift(p);
    setJSON(PRODUCT_KEY, products); fillProductForm(null); renderAll(); toast('Produto salvo');
  });
  $('[data-product-reset]')?.addEventListener('click', () => fillProductForm(null));
  $('[data-product-search]')?.addEventListener('input', renderProducts);
  $('[data-product-form]')?.elements.imageUrl.addEventListener('input', ev => { currentImage = ev.target.value.trim(); renderImagePreview(); });
  $('[data-product-form]')?.elements.imageFile.addEventListener('change', ev => {
    const file = ev.target.files?.[0]; if(!file) return;
    if(!file.type.startsWith('image/')) return toast('Arquivo precisa ser imagem');
    const reader = new FileReader();
    reader.onload = () => { currentImage = reader.result; $('[data-product-form]').elements.imageUrl.value = ''; renderImagePreview(); };
    reader.readAsDataURL(file);
  });

  document.addEventListener('click', ev => {
    const edit = ev.target.closest('[data-edit-product]');
    if(edit){ const p=products.find(x=>x.id===edit.dataset.editProduct); if(p) fillProductForm(p); return; }
    const del = ev.target.closest('[data-delete-product]');
    if(del){ if(confirm('Excluir este produto?')){ products=products.filter(p=>p.id!==del.dataset.deleteProduct); setJSON(PRODUCT_KEY,products); renderAll(); toast('Produto excluído'); } return; }
    const status = ev.target.closest('[data-order-status]');
    if(status){ const o=orders.find(x=>x.id===status.dataset.orderStatus); if(o){ o.status=status.dataset.status; setJSON(ORDERS_KEY,orders); renderAll(); } return; }
    const ticketStatus = ev.target.closest('[data-ticket-status]');
    if(ticketStatus){ const t=tickets.find(x=>x.id===ticketStatus.dataset.ticketStatus); if(t){ t.status=ticketStatus.dataset.status; setJSON(TICKETS_KEY,tickets); renderAll(); } return; }
  });

  function renderOrders(){
    const box=$('[data-orders-list]'); if(!box) return;
    if(!orders.length){ box.innerHTML='<p class="muted">Nenhum pedido ainda.</p>'; return; }
    box.innerHTML = orders.map(o => `<div class="order-row">
      <header><div><strong>${o.id}</strong><p class="muted">${new Date(o.date).toLocaleString('pt-BR')} • ${escapeHtml(o.customer?.name||'')}</p></div><span class="pill">${escapeHtml(o.status||'novo')}</span></header>
      <pre>${escapeHtml(orderText(o))}</pre>
      <div class="row-actions"><button class="mini" data-order-status="${o.id}" data-status="pago">Marcar pago</button><button class="mini" data-order-status="${o.id}" data-status="enviado">Enviado</button><button class="mini danger" data-order-status="${o.id}" data-status="cancelado">Cancelar</button></div>
    </div>`).join('');
  }
  function orderText(o){
    const lines=[]; lines.push(`Cliente: ${o.customer?.name||''}`); lines.push(`Telefone: ${o.customer?.phone||''}`); lines.push(`E-mail: ${o.customer?.email||''}`); lines.push(`Endereço: ${o.customer?.address||''}`); if(o.customer?.cep) lines.push(`CEP: ${o.customer.cep}`); if(o.customer?.note) lines.push(`Obs: ${o.customer.note}`); lines.push(`Pagamento: ${(o.payment||'').toUpperCase()}`); lines.push('Itens:'); (o.items||[]).forEach(i=>lines.push(`- ${i.qty}x ${i.name} (${money(i.price)})`)); lines.push(`Total: ${money(o.total)}`); return lines.join('\n');
  }

  function renderTickets(){
    const box=$('[data-tickets-list]'); if(!box) return;
    if(!tickets.length){ box.innerHTML='<p class="muted">Nenhum atendimento ainda.</p>'; return; }
    box.innerHTML = tickets.map(t => `<div class="ticket-row">
      <header><div><strong>${escapeHtml(t.subject)}</strong><p class="muted">${new Date(t.date).toLocaleString('pt-BR')} • ${escapeHtml(t.name)} • ${escapeHtml(t.contact)}</p></div><span class="pill">${escapeHtml(t.status||'novo')}</span></header>
      <pre>${escapeHtml(t.message)}</pre>
      <div class="row-actions"><button class="mini" data-ticket-status="${t.id}" data-status="respondido">Respondido</button><button class="mini" data-ticket-status="${t.id}" data-status="fechado">Fechado</button></div>
    </div>`).join('');
  }

  function fillSettings(){
    const f=$('[data-settings-form]'); if(!f) return;
    Object.keys(settings).forEach(k => { if(f.elements[k]) f.elements[k].value = settings[k] ?? ''; });
  }
  $('[data-settings-form]')?.addEventListener('submit', ev => {
    ev.preventDefault(); const f=ev.currentTarget;
    ['brand','tagline','instagram','whatsapp','pixKey','pixName','pixCity','cardPaymentLink','shippingText','supportText'].forEach(k => settings[k]=f.elements[k]?.value || '');
    setJSON(SETTINGS_KEY, settings); toast('Configurações salvas'); renderAll();
  });

  $('[data-save-all]')?.addEventListener('click', save);
  $('[data-clear-orders]')?.addEventListener('click', () => { if(confirm('Limpar pedidos?')){ orders=[]; setJSON(ORDERS_KEY,orders); renderAll(); } });
  $('[data-clear-tickets]')?.addEventListener('click', () => { if(confirm('Limpar atendimentos?')){ tickets=[]; setJSON(TICKETS_KEY,tickets); renderAll(); } });
  $('[data-generate-export]')?.addEventListener('click', () => { $('[data-export]').value = JSON.stringify({products,settings,orders,tickets}, null, 2); });
  $('[data-copy-export]')?.addEventListener('click', () => { navigator.clipboard.writeText($('[data-export]').value); toast('Backup copiado'); });
  $('[data-import-backup]')?.addEventListener('click', () => {
    try{ const data=JSON.parse($('[data-import]').value); if(data.products) products=data.products; if(data.settings) settings={...settings,...data.settings}; if(data.orders) orders=data.orders; if(data.tickets) tickets=data.tickets; save(); }
    catch{ toast('Backup inválido'); }
  });
  $('[data-reset-store]')?.addEventListener('click', () => { if(confirm('Resetar produtos, configurações, pedidos e atendimentos?')){ localStorage.removeItem(PRODUCT_KEY); localStorage.removeItem(SETTINGS_KEY); localStorage.removeItem(ORDERS_KEY); localStorage.removeItem(TICKETS_KEY); location.reload(); } });

  function renderAll(){ renderStats(); renderProducts(); renderOrders(); renderTickets(); fillSettings(); }
})();
