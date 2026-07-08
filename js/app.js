(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PRODUCT_KEY = "icant.products.v2";
  const SETTINGS_KEY = "icant.settings.v2";
  const CART_KEY = "icant.cart.v2";
  const ORDERS_KEY = "icant.orders.v2";
  const TICKETS_KEY = "icant.tickets.v2";
  const CATS = ["camisetas", "calcas", "calcados", "acessorios"];

  const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const id = () => `IC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const getJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  let settings = { ...window.ICANT_DEFAULT_SETTINGS, ...getJSON(SETTINGS_KEY, {}) };
  let products = getJSON(PRODUCT_KEY, window.ICANT_DEFAULT_PRODUCTS).filter(Boolean);
  let cart = getJSON(CART_KEY, []);
  let activeFilter = null;

  function toast(msg) {
    const el = $("[data-toast]");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function applySettings() {
    document.title = `${settings.brand || "ICANT"} — ${settings.tagline || "Can’t? Make it happen."}`;
    $$('[data-tagline]').forEach(el => el.textContent = settings.tagline || "Can’t? Make it happen.");
    $$('[data-instagram]').forEach(el => { el.href = settings.instagram || "#"; });
    $$('[data-shipping-text]').forEach(el => el.textContent = settings.shippingText || "Envio combinado pelo atendimento após o pedido.");
    $$('[data-support-text]').forEach(el => el.textContent = settings.supportText || "Suporte no app e botão para WhatsApp.");
    const wa = cleanWhats(settings.whatsapp);
    $$('[data-support-whatsapp]').forEach(el => {
      if (wa) { el.classList.remove("hidden"); el.href = `https://wa.me/${wa}?text=${encodeURIComponent("Olá, vim pelo site ICANT e preciso de atendimento.")}`; }
      else el.classList.add("hidden");
    });
  }

  function cleanWhats(v) { return String(v || "").replace(/\D/g, ""); }
  function activeProducts() { return products.filter(p => p.active !== false); }

  function productCard(p) {
    const disabled = Number(p.stock || 0) <= 0;
    return `
      <article class="product-card ${disabled ? "soldout" : ""}" data-pid="${p.id}">
        <button class="product-media" data-view-product="${p.id}" aria-label="Ver ${escapeHtml(p.name)}">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='assets/products/icant-logo-tee.png'">
          <span class="product-add" data-add="${p.id}">+</span>
        </button>
        <div class="product-info">
          <strong title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</strong>
          <span>${money(p.price)}</span>
        </div>
      </article>`;
  }

  function renderProducts() {
    const source = activeProducts();
    const search = ($('[data-search-input]')?.value || "").trim().toLowerCase();
    const filterFn = p => {
      if (search && !(`${p.name} ${p.category} ${p.description || ""}`.toLowerCase()).includes(search)) return false;
      if (!activeFilter) return true;
      if (activeFilter === "recentes") return p.recent;
      return p.category === activeFilter;
    };
    const filtered = source.filter(filterFn);

    const recent = activeFilter ? filtered : source.filter(p => p.recent).slice(0, 6);
    const recentGrid = $('[data-grid="recentes"]');
    if (recentGrid) recentGrid.innerHTML = recent.map(productCard).join("") || emptyProducts();

    CATS.forEach(cat => {
      const list = activeFilter ? filtered.filter(p => p.category === cat) : source.filter(p => p.category === cat).slice(0, 6);
      const grid = $(`[data-grid="${cat}"]`);
      if (grid) grid.innerHTML = list.map(productCard).join("") || emptyProducts();
    });
    renderOutfit();
  }

  function emptyProducts() { return `<p class="muted">Nenhum produto encontrado.</p>`; }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  function getProduct(pid) { return products.find(p => p.id === pid); }

  function addToCart(pid, qty = 1) {
    const p = getProduct(pid);
    if (!p || p.active === false) return;
    if (Number(p.stock || 0) <= 0) return toast("Produto sem estoque");
    const item = cart.find(i => i.id === pid);
    if (item) item.qty += qty;
    else cart.push({ id: pid, qty });
    saveCart();
    toast("Produto no carrinho");
  }

  function saveCart() { setJSON(CART_KEY, cart); renderCart(); }
  function cartCount() { return cart.reduce((s, i) => s + Number(i.qty || 0), 0); }
  function cartTotal() { return cart.reduce((s, i) => { const p = getProduct(i.id); return s + (p ? Number(p.price || 0) * Number(i.qty || 0) : 0); }, 0); }

  function renderCart() {
    $$('[data-cart-count]').forEach(el => el.textContent = cartCount());
    $$('[data-cart-subtotal], [data-checkout-total]').forEach(el => el.textContent = money(cartTotal()));
    const wrap = $('[data-cart-items]');
    if (!wrap) return;
    if (!cart.length) {
      wrap.innerHTML = `<p class="muted">Seu carrinho está vazio.</p>`;
      return;
    }
    wrap.innerHTML = cart.map(i => {
      const p = getProduct(i.id);
      if (!p) return "";
      return `<div class="cart-row">
        <img src="${p.image}" alt="${escapeHtml(p.name)}">
        <div><h4>${escapeHtml(p.name)}</h4><p>${money(p.price)} • ${i.qty} un.</p><div class="qty"><button data-qty="${p.id}" data-delta="-1">−</button><span>${i.qty}</span><button data-qty="${p.id}" data-delta="1">+</button></div></div>
        <button data-remove="${p.id}" aria-label="Remover">×</button>
      </div>`;
    }).join("");
  }

  function openCart() { $('[data-cart-drawer]')?.classList.add('open'); $('[data-overlay]')?.classList.add('open'); }
  function closeCart() { $('[data-cart-drawer]')?.classList.remove('open'); $('[data-overlay]')?.classList.remove('open'); }

  function openProduct(pid) {
    const p = getProduct(pid); if (!p) return;
    const modal = $('[data-product-modal]');
    $('[data-product-detail]').innerHTML = `<div class="product-detail">
      <div class="product-detail-media"><img src="${p.image}" alt="${escapeHtml(p.name)}"></div>
      <div class="product-detail-info">
        <span class="eyebrow">${escapeHtml(p.category)}</span>
        <h2>${escapeHtml(p.name)}</h2>
        <div class="price">${money(p.price)}</div>
        <p>${escapeHtml(p.description || "Produto ICANT.")}</p>
        <p class="muted">Estoque: ${Number(p.stock || 0)} unidade(s)</p>
        <button class="btn full" data-add="${p.id}">ADICIONAR AO CARRINHO</button>
      </div>
    </div>`;
    modal.showModal();
  }

  function renderOutfit() {
    CATS.forEach(cat => {
      const sel = $(`[data-outfit="${cat}"]`);
      if (!sel) return;
      const current = sel.value;
      const opts = activeProducts().filter(p => p.category === cat);
      sel.innerHTML = opts.map(p => `<option value="${p.id}">${escapeHtml(p.name)} — ${money(p.price)}</option>`).join("");
      if (current && opts.some(p => p.id === current)) sel.value = current;
    });
    updateOutfitCanvas();
  }

  function updateOutfitCanvas() {
    const canvas = $('[data-outfit-canvas]'); if (!canvas) return;
    const ids = CATS.map(cat => $(`[data-outfit="${cat}"]`)?.value).filter(Boolean);
    canvas.innerHTML = ids.map(pid => {
      const p = getProduct(pid); if (!p) return "";
      return `<div class="outfit-item"><img src="${p.image}" alt="${escapeHtml(p.name)}"><span>${escapeHtml(p.name)}</span></div>`;
    }).join("");
  }

  function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  const emv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;
  function pixPayload(amount, txid) {
    if (!settings.pixKey) return "";
    const name = String(settings.pixName || "ICANT STORE").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 .-]/gi, "").toUpperCase().slice(0, 25);
    const city = String(settings.pixCity || "BELO HORIZONTE").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 .-]/gi, "").toUpperCase().slice(0, 15);
    const key = String(settings.pixKey).trim();
    const merchant = emv("00", "BR.GOV.BCB.PIX") + emv("01", key) + emv("02", `ICANT ${txid}`.slice(0, 20));
    const add = emv("05", String(txid).replace(/[^A-Z0-9]/gi, "").slice(0, 25));
    let payload = emv("00", "01") + emv("26", merchant) + emv("52", "0000") + emv("53", "986") + emv("54", Number(amount).toFixed(2)) + emv("58", "BR") + emv("59", name) + emv("60", city) + emv("62", add) + "6304";
    return payload + crc16(payload);
  }

  function buildOrderText(order) {
    const lines = [];
    lines.push(`Novo pedido ICANT: ${order.id}`);
    lines.push(`Nome: ${order.customer.name}`);
    lines.push(`Contato: ${order.customer.phone}`);
    lines.push(`Email: ${order.customer.email}`);
    lines.push(`Endereço: ${order.customer.address}`);
    if (order.customer.cep) lines.push(`CEP: ${order.customer.cep}`);
    if (order.customer.note) lines.push(`Obs: ${order.customer.note}`);
    lines.push(`Pagamento: ${order.payment.toUpperCase()}`);
    lines.push("Itens:");
    order.items.forEach(i => lines.push(`- ${i.qty}x ${i.name} (${money(i.price)})`));
    lines.push(`Total: ${money(order.total)}`);
    return lines.join("\n");
  }

  function handleCheckout(ev) {
    ev.preventDefault();
    if (!cart.length) return toast("Carrinho vazio");
    const fd = new FormData(ev.currentTarget);
    const order = {
      id: id(), date: new Date().toISOString(), status: "novo", total: cartTotal(), payment: fd.get("payment"),
      customer: { name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"), cep: fd.get("cep"), address: fd.get("address"), note: fd.get("note") },
      items: cart.map(i => { const p = getProduct(i.id); return { id: i.id, name: p?.name || i.id, price: p?.price || 0, qty: i.qty, image: p?.image || "" }; })
    };
    const orders = getJSON(ORDERS_KEY, []); orders.unshift(order); setJSON(ORDERS_KEY, orders);

    const form = $('[data-checkout-form]'); const result = $('[data-order-result]');
    form.classList.add('hidden'); result.classList.remove('hidden');
    $('[data-order-message]').textContent = `Pedido ${order.id} criado. Total ${money(order.total)}.`;

    const wa = cleanWhats(settings.whatsapp);
    const waBtn = $('[data-order-whatsapp]');
    if (wa) { waBtn.classList.remove('hidden'); waBtn.href = `https://wa.me/${wa}?text=${encodeURIComponent(buildOrderText(order))}`; }
    else waBtn.classList.add('hidden');

    const pixBox = $('[data-pix-box]'); const cardLink = $('[data-card-link]');
    pixBox.classList.add('hidden'); cardLink.classList.add('hidden');
    if (order.payment === 'pix' && settings.pixKey) {
      const code = pixPayload(order.total, order.id);
      $('[data-pix-code]').value = code;
      $('[data-pix-qr]').src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(code)}`;
      pixBox.classList.remove('hidden');
    }
    if (order.payment === 'card' && settings.cardPaymentLink) {
      cardLink.href = settings.cardPaymentLink;
      cardLink.classList.remove('hidden');
    }
    cart = []; saveCart(); closeCart();
  }

  function closeCheckout() {
    const modal = $('[data-checkout-modal]');
    $('[data-checkout-form]')?.classList.remove('hidden');
    $('[data-order-result]')?.classList.add('hidden');
    modal?.close();
  }

  function submitSupport(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const ticket = { id: id(), date: new Date().toISOString(), status: "novo", name: fd.get('name'), contact: fd.get('contact'), subject: fd.get('subject'), message: fd.get('message'), reply: "" };
    const tickets = getJSON(TICKETS_KEY, []); tickets.unshift(ticket); setJSON(TICKETS_KEY, tickets);
    const wa = cleanWhats(settings.whatsapp);
    if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent(`Atendimento ICANT ${ticket.id}\nNome: ${ticket.name}\nContato: ${ticket.contact}\nAssunto: ${ticket.subject}\nMensagem: ${ticket.message}`)}`, '_blank');
    ev.currentTarget.reset();
    $('[data-support-modal]')?.close();
    toast("Atendimento enviado");
  }

  document.addEventListener('click', (ev) => {
    const add = ev.target.closest('[data-add]');
    if (add) { ev.preventDefault(); ev.stopPropagation(); addToCart(add.dataset.add); return; }
    const view = ev.target.closest('[data-view-product]');
    if (view && !ev.target.closest('[data-add]')) { ev.preventDefault(); openProduct(view.dataset.viewProduct); return; }
    const filter = ev.target.closest('[data-filter]');
    if (filter) { activeFilter = activeFilter === filter.dataset.filter ? null : filter.dataset.filter; renderProducts(); toast(activeFilter ? `Filtro: ${activeFilter}` : "Mostrando todos"); return; }
    const qty = ev.target.closest('[data-qty]');
    if (qty) { const item = cart.find(i => i.id === qty.dataset.qty); if (item) { item.qty += Number(qty.dataset.delta); if (item.qty <= 0) cart = cart.filter(i => i.id !== item.id); saveCart(); } return; }
    const rem = ev.target.closest('[data-remove]');
    if (rem) { cart = cart.filter(i => i.id !== rem.dataset.remove); saveCart(); return; }
  });

  $('[data-cart-open]')?.addEventListener('click', openCart);
  $('[data-cart-close]')?.addEventListener('click', closeCart);
  $('[data-overlay]')?.addEventListener('click', closeCart);
  $('[data-cart-clear]')?.addEventListener('click', () => { cart = []; saveCart(); });
  $('[data-checkout-open]')?.addEventListener('click', () => { if (!cart.length) return toast("Carrinho vazio"); $('[data-checkout-modal]').showModal(); });
  $('[data-checkout-close]')?.addEventListener('click', closeCheckout);
  $('[data-finish-order]')?.addEventListener('click', closeCheckout);
  $('[data-checkout-form]')?.addEventListener('submit', handleCheckout);
  $('[data-copy-pix]')?.addEventListener('click', () => { navigator.clipboard.writeText($('[data-pix-code]').value); toast("PIX copiado"); });
  $('[data-modal-close]')?.addEventListener('click', () => $('[data-product-modal]')?.close());
  $$('[data-support-open]').forEach(b => b.addEventListener('click', () => { $('[data-mobile-menu]')?.classList.remove('open'); $('[data-support-modal]').showModal(); }));
  $('[data-support-close]')?.addEventListener('click', () => $('[data-support-modal]')?.close());
  $('[data-support-form]')?.addEventListener('submit', submitSupport);
  $$('[data-menu-toggle]').forEach(b => b.addEventListener('click', () => $('[data-mobile-menu]').classList.toggle('open')));
  $$('[data-menu-link]').forEach(a => a.addEventListener('click', () => $('[data-mobile-menu]').classList.remove('open')));
  $('[data-search-open]')?.addEventListener('click', () => { $('[data-search-panel]').classList.add('open'); $('[data-search-input]').focus(); });
  $('[data-search-close]')?.addEventListener('click', () => { $('[data-search-panel]').classList.remove('open'); $('[data-search-input]').value=''; activeFilter=null; renderProducts(); });
  $('[data-search-input]')?.addEventListener('input', renderProducts);
  $$('[data-outfit]').forEach(sel => sel.addEventListener('change', updateOutfitCanvas));
  $('[data-outfit-add]')?.addEventListener('click', () => { CATS.map(cat => $(`[data-outfit="${cat}"]`)?.value).filter(Boolean).forEach(pid => addToCart(pid)); openCart(); });

  applySettings();
  renderProducts();
  renderCart();
})();
