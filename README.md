*This project has been created as part of the 42 curriculum by yliew, hyan-yi, agan.*

# 🏓 Parsley Pong

## Description

**Parsley Pong** is a modern multiplayer implementation of the classic **Pong** game, developed as part of the **42 curriculum**.  
The goal of this project is to design and build a **full-stack web application** that combines real-time gameplay, user authentication, and persistent data storage.

---

## Instructions

### Prerequisites

Ensure the following tools are installed on your system:

- **Docker**
- **Docker Compose**
- **Git**

## Environment Setup

1. Clone the repository
   ```bash
   git clone git@github.com:yliewx/transcend.git parsley-pong
   cd parsley-pong
   ```

2. Create a `.env` file at the project root (refer to the `env.example` provided)

3. Add SSL certificates for Nginx
   ```
   nginx/ssl/
   ├── transcend.crt
   └── transcend.key
   ```

4. Add Cloudflare Tunnel configuration
   ```
   cloudflared/conf/
   ├── cert.pem
   └── config.yml
   └── <tunnel_config>.json
   ```

5. Start the application
   ```
   make
   ```

6. Access the application at https://parsleypong.com



# Parsley Pong - Project Documentation

## 👥 Team Information

| Name         | Assigned Role(s)                                              | Responsibilities                                                                                                                                                                                                                  |
| :----------- | :------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hyan-yi** | **Product Owner (PO), Developer** | Defines product vision and feature priorities, designs system architecture and database schema (ERD), makes technology stack decisions, reviews critical code changes, validates completed work, and implements core game logic.  |
| **yliew** | **Project Manager (PM) / Scrum Master, Technical Lead / Architect, Developer**    | Organizes team meetings and sprint planning, tracks progress and deadlines, manages risks and blockers, ensures team communication, and implements backend features including websockets, and API security. |
| **agan** | **Developer**                                        | Implements frontend features, participates in code reviews, testing, QA, and documentation.                                                                |



---

## 🛠 Project Management

* **Task Distribution:** Tasks were managed via **Trello**
* **Communication:**
    * **Discord:** Used for daily asynchronous updates and voice meetings.
    * **GitHub Pull Requests:** Every piece of code was peer-reviewed before being merged into the `main` branch.



---


## 💻 Technical Stack (Built With)

### **Frontend**
* **Language:** **TypeScript** for type-safe UI development.
* **Styling:** **Tailwind CSS** for rapid, responsive utility-first styling.
* **Bundler:** **Webpack** for optimized asset delivery and module management.

### **Backend**
* **Runtime/Framework:** **Node.js** using the **Fastify** framework for high-performance, low-overhead routing.
* **Real-Time:** **WebSockets** for low-latency game state synchronization and live chat.
* **Security:**
    * **JWT (JSON Web Tokens):** For stateless session management.
    * **2FA:** Multi-channel One-Time Password (OTP) support (App/Email/SMS).
    * **OAuth2:** Google OAuth integration for simplified user onboarding.

### **Database**
* **System:** **SQLite**
* **Justification:** Chosen for its lightweight, file-based nature.

### **Deployment & Infrastructure**
* **Containerization:** **Docker** and **Docker Compose** for service orchestration.
* **Web Server:** **Nginx** acting as a reverse proxy.
* **Networking:** **Cloudflared** for secure tunneling and exposing the local environment to the web without opening router ports.


---
## Database Schema Summary

## Core Entities

### users

Stores all registered users and authentication-related data.

- id (INTEGER, PK)
- username (TEXT, UNIQUE)
- email (TEXT, UNIQUE)
- password (TEXT)
- google_id (TEXT, UNIQUE, nullable)
- otp_verified (BOOLEAN)
- otp_secret, otp_auth_url, otp_option, otp_contact
- created_at (DATETIME)

**Purpose**

- Supports local authentication, Google OAuth2, and OTP-based 2FA.
- Central entity referenced by most other tables.

---

### refresh_tokens

Stores refresh tokens for secure session management.

- user_id (INTEGER, PK, FK → users.id)
- token_id (TEXT, UNIQUE)
- expires_at (DATETIME)
- created_at (DATETIME)

**Purpose**

- Enables secure JWT validation and token refresh with automatic cleanup on user deletion.

---

### profiles

Stores public-facing user profile information.

- user_id (INTEGER, PK, FK → users.id)
- display_name (TEXT)
- avatar_path (TEXT)
- created_at (DATETIME)

**Relationship**

- One-to-one with users.

---

## Social Features

### friend_requests

Manages friend request lifecycle.

- id (INTEGER, PK)
- sender_id (FK → users.id)
- recipient_id (FK → users.id)
- status (pending, accepted, declined, cancelled)
- created_at, updated_at

**Constraints**

- Unique (sender_id, recipient_id) to prevent duplicates.

---

### friendships

Stores confirmed friendships.

- id (INTEGER, PK)
- user_id (FK → users.id)
- friend_id (FK → users.id)
- created_at

**Purpose**

