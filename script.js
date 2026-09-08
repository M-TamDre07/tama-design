/* Compatibility entrypoint for the legacy root URL. */
(function () {
  var script = document.createElement('script');
  script.type = 'module';
  script.src = '/js/script.js';
  script.defer = true;
  document.head.appendChild(script);
})();
