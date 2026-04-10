# FriendChat

FriendChat is a fully serverless, P2P chat application built with React, Vite, Tailwind CSS, PeerJS, and Gun.js. It requires no backend server for message relaying or room discovery.

## 🚀 Live Demo
[https://TheStrongestOfTomorrow.github.io/FriendChat/](https://TheStrongestOfTomorrow.github.io/FriendChat/)

## ✨ Features
- **Decentralized Discovery**: Uses Gun.js for P2P room listing.
- **P2P Messaging**: Powered by PeerJS (WebRTC) for secure, direct data transfer.
- **Group & Private Chat**: Talk to everyone in the room or have private DMs.
- **File Transfer**: Send files directly to peers using WebRTC data channels.
- **Premium UI**: Modern "Fluid Ledger" design system with Manrope and Inter fonts.
- **Automatic Deployment**: GitHub Actions workflow included for easy hosting on GitHub Pages.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, TypeScript
- **Styling**: Tailwind CSS
- **P2P Networking**: PeerJS (WebRTC)
- **Decentralized Database**: Gun.js
- **Icons**: Lucide React

## 📦 Local Development
1. Clone the repo
2. Run `npm install`
3. Run `npm run dev`

## 🌍 Deployment Instructions
1. In your GitHub repository, go to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push changes to the `main` branch, and the workflow will handle the rest.

## 🆕 New Features
- **Typing Indicators**: See when others are typing in real-time.
- **Message Reactions**: Express yourself with emojis on any message.
- **Media Previews**: Instant previews for shared images and videos.
- **Persistent History**: Chat history is saved locally in your browser (IndexedDB).
- **Host Controls**: Hosts can permanently stop and unlist rooms.
- **Join by Code**: Direct access to rooms using host peer IDs.
