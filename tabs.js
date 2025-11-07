// Function to get all windows and their tabs
async function displayWindowsAndTabs() {
    const windows = await chrome.windows.getAll({ populate: true });
    const container = document.getElementById('windows-container');
    container.innerHTML = ''; // Clear existing content

    windows.forEach((window, index) => {
        console.log(window)
        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';

        const windowTitle = document.createElement('div');
        windowTitle.className = 'window-title';
        windowTitle.textContent = `Window ${index + 1} (${window.tabs.length} tabs)`;
        windowDiv.appendChild(windowTitle);

        window.tabs.forEach(tab => {
            const tabDiv = document.createElement('div');
            tabDiv.className = 'tab';

            // Favicon
            const favicon = document.createElement('img');
            favicon.src = tab.favIconUrl || 'chrome://favicon/';
            tabDiv.appendChild(favicon);

            // Tab title
            const title = document.createElement('span');
            title.className = 'tab-title';
            title.textContent = tab.title;
            tabDiv.appendChild(title);

            // Tab URL
            const url = document.createElement('span');
            url.className = 'tab-url';
            url.textContent = tab.url;
            tabDiv.appendChild(url);

            // Make the tab div clickable to focus that tab
            tabDiv.addEventListener('click', () => {
                chrome.windows.update(window.id, { focused: true });
                chrome.tabs.update(tab.id, { active: true });
            });

            windowDiv.appendChild(tabDiv);
        });

        container.appendChild(windowDiv);
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', displayWindowsAndTabs);

// Refresh every 5 seconds to keep the list updated
// setInterval(displayWindowsAndTabs, 50000);