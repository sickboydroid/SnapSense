const captureButton = document.getElementById('capture');
const shortcutHelp = document.getElementById('shortcut-help');
const commandEl = document.getElementById('capture-command');
const statusEl = document.getElementById('status');

captureButton.addEventListener('click', () => window.snapsense.startCapture());
document.getElementById('copy-command').addEventListener('click', () => window.snapsense.copyCaptureCommand());
window.snapsense.onLauncherStatus((message) => { statusEl.textContent = message; });
window.snapsense.getLauncherInfo().then(({ captureCommand, wayland }) => {
  if (wayland && captureCommand) {
    commandEl.textContent = captureCommand;
    shortcutHelp.hidden = false;
  }
}).catch(() => {});
