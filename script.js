/* ============================================================
   Cocoa Crest - Shared JavaScript
   Handles: mobile nav, cart (localStorage), forms, tabs, toast
   Note: Cart data is stored locally in the browser (localStorage).
   ============================================================ */

(function () {
  "use strict";

  var CART_KEY = "cocoaCrestCart";
  var REVIEWS_KEY = "cocoaCrestReviews";

  /* ---------- Helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function money(n) { return "\u20b9" + Number(n).toFixed(0); }

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  /* ---------- Toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  /* ---------- Cart badge in nav ---------- */
  function cartCount() {
    return getCart().reduce(function (sum, it) { return sum + it.qty; }, 0);
  }
  function updateCartBadge() {
    var count = cartCount();
    $all(".cart-count").forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? "" : "none";
    });
  }

  /* ---------- Add to cart ---------- */
  function addToCart(product) {
    var cart = getCart();
    var existing = cart.filter(function (it) { return it.id === product.id; })[0];
    if (existing) { existing.qty += 1; }
    else { cart.push({ id: product.id, name: product.name, price: product.price, img: product.img, qty: 1 }); }
    saveCart(cart);
    toast(product.name + " added to cart");
  }

  function bindAddButtons() {
    $all("[data-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        addToCart({
          id: btn.getAttribute("data-id"),
          name: btn.getAttribute("data-name"),
          price: parseFloat(btn.getAttribute("data-price")),
          img: btn.getAttribute("data-img") || ""
        });
      });
    });
  }

  /* ---------- Mobile nav ---------- */
  function bindNav() {
    var toggle = $(".nav-toggle");
    var links = $(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () { links.classList.toggle("open"); });
    }
    // Mark active link based on current file name
    var path = location.pathname.split("/").pop() || "index.html";
    $all(".nav-links a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === path) { a.classList.add("active"); }
    });
  }

  /* ---------- Cart page rendering ---------- */
  function renderCartPage() {
    var wrap = $("#cart-root");
    if (!wrap) return;

    var cart = getCart();
    var SHIPPING = 99;

    if (!cart.length) {
      wrap.innerHTML =
        '<div class="empty-state">' +
          '<div class="big"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></div>' +
          '<h2>Your cart is empty</h2>' +
          '<p class="mt-1">Looks like you haven\'t added anything yet.</p>' +
          '<a href="shop.html" class="btn mt-2">Start Shopping</a>' +
        '</div>';
      return;
    }

    var rows = cart.map(function (it) {
      var line = it.price * it.qty;
      return (
        '<tr data-id="' + it.id + '">' +
          '<td data-label="Product"><div class="item">' +
            (it.img ? '<img src="' + it.img + '" alt="' + it.name + '">' : '') +
            '<strong>' + it.name + '</strong>' +
          '</div></td>' +
          '<td data-label="Price">' + money(it.price) + '</td>' +
          '<td data-label="Quantity">' +
            '<div class="qty">' +
              '<button data-act="dec">&minus;</button>' +
              '<span>' + it.qty + '</span>' +
              '<button data-act="inc">+</button>' +
            '</div>' +
          '</td>' +
          '<td data-label="Subtotal">' + money(line) + '</td>' +
          '<td data-label=""><button class="remove" data-act="remove">Remove</button></td>' +
        '</tr>'
      );
    }).join("");

    var subtotal = cart.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    var total = subtotal + SHIPPING;

    wrap.innerHTML =
      '<div class="cart-layout">' +
        '<div>' +
          '<table class="cart-table"><thead><tr>' +
            '<th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table>' +
          '<a href="shop.html" class="btn-outline btn mt-2" style="display:inline-block;">&larr; Continue Shopping</a>' +
        '</div>' +
        '<div class="summary">' +
          '<h3>Order Summary</h3>' +
          '<div class="line"><span>Subtotal</span><span>' + money(subtotal) + '</span></div>' +
          '<div class="line"><span>Shipping</span><span>' + money(SHIPPING) + '</span></div>' +
          '<div class="total"><span>Total</span><span>' + money(total) + '</span></div>' +
          '<button class="btn btn-block" id="checkout-btn">Proceed to Checkout</button>' +
          '<p class="muted mt-1" style="font-size:13px;text-align:center;">Free returns within 30 days of delivery.</p>' +
        '</div>' +
      '</div>';

    // Bind row actions
    $all("#cart-root tr[data-id]").forEach(function (tr) {
      var id = tr.getAttribute("data-id");
      $all("[data-act]", tr).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var act = btn.getAttribute("data-act");
          var c = getCart();
          var item = c.filter(function (x) { return x.id === id; })[0];
          if (!item) return;
          if (act === "inc") item.qty += 1;
          if (act === "dec") item.qty = Math.max(1, item.qty - 1);
          if (act === "remove") c = c.filter(function (x) { return x.id !== id; });
          saveCart(c);
          renderCartPage();
        });
      });
    });

    var checkout = $("#checkout-btn");
    if (checkout) {
      checkout.addEventListener("click", function () {
        toast("Thank you! Your order has been placed.");
        saveCart([]);
        setTimeout(renderCartPage, 600);
      });
    }
  }

  /* ---------- Generic form handler (contact, feedback, account, newsletter) ---------- */
  function bindForms() {
    $all("form[data-demo]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var msg = $(".form-msg", form);
        if (msg) {
          msg.classList.add("show");
          var custom = form.getAttribute("data-msg");
          if (custom) msg.textContent = custom;
        } else {
          toast("Submitted successfully!");
        }
        form.reset();
      });
    });
  }

  /* ---------- Recipe data + modal ---------- */
  var RECIPES = {
    brownies: {
      title: "Fudgy Cocoa Brownies",
      time: "45 min",
      difficulty: "Easy",
      serves: "9 squares",
      ingredients: [
        "1/2 cup (115g) butter, melted",
        "1 cup (200g) sugar",
        "2 large eggs",
        "1 tsp vanilla extract",
        "1/3 cup (40g) Cocoa Crest cocoa powder",
        "1/2 cup (65g) flour",
        "1/4 tsp salt",
        "1/4 tsp baking powder"
      ],
      steps: [
        "Preheat oven to 175&deg;C (350&deg;F). Grease and line a small baking pan.",
        "Whisk melted butter and sugar together until combined.",
        "Beat in eggs and vanilla until smooth.",
        "Sift in cocoa powder, flour, salt and baking powder. Fold gently until just combined.",
        "Pour batter into the pan and spread evenly.",
        "Bake 20&ndash;25 minutes until a toothpick comes out with a few moist crumbs.",
        "Cool completely before slicing into squares."
      ]
    },
    hotchoco: {
      title: "Classic Hot Chocolate",
      time: "10 min",
      difficulty: "Easy",
      serves: "2 cups",
      ingredients: [
        "2 cups (500ml) whole milk",
        "3 tbsp Cocoa Crest drinking chocolate blend",
        "1 tbsp sugar (adjust to taste)",
        "1 pinch salt",
        "Whipped cream, for topping (optional)"
      ],
      steps: [
        "Heat milk in a saucepan over medium heat until warm, not boiling.",
        "Whisk in drinking chocolate blend, sugar and salt until fully dissolved.",
        "Continue heating for 2&ndash;3 minutes, whisking often, until steaming.",
        "Pour into mugs and top with whipped cream if desired."
      ]
    },
    cookies: {
      title: "Chocolate Chip Cookies",
      time: "30 min",
      difficulty: "Easy",
      serves: "16 cookies",
      ingredients: [
        "1/2 cup (115g) butter, softened",
        "1/2 cup (100g) brown sugar",
        "1/4 cup (50g) white sugar",
        "1 large egg",
        "1 tsp vanilla extract",
        "1 1/4 cups (155g) flour",
        "1/2 tsp baking soda",
        "1/4 tsp salt",
        "3/4 cup (130g) Cocoa Crest chocolate chips"
      ],
      steps: [
        "Preheat oven to 190&deg;C (375&deg;F) and line a baking tray.",
        "Cream butter with both sugars until light and fluffy.",
        "Beat in egg and vanilla.",
        "Mix in flour, baking soda and salt until just combined.",
        "Fold in chocolate chips.",
        "Scoop rounded spoonfuls onto the tray, spaced apart.",
        "Bake 9&ndash;11 minutes until edges are golden. Cool on the tray for 5 minutes before moving."
      ]
    },
    cake: {
      title: "Chocolate Raspberry Cake",
      time: "1 hr 30 min",
      difficulty: "Medium",
      serves: "8 slices",
      ingredients: [
        "1 3/4 cups (220g) flour",
        "3/4 cup (65g) Cocoa Crest cocoa powder",
        "1 1/2 tsp baking powder",
        "1 1/2 tsp baking soda",
        "2 cups (400g) sugar",
        "2 large eggs",
        "1 cup (240ml) milk",
        "1 cup (240ml) hot water",
        "1/2 cup (120ml) oil",
        "1 1/2 cups (200g) fresh raspberries",
        "2 cups whipped cream, for filling and topping"
      ],
      steps: [
        "Preheat oven to 175&deg;C (350&deg;F). Grease two round cake pans.",
        "Whisk together flour, cocoa powder, baking powder, baking soda and sugar.",
        "Add eggs, milk and oil; beat until smooth.",
        "Carefully stir in hot water (batter will be thin). Divide between pans.",
        "Bake 30&ndash;35 minutes until a toothpick comes out clean. Cool completely.",
        "Layer cakes with whipped cream and half the raspberries in the middle.",
        "Frost the top and sides, then decorate with remaining raspberries."
      ]
    },
    cupcakes: {
      title: "Cocoa Cupcakes",
      time: "40 min",
      difficulty: "Easy",
      serves: "12 cupcakes",
      ingredients: [
        "1 1/3 cups (165g) flour",
        "1/2 cup (45g) Cocoa Crest cocoa powder",
        "1 tsp baking powder",
        "1/2 tsp baking soda",
        "1/2 cup (115g) butter, softened",
        "1 cup (200g) sugar",
        "2 large eggs",
        "1/2 cup (120ml) milk",
        "Frosting of your choice, to top"
      ],
      steps: [
        "Preheat oven to 175&deg;C (350&deg;F) and line a cupcake tray with liners.",
        "Whisk flour, cocoa powder, baking powder and baking soda together.",
        "Cream butter and sugar until fluffy, then beat in eggs one at a time.",
        "Add dry ingredients and milk alternately, mixing until just combined.",
        "Divide batter among liners, filling each about two-thirds full.",
        "Bake 18&ndash;20 minutes until a toothpick comes out clean. Cool before frosting."
      ]
    },
    pannacotta: {
      title: "White Chocolate Dessert",
      time: "20 min + chilling",
      difficulty: "Easy",
      serves: "4 cups",
      ingredients: [
        "200g Cocoa Crest white chocolate, chopped",
        "1 cup (240ml) cream",
        "1 cup (240ml) milk",
        "2 tsp gelatin (or 1 tsp agar agar)",
        "2 tbsp cold water",
        "1 tsp vanilla extract",
        "Fresh berries, to serve"
      ],
      steps: [
        "Sprinkle gelatin over cold water and let it bloom for 5 minutes.",
        "Warm cream and milk in a saucepan over low heat, do not boil.",
        "Remove from heat and stir in white chocolate until melted and smooth.",
        "Whisk in the bloomed gelatin and vanilla until fully dissolved.",
        "Pour into serving cups and chill for at least 4 hours, or until set.",
        "Top with fresh berries before serving."
      ]
    }
  };

  function bindRecipeModal() {
    var overlay = $("#recipe-modal-overlay");
    if (!overlay) return;
    var body = $("#recipe-modal-body");
    var closeBtn = $("#recipe-modal-close");

    function openRecipe(key) {
      var r = RECIPES[key];
      if (!r) return;
      body.innerHTML =
        '<h2>' + r.title + '</h2>' +
        '<div class="meta"><span><svg class="icon-svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="2" x2="12" y2="5"/></svg> ' + r.time + '</span><span><svg class="icon-svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/></svg> ' + r.difficulty + '</span><span><svg class="icon-svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 2v7a2 2 0 0 0 4 0V2"/><line x1="6" y1="9" x2="6" y2="21"/><path d="M18 2c-1.7 0-3 1.8-3 5s1.3 5 3 5"/><line x1="18" y1="2" x2="18" y2="21"/></svg> ' + r.serves + '</span></div>' +
        '<h3>Ingredients</h3>' +
        '<ul>' + r.ingredients.map(function (i) { return '<li>' + i + '</li>'; }).join("") + '</ul>' +
        '<h3>Method</h3>' +
        '<ol>' + r.steps.map(function (s) { return '<li>' + s + '</li>'; }).join("") + '</ol>';
      overlay.classList.add("show");
    }
    function closeRecipe() { overlay.classList.remove("show"); }

    $all("[data-recipe]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        openRecipe(link.getAttribute("data-recipe"));
      });
    });
    if (closeBtn) closeBtn.addEventListener("click", closeRecipe);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeRecipe();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeRecipe();
    });
  }

  /* ---------- Reviews (feedback page) ---------- */
  function getStoredReviews() {
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveStoredReviews(list) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(list));
  }
  function reviewHTML(rev) {
    var stars = "";
    for (var i = 1; i <= 5; i++) { stars += (i <= rev.rating) ? "&#9733;" : "&#9734;"; }
    var initial = rev.name ? rev.name.charAt(0).toUpperCase() : "?";
    return (
      '<div class="review new-review">' +
        '<div class="rating">' + stars + '</div>' +
        (rev.product ? '<div class="muted" style="font-size:13px;margin-bottom:4px;">On: ' + rev.product + '</div>' : '') +
        '<p>"' + rev.text + '"</p>' +
        '<div class="who"><div class="avatar">' + initial + '</div><div><strong>' + rev.name + '</strong><small>Just now</small></div></div>' +
      '</div>'
    );
  }
  function renderStoredReviews() {
    var list = $("#reviews-list");
    if (!list) return;
    var stored = getStoredReviews();
    // Insert newest-first, right before any default reviews already in the markup
    stored.slice().reverse().forEach(function (rev) {
      list.insertAdjacentHTML("afterbegin", reviewHTML(rev));
    });
  }
  function bindFeedbackForm() {
    var form = $("#feedback-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#fb-name", form).value.trim() || "Anonymous";
      var text = $("#fb-text", form).value.trim();
      var product = $("#fb-product", form).value;
      if (product === "Select a product") product = "";
      var ratingInput = form.querySelector('input[name="rate"]:checked');
      var rating = ratingInput ? parseInt(ratingInput.value, 10) : 5;

      var rev = { name: name, text: text, product: product, rating: rating };
      var stored = getStoredReviews();
      stored.push(rev);
      saveStoredReviews(stored);

      var list = $("#reviews-list");
      if (list) list.insertAdjacentHTML("afterbegin", reviewHTML(rev));

      var msg = $(".form-msg", form);
      if (msg) {
        msg.classList.add("show");
        var custom = form.getAttribute("data-msg");
        if (custom) msg.textContent = custom;
      }
      form.reset();
      var s5 = $("#s5", form);
      if (s5) s5.checked = true;
    });
  }

  /* ---------- Shop filters & sorting ---------- */
  function bindShopFilters() {
    var grid = $("#shop-grid");
    if (!grid) return;
    var chips = $all(".filter-chip");
    var sortSelect = $("#sort-select");
    var noResults = $("#no-results");
    var cards = $all(".card", grid);
    var activeFilter = "all";

    function applyFilterAndSort() {
      // Filter
      var visibleCount = 0;
      cards.forEach(function (card) {
        var matches = activeFilter === "all" || card.getAttribute("data-cat") === activeFilter;
        card.style.display = matches ? "" : "none";
        if (matches) visibleCount++;
      });
      if (noResults) noResults.style.display = visibleCount === 0 ? "" : "none";

      // Sort (reorders the visible + hidden cards together, then re-appends)
      var sortValue = sortSelect ? sortSelect.value : "featured";
      var sorted = cards.slice();
      if (sortValue === "price-asc") {
        sorted.sort(function (a, b) { return parseFloat(a.getAttribute("data-price")) - parseFloat(b.getAttribute("data-price")); });
      } else if (sortValue === "price-desc") {
        sorted.sort(function (a, b) { return parseFloat(b.getAttribute("data-price")) - parseFloat(a.getAttribute("data-price")); });
      } else if (sortValue === "name-asc") {
        sorted.sort(function (a, b) { return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name")); });
      }
      // "featured" keeps original order - do nothing
      if (sortValue !== "featured") {
        sorted.forEach(function (card) { grid.appendChild(card); });
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        activeFilter = chip.getAttribute("data-filter");
        applyFilterAndSort();
      });
    });
    if (sortSelect) {
      sortSelect.addEventListener("change", applyFilterAndSort);
    }
  }

  /* ---------- Tabs (account page) ---------- */
  function bindTabs() {
    $all(".tabs").forEach(function (tabs) {
      var btns = $all(".tab-btn", tabs);
      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = btn.getAttribute("data-tab");
          btns.forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          $all(".tab-panel").forEach(function (p) {
            p.classList.toggle("active", p.id === target);
          });
        });
      });
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    bindNav();
    bindAddButtons();
    bindForms();
    bindTabs();
    bindRecipeModal();
    bindFeedbackForm();
    bindShopFilters();
    renderStoredReviews();
    renderCartPage();
    updateCartBadge();
  });
})();
