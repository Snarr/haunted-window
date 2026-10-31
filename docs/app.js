import { WIDTH, HEIGHT, normalize, makeBanner, frameAt } from './display.js';
const $ = id => document.getElementById(id);
let online = false, busy = false, messageId = null, sent = '', pendingId = null;
let font, banner, elapsed = 128 / 36, lastTick = performance.now();
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ctx = $('display').getContext('2d');
ctx.imageSmoothingEnabled = false;

function updateButton() {
  const message = $('message').value.trim();
  $('send').disabled = busy || !online || !message || /[^\x20-\x7E\s]/.test(message);
  $('send').textContent = busy ? 'Sending…' : 'Send to the window';
}
function updatePreview() {
  if (!font) return;
  const text = normalize($('message').value || 'Happy Halloween!');
  if (!text || /[^\x20-\x7E]/.test(text)) {
    banner = null; ctx.clearRect(0, 0, WIDTH, HEIGHT);
    $('preview-note').textContent = 'Use letters, numbers and punctuation to see the preview.';
    return;
  }
  banner = makeBanner(text, font);
  elapsed = 128 / 36; // Begin with the first letter in view, then loop the full pass.
  $('display').setAttribute('aria-label', 'Pixel display preview: ' + text);
  $('preview-note').textContent = '128 × 32 pixels · same font and scroll speed as the window';
  ctx.putImageData(new ImageData(frameAt(banner, elapsed), WIDTH, HEIGHT), 0, 0);
}
$('pause').textContent = paused ? 'Play' : 'Pause';
$('pause').addEventListener('click', () => { paused = !paused; $('pause').textContent = paused ? 'Play' : 'Pause'; });
function animate(now) {
  if (banner && !paused && !document.hidden) {
    elapsed = (elapsed + Math.min((now - lastTick) / 1000, 0.1)) % banner.duration;
    // The physical display updates its text at about 20 frames per second.
    ctx.putImageData(new ImageData(frameAt(banner, Math.floor(elapsed * 20) / 20), WIDTH, HEIGHT), 0, 0);
  }
  lastTick = now;
  requestAnimationFrame(animate);
}
fetch('./pixel-font.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => {
  font = data; updatePreview(); $('pause').disabled = false; requestAnimationFrame(animate);
}).catch(() => { $('preview-note').textContent = 'Preview unavailable. You can still send a message.'; });
$('message').addEventListener('input', () => {
  pendingId = null; $('count').textContent = $('message').value.length + '/60'; updatePreview(); updateButton();
});
async function api(path, data) {
  const response = await fetch(window.WINDOW_API + path, {
    method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Please try again.');
  return result;
}
async function poll() {
  try {
    const status = await api('/status' + (messageId ? '?id=' + encodeURIComponent(messageId) : ''));
    online = status.online;
    $('connection').classList.toggle('on', online);
    $('connection').textContent = online ? 'Online' : 'Offline';
    $('queue').textContent = online
      ? (status.queued ? status.queued + ' message' + (status.queued === 1 ? '' : 's') + ' in the queue.' : 'No messages waiting.')
      : 'The display is offline. Please try again shortly.';
    if (messageId) {
      const delivery = status.message;
      $('receipt').hidden = false; $('sent').textContent = '“' + sent + '”';
      $('delivery').textContent = delivery?.status === 'done' ? 'Your message was displayed.'
        : delivery?.status === 'playing' ? 'Look up! Your message is scrolling.'
        : delivery?.status === 'expired' ? 'Your message expired. Please send it again.'
        : delivery?.ahead ? 'Queued. ' + delivery.ahead + ' message(s) ahead of you.' : 'Sent. Your message is next.';
    }
  } catch {
    online = false; $('connection').classList.remove('on'); $('connection').textContent = 'Connecting…';
    $('queue').textContent = 'Connection lost. Trying again…';
  } finally { updateButton(); setTimeout(poll, 3000); }
}
$('form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  busy = true; $('error').hidden = true; updateButton();
  try {
    pendingId ||= crypto.randomUUID();
    const result = await api('/messages', { id: pendingId, message: $('message').value });
    messageId = result.id; sent = normalize($('message').value); pendingId = null;
    $('receipt').hidden = false; $('delivery').textContent = 'Sent. Watch the window.'; $('sent').textContent = '“' + sent + '”';
  } catch (e) { $('error').textContent = e.message; $('error').hidden = false; }
  finally { busy = false; updateButton(); }
});
poll();
