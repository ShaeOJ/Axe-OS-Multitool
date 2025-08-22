# AxeOS Live!

This is a Next.js application created with Firebase Studio to monitor Bitaxe and other Axe OS based miners.

## Why You Need to Run This App Locally

To monitor miners on your private home network, this application must also be running on a computer within that same network. The web-based version of this tool cannot directly access local IP addresses for security reasons. 
By running it locally, you enable direct communication between the dashboard and your miners.

## How to Run as a Standalone LocalApp

You can run this application directly on your computer. It will be accessible through your web browser but will operate locally, connecting to miners on your home network.

### Prerequisites

Before you begin, make sure you have the following installed:
- **Node.js**: You can download it from [nodejs.org](https://nodejs.org/). Version 18 or higher is recommended.
- **npm**: This is the Node.js package manager and is automatically installed with Node.js.

### Step-by-Step Instructions

1.  **Download the Code**:
    Look for an "Export" or "Download Code" option within the file menu to download the project's source code as a zip file. Unzip it on your local machine, replacing any previous versions.

2.  **Open a Terminal**:
    Navigate to the project's root directory using a terminal or command prompt.

3.  **Install Dependencies**:
    The first time you set up the project, run the following command to install all the necessary packages. You do not need to run this again unless you add new packages.
    ```bash
    npm install
    ```

4.  **Run the Application**:
    Once the installation is complete, start the local development server with this command:
    ```bash
    npm run dev
    ```
    Any changes you make to the UI code will update automatically in your browser as long as this command is running.

5.  **Access the App**:
    You'll see a message in the terminal indicating that the server is running, usually on `http://localhost:9002`. Open this URL in your web browser to use the AxeOS Live! dashboard.

6.  **Stop the Application**:
    To stop the application, return to the terminal window where you ran `npm run dev` and press `Ctrl+C` on your keyboard.

That's it! The application is now running locally on your machine. You can add your miners by their local IP address and monitor them as long as you keep the terminal window running.

## Features

- **Add Miners by IP**: Easily add your miners by their local IP address.
- **Real-time Monitoring**: View live data from your miners, including hashrate, temperature, frequency, and more.
- **Persistent Configuration**: Your list of miners is saved in your browser, so you don't have to add them again every time.
- **Historical Performance**: See a visual chart of your miner's hashrate and temperature over time.
- **Responsive Design**: Monitor your miners from your desktop or mobile device.
- **Auto-Tuning**: Automatically adjusts miner frequency and voltage to maintain target temperatures for optimal performance.
