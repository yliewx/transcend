import { Router } from './router';
import { LoginPage } from './views/login';
import { RegisterPage } from './views/register';
import { HomePage } from './views/home';
import { ProfilePage } from './views/profile';
import { OTPSetupPage } from './views/otp.setup';
import { OTPVerificationPage } from './views/otp.verify';
import { PageWithHeader } from './views/layout';
import { AuthService } from './services/auth.service';
import { ControlAccess } from './services/control.access';
import { UserService } from './services/user.service';
import { StatsPage } from './views/stats';
import { PongGamePage } from './views/pong.game';
import { NotFoundPage } from './views/notfound';
import { GameStatsService } from './services/game.stats.service';
import { FriendsPage } from './views/friends';
import { FriendService } from './services/friend.service';

// function initGoogleAuth(googleClientId: string) {
//   // Initialise GoogleAuth object
//   if (googleClientId) {
//     gapi.load('auth2', function() {
//       gapi.auth2.init({
//         client_id: googleClientId,
//         scope: 'profile email' // allow access to personal info and gmail address
//       }).then(() => {
//         console.log("GoogleAuth initialized");
//       }).catch((error: Error) => {
//         console.error("GoogleAuth init error:", error);
//       });
//     });
//   }
// }

// function loadGoogleAuth(googleClientId: string) {
//   // Append meta tag with Google client ID
//   const metaTag = document.createElement('meta');
//   metaTag.name = 'google-signin-client_id';
//   metaTag.content = googleClientId;
//   document.head.appendChild(metaTag);

//   // Append script tag to load Google API
//   const scriptTag = document.createElement('script');
//   scriptTag.src = 'https://accounts.google.com/gsi/client';
//   scriptTag.async = true;
//   scriptTag.defer = true;
//   scriptTag.onload = () => initGoogleAuth(googleClientId);
//   document.head.appendChild(scriptTag);
// }

document.addEventListener('DOMContentLoaded', async () => {  
  // Initialize application dependencies
  const appContainer = document.getElementById('app') as HTMLElement;
  const controlAccess = new ControlAccess(new AuthService());
  await controlAccess.checkAuthStatus(); // wait for access/refresh token status to be updated
  await controlAccess.setGoogleClientId(); // so that google library can be loaded properly
  const userService = new UserService();
  const gameStatsService = new GameStatsService(); 
  const friendService = new FriendService();
  
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
  router.addRoute('/play', new PageWithHeader(new PongGamePage(router), router));
  router.addRoute('/stats', new PageWithHeader(new StatsPage(router, gameStatsService), router));
  router.addRoute('/profile', new PageWithHeader(new ProfilePage(router, userService), router));
  router.addRoute('/friends', new PageWithHeader(new FriendsPage(router, friendService), router));

  // 404 route
  router.addRoute('/404', new PageWithHeader(new NotFoundPage(), router));
  
  // Start the router
  router.init(controlAccess.isLoggedIn() ? '/home' : '/login');
});