- Represents bidirectional friendships.
- Enforced uniqueness prevents duplicate relationships.

---

## Gameplay & Match History

### match_history

Stores all completed Pong matches.

- id (INTEGER, PK)
- player1_id, player2_id (FK → users.id)
- winner_id (FK → users.id, nullable)
- left_score, right_score
- tournament_id
- match_date, created_at

**Purpose**

- Core match persistence
- Supports both casual and tournament matches

---

### player_stats

Stores aggregated statistics per player.

- user_id (INTEGER, PK, FK → users.id)
- elo_rating
- games_played
- games_won
- games_lost
- current_win_streak
- max_win_streak
- last_updated


---

### elo_history

Tracks ELO rating changes per match.

- id (INTEGER, PK)
- user_id (FK → users.id)
- match_id (FK → match_history.id)
- elo_rating
- previous_rating
- rating_change
- match_date


---

## Tournament System

### tournaments

Stores tournament metadata.

- id (INTEGER, PK)
- name, description
- status (pending, active, completed, cancelled)
- max_participants
- created_at

---

### tournament_participants

Registers users participating in tournaments.

- id (INTEGER, PK)
- tournament_id (FK → tournaments.id)
- user_id (FK → users.id)
- alias
- seed
- status (registered, active, eliminated, winner)

**Constraints**

- Unique (tournament_id, user_id)

---

### tournament_matches

Stores tournament-specific match structure.

- id (INTEGER, PK)
- tournament_id (FK → tournaments.id)
- round
- match_number
- player1_id, player2_id, winner_id
- game_id
- status (scheduled, in_progress, completed, cancelled)

**Purpose**

- Supports bracket-based tournament progression

---




## Features List

| Feature | Assigned Member | Description |
| :--- | :--- | :--- |
| **Secure Auth** | yliew | JWT-based authentication with Google OAuth2 and 2FA (OTP) options. |
| **Real-time Pong** | yliew | High-performance game engine synced via WebSockets with Fastify. |
| **ELO Ranking** | hyan-yi | Elo rating system (starting at 1200) with detailed history tracking. |
| **Tournament Brackets** | hyan-yi | Automated tournament creation supporting registration, seeding, and rounds. |
| **Social Hub** | hyan-yi, yliew | Friend request system (Pending/Accepted) and user profile customization. |
| **Live Stats** | hyan-yi | Real-time leaderboard and personal performance dashboards. |
| **Profile Customization** | hyan-yi | User-defined display names and avatar management. | 

---

## **Modules**

## Major Modules 

### Standard User Management
- Profiles with update capabilities and custom avatar uploads.
- Social system to add friends and track real-time online status with WebSocket notification system.

Implementation:
- Built using Fastify REST endpoints
- Real-time friend status powered by WebSockets
- User profile data and avatars stored in SQLite
- Frontend profile UI built with vanilla TypeScript + Tailwind components

Team Member(s):
- hyan-yi
- yliew


### Web-Based Game (Pong)
- A complete 2D real-time multiplayer Pong game with clear win/loss conditions.

Implementation:
- HTML canvas + animation loop for display
- TypeScript game engine with paddle/ball physics, scoring, collisions
- State synced via WebSockets when online multiplayer is active

Team Member(s):
- hyan-yi
- yliew


### Remote Players
- Synchronized gameplay between two separate computers.
- Handling network latency, disconnections, and reconnection logic gracefully.

Implementation:
- Dedicated Fastify WebSocket endpoints for rooms
- Player input transmitted over the network + state reconciled server-side
- Full reconnection and resync logic

Team Member(s):
- yliew


### Real-Time Features
- Efficient message broadcasting and real-time state updates via WebSockets.
- Graceful connection/disconnection management.

Implementation:
- WebSocket notification system to broadcast messages to all relevant online players
- Connection lifecycle tracking (join/leave, online/offline)
- Automatic silent reconnection attempts upon disconnection

Team Member(s):
- yliew

---

## Minor Modules

### Backend Framework
- API built with Fastify: Chosen for high performance, low overhead, and TypeScript-first design. Simplifies routing, validation, and plugin management.

Implementation:
- REST + WS APIs
- Input validation schemas
- Plugins for auth, storage, and sessions
- Modular route structure

Team Member(s):
- yliew
- hyan-yi
- agan


### Additional Browser Support
- Full compatibility and consistent UX across Chrome, Firefox, and Safari.

Team Member(s):
- hyan-yi


### Game Statistics & History
- Tracking wins, losses, ELO, and levels.
- Global leaderboards and match history visualizations.

Implementation:
- SQLite tables storing matches, ELO, streaks
- Views + triggers for leaderboard logic
- Frontend visual charts

Team Member(s):
- hyan-yi


### Remote Authentication
- Secure login via Google OAuth 2.0, facilitating efficient account creation and login process

Implementation:
- Google OAuth2 login flow
- Token exchange + refresh
- Linked identity stored in database
- JWT session token issuance

Team Member(s):
- yliew


