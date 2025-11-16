Stream Dashboard Project
========================

This document provides instructions for setting up and running the Stream Dashboard project.

## Project Overview

The Stream Dashboard is a full-stack web application. It features a Node.js backend server and a React frontend client.

## Project Structure

The project is organized into two main directories:

- `/client`: Contains the frontend application, built with React, TypeScript, and Vite.
- `/server`: Contains the backend Node.js server.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- Node.js (v18 or later recommended)
- A package manager like `npm`, `yarn`, or `pnpm`

## Setup and Installation

1.  **Clone the repository** to your local machine.

2.  **Install Server Dependencies**:
    Navigate to the server directory and install the required packages.
    ```bash
    cd server
    npm install
    ```

3.  **Install Client Dependencies**:
    From the root directory, navigate to the client directory and install its packages.
    ```bash
    cd client
    npm install
    ```

## Running the Application

You will need to run the client and server in separate terminal windows.

1.  **Start the Server**:
    In the `/server` directory, run the following command to start the backend server with `nodemon`, which will automatically restart on file changes.
    ```bash
    npm start 
    ```
    The server will typically be available at `http://localhost:4000`.

2.  **Start the Client**:
    In the `/client` directory, run the following command to start the Vite development server.
    ```bash
    npm run dev
    ```
    The client application will be available at `http://localhost:5173` (or another port if 5173 is in use).