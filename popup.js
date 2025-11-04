// Handle save tabs (current window only)
document.getElementById('save').addEventListener('click', async () => {
  // Query only tabs from the current window
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const urls = tabs.map(tab => tab.url);

  const blob = new Blob([JSON.stringify(urls, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url,
    filename: 'tabs.json',
    saveAs: true
  });
});

// Handle restore tabs
document.getElementById('load').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  try {
    const urls = JSON.parse(text);
    if (!Array.isArray(urls)) throw new Error("Invalid file format");
    for (const url of urls) {
      chrome.tabs.create({ url });
    }
  } catch (err) {
    alert("Error loading file: " + err.message);
  }
});
