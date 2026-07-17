const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Get the user data directory for storing settings
const userDataPath = app.getPath('userData');
const settingsFilePath = path.join(userDataPath, 'settings.json');

// Define your custom top bar menu structure (moved outside functions)
const menuTemplate = [
  {
    label: 'Options',
    submenu: [
      {
        label: 'Change Server URL', accelerator: 'CmdOrCtrl+Alt+S',
        click: async () => {
          const promptPath = path.join(__dirname, 'prompt.html');
          console.log('Showing prompt.html from:', promptPath);
          
          try {
            // Get the currently active window
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.loadFile(promptPath);
            }
          } catch (error) {
            console.error('Error loading prompt.html:', error);
          }
        }
      }
    ]
  }
];

function createCustomMenu(win) {
  // Apply the custom menu globally
  const customMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(customMenu); // Sets it to the top bar
  
  return customMenu;
}



function createWindow(urlParam) {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      nodeIntegration: true,     // Allow this for the prompt page
      contextIsolation: false,   // Allow this for the prompt page
      enableRemoteModule: true   // Allow this for the prompt page
    }
  });

  if (!urlParam) {
    // Check if there's a saved URL
    try {
      if (fs.existsSync(settingsFilePath)) {
        const data = fs.readFileSync(settingsFilePath, 'utf8');
        const settings = JSON.parse(data);
        if (settings.lastUrl) {
          console.log('Found saved URL, loading directly:', settings.lastUrl);
          // Load the saved URL directly without showing prompt
          win.loadURL(settings.lastUrl);
          createCustomMenu(win);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking saved URL:', error);
    }

    // If no saved URL or error, show prompt
    const promptPath = path.join(__dirname, 'prompt.html');
    console.log('Showing prompt.html from:', promptPath);
    
    try {
      win.loadFile(promptPath);
      createCustomMenu(win);
    } catch (error) {
      console.error('Error loading prompt.html:', error);
    }
  } else {
    win.loadURL(urlParam);
    createCustomMenu(win);
  }
}

// IPC handlers for URL persistence
ipcMain.handle('save-url', async (event, url) => {
  try {
    const settings = {
      lastUrl: url,
      timestamp: Date.now()
    };
    
    // Ensure the userData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
    console.log('URL saved successfully:', url);
    return { success: true };
  } catch (error) {
    console.error('Error saving URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-url', async () => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf8');
      const settings = JSON.parse(data);
      console.log('URL loaded successfully:', settings.lastUrl);
      return { url: settings.lastUrl };
    }
    return { url: null };
  } catch (error) {
    console.error('Error loading URL:', error);
    return { url: null };
  }
});

ipcMain.handle('clear-url', async () => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      fs.unlinkSync(settingsFilePath);
      console.log('URL cleared successfully');
    }
    return { success: true };
  } catch (error) {
    console.error('Error clearing URL:', error);
    return { success: false, error: error.message };
  }
});

// Listen for URL from renderer process
ipcMain.on('submit-url', (event, url) => {
  console.log('Received URL from prompt:', url);
  
  // Create new window with the provided URL
  const newWin = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      nodeIntegration: true,     // Allow this for the prompt page
      contextIsolation: false,   // Allow this for the prompt page
      enableRemoteModule: true   // Allow this for the prompt page
    }
  });
  

  newWin.loadURL(url);
  
  // Apply custom menu to the new window
  createCustomMenu(newWin);
});

app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});