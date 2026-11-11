(() => {
  const streamUrl = "https://gracodev.stream/hls/televisur/index.m3u8";
  const video = document.getElementById("live-video");
  const overlay = document.getElementById("video-overlay");
  const playButton = document.getElementById("play-button");
  const retryButton = document.getElementById("retry-button");
  const message = document.getElementById("player-message");
  const status = document.getElementById("signal-status");
  const indicator = document.getElementById("signal-indicator");
  let hls;
  let streamReady = false;
  let hasError = false;
  let reconnectTimer;
  let retryAttempt = 0;
  const maxRetries = 3;
  const retryDelays = [1000, 3000, 7000];

  function setStatus(text, isError = false) {
    status.textContent = text;
    indicator.classList.toggle("is-error", isError);
  }

  function showError(text) {
    hasError = true;
    streamReady = false;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    overlay.classList.remove("is-hidden");
    message.textContent = text;
    playButton.hidden = true;
    playButton.disabled = true;
    retryButton.hidden = false;
    setStatus("Sin señal", true);
  }

  function markStreamReady() {
    if (hasError) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    retryAttempt = 0;
    streamReady = true;
    playButton.disabled = false;
    message.textContent = "La señal está lista para ti";
    setStatus("Señal disponible");
  }

  function scheduleReconnect() {
    if (reconnectTimer || hasError) return;
    if (retryAttempt >= maxRetries) {
      showError("No pudimos conectar con la señal. Inténtalo de nuevo más tarde.");
      return;
    }

    retryAttempt += 1;
    streamReady = false;
    overlay.classList.remove("is-hidden");
    playButton.hidden = false;
    playButton.disabled = true;
    retryButton.hidden = true;
    message.textContent = "La señal se interrumpió. Reconectando automáticamente...";
    setStatus(`Reconectando (${retryAttempt}/${maxRetries})`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      loadStream();
    }, retryDelays[retryAttempt - 1]);
  }

  function loadStream() {
    hasError = false;
    streamReady = false;
    overlay.classList.remove("is-hidden");
    retryButton.hidden = true;
    playButton.hidden = false;
    playButton.disabled = true;
    message.textContent = "Conectando con la señal en vivo...";
    setStatus("Conectando con la señal");
    if (hls) {
      hls.destroy();
      hls = undefined;
    }
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.load();
      return;
    }

    if (window.Hls && window.Hls.isSupported()) {
      const currentHls = new window.Hls();
      hls = currentHls;
      currentHls.loadSource(streamUrl);
      currentHls.attachMedia(video);
      currentHls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (hls !== currentHls) return;
        if (!data.fatal) return;
        scheduleReconnect();
      });
      return;
    }

    showError("Este navegador no es compatible con la transmisión HLS.");
  }

  function prepareStream() {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    retryAttempt = 0;
    loadStream();
  }

  async function startPlayback() {
    if (!streamReady || video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      playButton.disabled = true;
      message.textContent = "La señal aún se está cargando...";
      setStatus("Cargando señal");
      return;
    }

    try {
      await video.play();
    } catch {
      message.textContent = "No se pudo iniciar la reproducción. Pulsa reproducir para intentarlo de nuevo.";
      setStatus("Reproducción pausada", true);
    }
  }

  playButton.addEventListener("click", startPlayback);
  retryButton.addEventListener("click", prepareStream);
  video.addEventListener("canplay", markStreamReady);
  video.addEventListener("playing", () => {
    if (hasError) return;
    overlay.classList.add("is-hidden");
    setStatus("Transmitiendo en vivo");
  });
  video.addEventListener("waiting", () => setStatus("Cargando señal"));
  video.addEventListener("pause", () => {
    if (!video.ended && streamReady) {
      overlay.classList.remove("is-hidden");
      playButton.hidden = false;
      playButton.disabled = false;
      retryButton.hidden = true;
      message.textContent = "La señal está lista para ti";
      setStatus("Reproducción pausada");
    }
  });
  video.addEventListener("error", () => {
    if (video.error && !hasError) {
      scheduleReconnect();
    }
  });

  const filters = document.querySelectorAll(".news-filter");
  const stories = document.querySelectorAll(".story-grid .story-card");
  const featuredStory = document.querySelector(".featured-story");
  const emptyStories = document.querySelector(".empty-stories");

  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const selectedCategory = filter.dataset.filter;
      const showFeatured = selectedCategory === "all" || featuredStory.dataset.category === selectedCategory;
      let visibleStories = showFeatured ? 1 : 0;
      featuredStory.hidden = !showFeatured;

      filters.forEach((item) => {
        const isSelected = item === filter;
        item.classList.toggle("is-active", isSelected);
        item.setAttribute("aria-pressed", String(isSelected));
      });

      stories.forEach((story) => {
        const isVisible = selectedCategory === "all" || story.dataset.category === selectedCategory;
        story.hidden = !isVisible;
        if (isVisible) visibleStories += 1;
      });

      emptyStories.hidden = visibleStories > 0;
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  prepareStream();
})();
