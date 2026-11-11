// Reproductor de música — Vampy Music
// Usa la API oficial de YouTube IFrame para reproducir las listas.
// Modo aleatorio = player.setShuffle(true/false) de YouTube.

let player = null;
let apiReady = false;
let currentPlaylist = 0;
let shuffleOn = false;
let progressTimer = null;
let seeking = false;

const $ = (id) => document.getElementById(id);

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return m + ":" + s;
}

function thumb(id) {
  return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
}

// La API de YouTube llama a esta función cuando está lista.
function onYouTubeIframeAPIReady() {
  apiReady = true;
  player = new YT.Player("player", {
    height: "100%",
    width: "100%",
    playerVars: { playsinline: 1, rel: 0 },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerReady() {
  player.setVolume(80);
  loadPlaylist(0, false);
  progressTimer = setInterval(updateProgress, 500);
}

function onPlayerStateChange(e) {
  updatePlayButton();
  if (e.data === YT.PlayerState.PLAYING) {
    updateNowPlaying();
  }
  if (e.data === YT.PlayerState.ENDED) {
    updateNowPlaying();
  }
}

function loadPlaylist(index, autoplay) {
  currentPlaylist = index;
  const pl = PLAYLISTS[index];
  renderTabs();
  renderTrackList();
  $("queueTitle").textContent = pl.name + " · " + pl.tracks.length + " canciones";
  $("nowPlaylist").textContent = pl.name;
  if (player && apiReady) {
    if (autoplay) {
      player.loadPlaylist({ listType: "playlist", list: pl.id });
    } else {
      player.cuePlaylist({ listType: "playlist", list: pl.id });
    }
    player.setShuffle(shuffleOn);
  }
  const first = pl.tracks[0];
  $("nowThumb").src = thumb(first.id);
  $("nowTitle").textContent = first.title;
}

function renderTabs() {
  const tabs = $("tabs");
  tabs.innerHTML = "";
  PLAYLISTS.forEach((pl, i) => {
    const b = document.createElement("button");
    b.className = "tab" + (i === currentPlaylist ? " active" : "");
    b.innerHTML = pl.name + "<small>" + pl.tracks.length + " canciones</small>";
    b.addEventListener("click", () => loadPlaylist(i, true));
    tabs.appendChild(b);
  });
}

function renderTrackList() {
  const list = $("trackList");
  list.innerHTML = "";
  PLAYLISTS[currentPlaylist].tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.dataset.videoId = t.id;
    li.innerHTML =
      '<span class="num">' + (i + 1) + "</span>" +
      '<span class="t">' + escapeHtml(t.title) + "</span>";
    li.addEventListener("click", () => {
      if (player && apiReady) {
        player.playVideoAt(i);
      }
    });
    list.appendChild(li);
  });
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateNowPlaying() {
  if (!player || !player.getVideoData) return;
  const data = player.getVideoData();
  if (!data || !data.video_id) return;
  const pl = PLAYLISTS[currentPlaylist];
  const track = pl.tracks.find((t) => t.id === data.video_id);
  $("nowThumb").src = thumb(data.video_id);
  $("nowTitle").textContent = track ? track.title : data.title || "Reproduciendo…";
  document.querySelectorAll("#trackList li").forEach((li) => {
    li.classList.toggle("playing", li.dataset.videoId === data.video_id);
  });
}

function updatePlayButton() {
  if (!player || !player.getPlayerState) return;
  const state = player.getPlayerState();
  $("btnPlay").textContent = state === YT.PlayerState.PLAYING ? "⏸" : "▶";
}

function updateProgress() {
  if (!player || !player.getDuration || seeking) return;
  const dur = player.getDuration() || 0;
  const cur = player.getCurrentTime() || 0;
  $("timeCurrent").textContent = fmt(cur);
  $("timeTotal").textContent = fmt(dur);
  $("seekRange").value = dur > 0 ? Math.round((cur / dur) * 100) : 0;
  updatePlayButton();
}

function togglePlay() {
  if (!player || !apiReady) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
  updatePlayButton();
}

function toggleShuffle() {
  shuffleOn = !shuffleOn;
  $("btnShuffle").classList.toggle("active", shuffleOn);
  if (player && apiReady) {
    player.setShuffle(shuffleOn);
  }
}

$("btnPlay").addEventListener("click", togglePlay);
$("btnPrev").addEventListener("click", () => player && player.previousVideo());
$("btnNext").addEventListener("click", () => player && player.nextVideo());
$("btnShuffle").addEventListener("click", toggleShuffle);

$("volRange").addEventListener("input", (e) => {
  if (player && apiReady) player.setVolume(Number(e.target.value));
});

$("seekRange").addEventListener("input", () => { seeking = true; });
$("seekRange").addEventListener("change", (e) => {
  seeking = false;
  if (player && apiReady) {
    const dur = player.getDuration() || 0;
    player.seekTo((Number(e.target.value) / 100) * dur, true);
  }
});

// Pinta las pestañas y la lista aunque la API de YouTube tarde en cargar.
renderTabs();
renderTrackList();
$("queueTitle").textContent =
  PLAYLISTS[0].name + " · " + PLAYLISTS[0].tracks.length + " canciones";
$("nowPlaylist").textContent = PLAYLISTS[0].name;
$("nowThumb").src = thumb(PLAYLISTS[0].tracks[0].id);
$("nowTitle").textContent = PLAYLISTS[0].tracks[0].title;
