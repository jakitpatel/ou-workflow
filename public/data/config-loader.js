(function loadAppConfig() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/data/config.js", false); // 👈 synchronous load (only tiny file)
  xhr.send(null);
  if (xhr.status === 200) {
    // Run the config file safely
    new Function(xhr.responseText)();
  } else {
    console.error("Failed to load config.js");
  }
})();