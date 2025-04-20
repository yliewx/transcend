import '../css/input.css';
import { AuthService } from './services/auth.service';
import { ControlAccess } from './services/control.access';
import { Router } from './router';
import { LoginPage } from './views/login';
import { RegisterPage } from './views/register';
import { OTPSetupPage } from './views/otp.setup';
import { OTPVerificationPage } from './views/otp.verify';
import { PageWithHeader } from './views/layout';
import { HomePage } from './views/home';
import { UserService } from './services/user.service';
import { ProfilePage } from './views/profile';
import { StatsPage } from './views/stats';
import { GameStatsService } from './services/game.stats.service';
import { PongGameService } from './services/pong.game.service';
import { PongGamePage } from './views/pong.game';
import { FriendService } from './services/friend.service';
import { FriendsPage } from './views/friends';
import { NotFoundPage } from './views/notfound';
import { WebSocketManager } from './services/websocket.manager';

document.addEventListener('DOMContentLoaded', async () => {  
  // Initialize application dependencies
  const appContainer = document.getElementById('app') as HTMLElement;
  const controlAccess = new ControlAccess(new AuthService());
  await controlAccess.checkAuthStatus(); // wait for access/refresh token status to be updated
  await controlAccess.setGoogleClientId(); // so that google library can be loaded properly
  const userService = new UserService();
  const gameStatsService = new GameStatsService(); 
  const friendService = new FriendService();
  const pongGameService = new PongGameService();
  
  // Create router
  const router = new Router(appContainer, controlAccess);
  
  // Register routes with Page implementations
  // Auth pages
  router.addRoute('/login', new LoginPage(router));
  router.addRoute('/register', new RegisterPage(router));
  router.addRoute('/otp/setup', new OTPSetupPage(router));
  router.addRoute('/otp/verify', new OTPVerificationPage(router));
  
  // Protected pages with header
  router.addRoute('/', new PageWithHeader(new HomePage(router), router));
  router.addRoute('/home', new PageWithHeader(new HomePage(router), router));
  router.addRoute('/play', new PageWithHeader(new PongGamePage(router, pongGameService), router));
  router.addRoute('/stats', new PageWithHeader(new StatsPage(router, gameStatsService), router));
  router.addRoute('/profile', new PageWithHeader(new ProfilePage(router, userService), router));
  router.addRoute('/friends', new PageWithHeader(new FriendsPage(router, friendService), router));

  // 404 route
  router.addRoute('/404', new PageWithHeader(new NotFoundPage(), router));
  
  // Start the router (init is now async)
  router.init(controlAccess.isLoggedIn() ? '/home' : '/login').catch(error => {
    console.error('Failed to initialize router:', error);
  });
});

