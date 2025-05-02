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
import { TournamentPage } from './views/tournaments';
import { TournamentDetailPage } from './views/tournament.detail';
import { FriendService } from './services/friend.service';
import { FriendsPage } from './views/friends';
import { NotFoundPage } from './views/notfound';
import  { BrowserWarning } from './components/warning';

document.addEventListener('DOMContentLoaded', async () => {  
  if (!isSupportedBrowser()) {
    const warning = new BrowserWarning().render();
    document.body.prepend(warning);
  }

  const appContainer = document.getElementById('app') as HTMLElement;
  const controlAccess = new ControlAccess(new AuthService());
  await controlAccess.checkAuthStatus();
  controlAccess.startAuthCheckLoop();
  const userService = new UserService();
  const gameStatsService = new GameStatsService(); 
  const friendService = new FriendService();
  const pongGameService = new PongGameService();

  const router = new Router(appContainer, controlAccess);
  
  router.addRoute('/login', new LoginPage(router));
  router.addRoute('/register', new RegisterPage(router));
  router.addRoute('/otp/setup', new OTPSetupPage(router));
  router.addRoute('/otp/verify', new OTPVerificationPage(router));  
  router.addRoute('/', new PageWithHeader(new HomePage(router), router));
  router.addRoute('/home', new PageWithHeader(new HomePage(router), router));
  router.addRoute('/play', new PageWithHeader(new PongGamePage(router, pongGameService), router));
  router.addRoute('/stats', new PageWithHeader(new StatsPage(router, gameStatsService), router));
  router.addRoute('/profile', new PageWithHeader(new ProfilePage(router, userService), router));
  router.addRoute('/friends', new PageWithHeader(new FriendsPage(router, friendService), router));
  router.addRoute('/tournaments', new PageWithHeader(new TournamentPage(router), router));
  router.addRoute('/tournaments/:id', new PageWithHeader(new TournamentDetailPage(router), router));
  router.addRoute('/404', new PageWithHeader(new NotFoundPage(), router));
  
  router.init(controlAccess.isLoggedIn() ? '/home' : '/login').catch(error => {
    console.error('Failed to initialize router:', error);
  });
});

function isSupportedBrowser(): boolean {
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && !/Edge|Edg|OPR/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);

  return isChrome || isFirefox;
}
