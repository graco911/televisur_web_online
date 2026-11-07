(() => {
  const streamUrl = "https://gracodev.stream/televisur/index.m3u8";
  const video = document.getElementById("live-video");
  const overlay = document.getElementById("video-overlay");
  const playButton = document.getElementById("play-button");
  const retryButton = document.getElementById("retry-button");
  const message = document.getElementById("player-message");
  const status = document.getElementById("signal-status");
  const indicator = document.getElementById("signal-indicator");
  let hls;

  function setStatus(text, isError = false) {
    status.textContent = text;
    indicator.classList.toggle("is-error", isError);
  }

  function showError(text) {
    message.textContent = text;
    playButton.hidden = true;
    retryButton.hidden = false;
    setStatus(text, true);
  }

  function prepareStream() {
    retryButton.hidden = true;
    playButton.hidden = false;
    message.textContent = "Conectando con la señal en vivo...";
    setStatus("Conectando con la señal");
    if (hls) {
      hls.destroy();
      hls = undefined;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.load();
      return;
    }

    if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        message.textContent = "La señal está lista para ti";
        setStatus("Señal disponible");
      });
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          showError("No pudimos conectar con la señal. Revisa tu conexión.");
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
          showError("No se pudo reproducir el video. Inténtalo de nuevo.");
        } else {
          showError("La señal no está disponible en este momento.");
        }
        hls.destroy();
        hls = undefined;
      });
      return;
    }

    showError("Este navegador no es compatible con la transmisión HLS.");
  }

  async function startPlayback() {
    if (!video.src && !hls) prepareStream();
    try {
      await video.play();
    } catch {
      message.textContent = "No se pudo iniciar la reproducción. Inténtalo de nuevo.";
      setStatus("Reproducción pausada", true);
    }
  }

  playButton.addEventListener("click", startPlayback);
  retryButton.addEventListener("click", prepareStream);
  video.addEventListener("playing", () => {
    overlay.classList.add("is-hidden");
    setStatus("Transmitiendo en vivo");
  });
  video.addEventListener("waiting", () => setStatus("Cargando señal"));
  video.addEventListener("pause", () => {
    if (!video.ended) {
      overlay.classList.remove("is-hidden");
      playButton.hidden = false;
      retryButton.hidden = true;
      message.textContent = "La señal está lista para ti";
      setStatus("Reproducción pausada");
    }
  });
  video.addEventListener("error", () => {
    if (video.error) showError("No pudimos cargar el video. Revisa tu conexión e inténtalo de nuevo.");
  });
  document.getElementById("year").textContent = new Date().getFullYear();

  prepareStream();
})();
