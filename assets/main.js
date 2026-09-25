(function(){
  var header = document.querySelector('header');
  if (!header) return;
  var onScroll = function(){
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});
})();
(function(){
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  toggle.addEventListener('click', function(){
    var open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  menu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ menu.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); });
  });
})();
(function(){
  var dropdowns = document.querySelectorAll('details.has-dropdown');
  document.addEventListener('click', function(e){
    dropdowns.forEach(function(d){
      if (d.open && !d.contains(e.target)) d.open = false;
    });
  });
})();
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, {threshold:.2});
  els.forEach(function(el){ io.observe(el); });
})();
