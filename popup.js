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

// Handle showing the tab manager
document.getElementById('manage').addEventListener('click', () => {
  chrome.tabs.create({
    url: 'tabs.html',
    active: true
  });
});

// Generate a unique workspace ID
function generateWorkspaceId() {
  return 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Handle creating a managed window
document.getElementById('createWorkspace').addEventListener('click', async () => {
  // Generate a new workspace ID
  const workspaceId = generateWorkspaceId();

  // Get existing workspaces
  const result = await chrome.storage.local.get('workspaces');
  const workspaces = result.workspaces || {};

  // Create new workspace data
  workspaces[workspaceId] = {
    created: Date.now(),
    lastAccessed: Date.now()
  };

  // Save updated workspaces
  await chrome.storage.local.set({ workspaces });

  // Create a new window
  const newWindow = await chrome.windows.create({
    focused: true,
    state: 'normal'
  });

  // Create the pinned workspace tab in the new window
  await chrome.tabs.create({
    windowId: newWindow.id,
    url: `workspace.html?id=${workspaceId}`,
    pinned: true,
    active: false,
    index: 0  // This ensures it's the leftmost tab
  });
});
