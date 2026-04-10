# FriendChat
## Features
- **Serverless Discovery**: Uses Gun.js for decentralized room listing.
- **P2P Communication**: Powered by PeerJS (WebRTC) for secure, direct data transfer.
- **Group & Private Chat**: Talk to everyone in the room or have private conversations.
- **File Transfer**: Send files directly to peers using WebRTC data channels.
- **Password Protection**: Secure your rooms with optional passwords.
- **Automatic Deployment**: GitHub Actions workflow included for easy hosting on GitHub Pages.

## How to use
1. Enter your name to start.
2. Create a room (public or password protected) or join an existing one from the lobby.
3. Share the room name/ID with friends.
4. Chat and share files!

## Deployment Instructions
1. Push your changes to the `main` branch.
2. In your GitHub repository, go to **Settings > Pages**.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and deploy your app.
5. Your app will be available at `https://<your-username>.github.io/FriendChat/`.
