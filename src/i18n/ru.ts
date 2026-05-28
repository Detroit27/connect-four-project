import type { Translations } from './en'

export const ru: Translations = {
  common: { back: '← Назад', loading: 'Загрузка…', error: 'Что-то пошло не так', signIn: 'Войти', signUp: 'Регистрация', signOut: 'Выйти' },
  menu: {
    singleplayer: 'Одиночная', multiplayer: 'Мультиплеер', shop: 'Магазин', config: 'Настройки',
    subtitles: { singleplayer: 'против ИИ', multiplayer: 'Онлайн игра', shop: 'Скины и монеты', config: 'Параметры' },
  },
  auth: {
    email: 'Email', password: 'Пароль', username: 'Имя пользователя',
    signInTitle: 'Вход', signUpTitle: 'Создать аккаунт',
    noAccount: 'Нет аккаунта?', hasAccount: 'Уже есть аккаунт?',
    signingIn: 'Вход…', signingUp: 'Создание аккаунта…',
  },
  singleplayer: {
    difficulty: 'Сложность', startGame: 'Начать игру', matchHistory: 'История матчей',
    noHistory: 'Матчей пока нет.', signInHistory: 'Сыграйте партию, чтобы увидеть историю.',
    easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный', extraHard: 'Очень сложный',
    easyDesc: 'Случайные ходы', mediumDesc: 'Базовая стратегия', hardDesc: 'Сильный противник', extraHardDesc: 'Почти идеальная игра',
    won: 'Победа', lost: 'Поражение', draw: 'Ничья', moves: 'ходов',
  },
  game: {
    yourTurn: 'Ваш ход', aiTurn: 'Ход ИИ', aiThinking: 'ИИ думает…',
    youWin: 'Вы победили', aiWins: 'ИИ победил', draw: 'Ничья',
    playAgain: 'Играть снова', mainMenu: 'Главное меню', restart: 'Рестарт', earned: 'монет получено',
  },
  multiplayer: {
    title: 'Мультиплеер', createRoom: 'Создать комнату', joinRoom: 'Войти в комнату',
    enterCode: 'Код комнаты…', join: 'Войти',
    shareCode: 'Поделитесь этим кодом с другом',
    waitingForOpponent: 'Ожидание соперника…', opponentJoined: 'Соперник подключился!',
    yourTurn: 'Ваш ход', opponentTurn: 'Ход соперника',
    youWin: 'Вы победили!', opponentWins: 'Соперник победил', draw: 'Ничья',
    leaderboard: 'Таблица лидеров', wins: 'Побед', rank: '№', player: 'Игрок',
    signInRequired: 'Для игры онлайн необходимо войти в аккаунт.',
    matchHistory: 'История матчей', noHistory: 'Онлайн матчей пока нет.', viewReplay: 'Повтор',
    playAgain: 'Играть снова', mainMenu: 'Главное меню',
  },
  shop: {
    title: 'Магазин', balance: 'Баланс', yourSkin: 'Ваши фишки',
    buy: 'Купить', equipped: 'Надет', owned: 'Надеть', coins: 'монет',
    skins: { classic: 'Классика', slate: 'Сланец', forest: 'Лес', dusk: 'Закат', obsidian: 'Обсидиан', gold: 'Золото' },
  },
  config: {
    title: 'Настройки', appearance: 'Внешний вид', theme: 'Тема', light: 'Светлая', dark: 'Тёмная',
    language: 'Язык', account: 'Аккаунт', signInDesc: 'Войдите, чтобы сохранять прогресс.', signedInAs: 'Вы вошли как',
  },
  replay: { title: 'Повтор матча', move: 'Ход', of: 'из', close: 'Закрыть' },
}
