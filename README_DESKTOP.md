# KnotAPI Design Studio - Desktop Application

This project is now configured to run as a native desktop application using **Electron**. This allows you to package both the React frontend and the Express backend into a single executable that team members can install and run on their machines.

## 🚀 Getting Started (Development)

To run the desktop app in development mode:

1.  Ensure you have **Node.js** installed.
2.  Ensure your **MySQL** server is running and the database settings in `.env` are correct.
3.  Run the following command in the root directory:
    ```bash
    npm run electron:dev
    ```
    *This will start the Vite dev server, the Express backend, and the Electron shell simultaneously.*

## 📦 Building the Installer (Production)

To create a standalone installer (`.exe`) for your team:

1.  Build the production bundle and the installer:
    ```bash
    npm run electron:build
    ```
2.  Once finished, the installer will be available in the `/release` folder.
    *   Look for `KnotAPI Design Studio Setup 1.0.0.exe`.

## 🛠️ Prerequisites for Team Members

When team members install the application, they will still need access to a **MySQL Database**. You have two options:

1.  **Shared Database (Recommended)**: Update the `.env` file to point to a central MySQL server that everyone can reach.
2.  **Local Database**: Each member installs MySQL locally and the app will initialize the schema on the first run.

## 📂 Project Structure for Electron

*   `electron/main.cjs`: The main process that manages windows and starts the backend.
*   `electron/preload.cjs`: A security layer for IPC communication.
*   `package.json`: Contains `electron-builder` configuration for packaging.

## 🔧 Internal Port Configuration
*   **Frontend**: 6444
*   **Backend**: 6445

---
*Created by KnotAPI AI for Advanced Agentic Coding.*
