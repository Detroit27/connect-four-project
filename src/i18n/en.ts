export const en = {
  common: { back: '← Back', loading: 'Loading…', error: 'Something went wrong', signIn: 'Sign in', signUp: 'Sign up', signOut: 'Sign out' },
  menu: {
    singleplayer: 'Singleplayer', multiplayer: 'Multiplayer', shop: 'Shop', config: 'Config',
    subtitles: { singleplayer: 'vs AI', multiplayer: 'Play online', shop: 'Skins & coins', config: 'Settings' },
  },
  auth: {
    email: 'Email', password: 'Password', username: 'Username',
    signInTitle: 'Sign in', signUpTitle: 'Create account',
    noAccount: "Don't have an account?", hasAccount: 'Already have an account?',
    signingIn: 'Signing in…', signingUp: 'Creating account…',
  },
  singleplayer: {
    difficulty: 'Difficulty', startGame: 'Start game', matchHistory: 'Match history',
    noHistory: 'No matches yet.', signInHistory: 'Play a game to see history here.',
    easy: 'Easy', medium: 'Medium', hard: 'Hard', extraHard: 'Extra Hard',
    easyDesc: 'Random moves', mediumDesc: 'Basic strategy', hardDesc: 'Strong opponent', extraHardDesc: 'Near-perfect play',
    won: 'Win', lost: 'Loss', draw: 'Draw', moves: 'moves',
  },
  game: {
    yourTurn: 'Your turn', aiTurn: "AI's turn", aiThinking: 'AI is thinking…',
    youWin: 'You win', aiWins: 'AI wins', draw: 'Draw',
    playAgain: 'Play again', mainMenu: 'Main menu', restart: 'Restart', earned: 'coins earned',
  },
  multiplayer: {
    title: 'Multiplayer', createRoom: 'Create room', joinRoom: 'Join room',
    enterCode: 'Room code…', join: 'Join',
    shareCode: 'Share this code with your friend',
    waitingForOpponent: 'Waiting for opponent…', opponentJoined: 'Opponent joined!',
    yourTurn: 'Your turn', opponentTurn: "Opponent's turn",
    youWin: 'You win!', opponentWins: 'Opponent wins', draw: 'Draw',
    leaderboard: 'Leaderboard', wins: 'Wins', rank: '#', player: 'Player',
    signInRequired: 'You must sign in to play multiplayer.',
    matchHistory: 'Match history', noHistory: 'No online matches yet.', viewReplay: 'Replay',
    playAgain: 'Play again', mainMenu: 'Main menu',
    forfeit: 'Forfeit', forfeitConfirm: 'Surrender the match?',
    opponentForfeit: 'Opponent surrendered', youForfeit: 'You surrendered',
    activeMatch: 'You have an active match', resume: 'Resume', activeCode: 'Room',
  },
  shop: {
    title: 'Shop', balance: 'Balance', yourSkin: 'Your chips',
    buy: 'Buy', equipped: 'Equipped', owned: 'Equip', coins: 'coins',
    skins: { classic: 'Classic', slate: 'Slate', forest: 'Forest', dusk: 'Dusk', obsidian: 'Obsidian', gold: 'Gold' },
  },
  config: {
    title: 'Config', appearance: 'Appearance', theme: 'Theme', light: 'Light', dark: 'Dark',
    language: 'Language', account: 'Account', signInDesc: 'Sign in to save progress across devices.', signedInAs: 'Signed in as',
    changeUsername: 'Change username', usernamePlaceholder: 'New username', save: 'Save',
    usernameSaved: 'Username updated!', usernameTaken: 'That username is already taken.',
  },
  replay: { title: 'Match Replay', move: 'Move', of: 'of', close: 'Close' },
}

export type Translations = typeof en
