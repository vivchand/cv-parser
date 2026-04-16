(function() {
    function hideLogo() {
        document.querySelectorAll('img.app-logo').forEach(function(el) {
            el.style.cssText = 'display:none!important;width:0!important;height:0!important;';
        });
    }

    // Run immediately
    hideLogo();

    // Run on DOM ready
    document.addEventListener("DOMContentLoaded", hideLogo);

    // Watch for dynamic changes
    var observer = new MutationObserver(hideLogo);
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
