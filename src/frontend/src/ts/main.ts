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

document.addEventListener('DOMContentLoaded', () => {
  // Initialize application dependencies
  const appContainer = document.getElementById('app') as HTMLElement;
  const controlAccess = new ControlAccess(new AuthService());
  const userService = new UserService();
  const gameStatsService = new GameStatsService(); 
  
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
  
  // 404 route
  router.addRoute('/404', new PageWithHeader(new NotFoundPage(), router));
  
  // Start the router
  router.init(controlAccess.isLoggedIn() ? '/home' : '/login');
});