### 2FA System
- Complete Two-Factor Authentication using OTP (App, Email, or SMS).

Implementation:
- **SMS OTP:** Integrated using **Twilio**
- **Authenticator App OTP:** QR code generation via **otpauth** and **qrcode** libraries
- **Email OTP:** Sending emails using **nodemailer**

Team Member(s):
- yliew


### Tournament System
- Bracket management and registration for multi-player tournaments.
- Automatic matchup ordering and participant management.

Team Member(s):
- hyan-yi, yliew



### JWT Authentication System (Custom Module)
We adopted a fully stateless authentication flow using **JWT access + refresh tokens**, which enables:  
- Secure session handling without server-side session storage
- Fast authorization for game servers and WebSockets
- Easy multi-device login and logout
- Keep users securely logged in for an extended duration without having to go through the 2FA process, allowing for a more streamlined UX

This architecture also pairs cleanly with our 2FA, OAuth2 login pipeline, and WebSocket authentication.  

---

#### **Implementation Overview**  
Our authentication stack uses two types of tokens, issued after successful login or registration:  

##### **1️. Access Token**
- Short-lived (e.g., 15–30 min)  
- Stored in HTTP-only secure cookies  
- Used to authorize gameplay, friends system, chat, statistics access  
- Signed with HMAC SHA-256 for cryptographic validation  
- No database lookup required

##### **2️. Refresh Token**
- Long-lived (e.g., 7–30 days)  
- Stored in HTTP-only secure cookies  
- Used only to request new access tokens
- Can be invalidated server-side  

This dual-token model minimizes exposure risk while preserving seamless UX.  

---

#### **Authentication Flow**  
1. User logs in (password / OAuth / 2FA)  
2. System issues:  
   - Access token (client memory)  
   - Refresh token (secure cookie)  
3. Client uses access token for all authenticated endpoints  
4. If the access token expires:  
   - Client silently sends refresh token  
   - Server returns new access token  
5. Logout clears refresh token + invalidates session  

---

#### **WebSocket Authentication**  
To join a game room or chat channel, users must:  
- Provide a valid access token during the handshake  
- Token is verified server-side before connection is accepted  

Expired tokens immediately disconnect the socket.  

---

#### **Example Payload**
```json
{
  "sub": "user_id_here",
  "username": "player123",
  "role": "user",
  "exp": <timestamp>,
  "iat": <timestamp>
}
```

---

Team Member(s):
- yliew



## Contributions


### hyan-yi – Product Owner (PO), Developer

**Specific Contributions:**

- **ELO & Stats System:** Developed the mathematical logic for the player_stats and elo_history tracking, ensuring fair ranking updates post-match.
- **Tournament Logic:** Created the automated bracket generation and progression system within the tournament_matches table.
- **Social features:** Built the friend request system and account profile page
- **UI/UX Design:** Developed the Tournament UI including interactive brackets and pong game match components
- **Data Visualization:** Implemented frontend chart to display the user's elo history
- **Database Design:** Developed the relational database schema including users, match_history, and tournaments.

**Challenges & Solutions:**

- **Challenge:** Handling edge cases in tournament brackets (e.g., uneven number of players).
- **Solution:** Integrated "Bye" match logic and dynamic seeding to maintain bracket integrity regardless of participant count.

---

### yliew – Project Manager (PM), Technical Lead / Architect, Developer

**Specific Contributions:**

- **System Architecture:** Defined the full-stack architecture, focusing on Fastify backend integration with a vanilla TypeScript + Tailwind frontend.
- **Security & Auth:** Implemented JWT access + refresh token authentication, Google OAuth2 integration, and multi-channel OTP 2FA (SMS, email, and authenticator app).
- **WebSockets:** Engineered real-time communication layers to synchronize game state and push live notifications.
- **Remote Players:** Built the networking pipeline enabling cross-device play, including connection management, latency handling, and reconnection logic.
- **Core Game Logic:** Implemented server-side Pong physics and authority logic to prevent client-side manipulation and ensure competitive fairness.


**Challenges & Solutions:**

- **Challenge:** Creating a responsive, accessible UI that handles real-time data updates without full page refreshes.
- **Solution:** Utilized a component-based frontend approach with efficient state management to re-render the necessary UI fragments when WebSocket messages arrive.


### agan – Developer

**Specific Contributions:**

- **Testing & QA:** Led comprehensive testing across major project modules, including gameplay, authentication, tournaments, and real-time communication flows.
- **Debugging:** Identified and resolved critical database issues within user management that were preventing players from successfully joining matches, significantly improving system reliability.
- **Frontend Game Features:** Assisted in implementing UI components and interactive elements.
- **Code Reviews:** Participated in peer review sessions to ensure code quality, consistency, and adherence to architectural standards.


**Challenges & Solutions**

- **Challenge:** A persistent bug in the user and match linking logic caused intermittent failures in matchmaking and login-related operations.
- **Solution:** Performed targeted data integrity checks and SQL query tracing, isolating errors in user ID handling to restore stable matchmaking functionality.
