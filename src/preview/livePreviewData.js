const bluePlayers = [
  ['Zeus', 'Renekton', 15, 2, 1, 3, 218, 9_820],
  ['Oner', 'Vi', 13, 1, 2, 6, 142, 8_210],
  ['Faker', 'Azir', 15, 3, 1, 4, 236, 10_140],
  ['Gumayusi', 'KaiSa', 14, 4, 1, 2, 221, 10_480],
  ['Keria', 'Nautilus', 11, 0, 3, 8, 38, 6_350],
];

const redPlayers = [
  ['Kiin', 'KSante', 14, 1, 2, 2, 205, 8_930],
  ['Canyon', 'Sejuani', 12, 2, 2, 3, 138, 7_920],
  ['Chovy', 'Orianna', 15, 2, 2, 3, 242, 9_870],
  ['Ruler', 'Jinx', 14, 3, 2, 2, 229, 9_960],
  ['Duro', 'Rakan', 10, 0, 2, 5, 34, 6_010],
];

/** 선수 배열을 라이브 스코어보드 응답 형태로 변환한다. */
function participants(rows, firstParticipantId) {
  return rows.map((row, index) => ({
    participantId: firstParticipantId + index,
    summonerName: row[0],
    championId: row[1],
    level: row[2],
    kills: row[3],
    deaths: row[4],
    assists: row[5],
    creepScore: row[6],
    totalGold: row[7],
  }));
}

export const LIVE_PREVIEW_MATCH = {
  matchId: 'preview-live-match',
  leagueName: 'LCK',
  blockName: '정규 시즌',
  startTime: '2026-08-16T15:00:00Z',
  teams: [
    { id: 'T1', name: 'T1', code: 'T1', gameWins: 1 },
    { id: 'GEN', name: 'Gen.G', code: 'GEN', gameWins: 0 },
  ],
  games: [
    { gameId: 'preview-game-1', number: 1, state: 'completed', feedFinished: true, winnerTeamId: 'T1' },
    { gameId: 'preview-game-2', number: 2, state: 'inProgress', feedFinished: false, winnerTeamId: null },
  ],
  activeGameId: 'preview-game-2',
};

export const LIVE_PREVIEW_GAME = {
  board: {
    gameId: 'preview-game-2',
    rfc460Timestamp: '2026-08-16T15:24:25Z',
    gameState: 'inProgress',
    patchVersion: '26.15',
    gameTimeSeconds: 24 * 60 + 25,
    goldDiff: 2_340,
    blue: {
      esportsTeamId: 'T1',
      totalGold: 45_000,
      totalKills: 10,
      towers: 5,
      inhibitors: 0,
      barons: 1,
      dragons: ['infernal', 'mountain'],
      participants: participants(bluePlayers, 1),
    },
    red: {
      esportsTeamId: 'GEN',
      totalGold: 42_660,
      totalKills: 8,
      towers: 3,
      inhibitors: 0,
      barons: 0,
      dragons: ['ocean'],
      participants: participants(redPlayers, 6),
    },
  },
  history: {
    objectives: [
      { type: 'dragon', subtype: 'infernal', side: 'blue', gameTimeSeconds: 385 },
      { type: 'dragon', subtype: 'ocean', side: 'red', gameTimeSeconds: 712 },
      { type: 'dragon', subtype: 'mountain', side: 'blue', gameTimeSeconds: 1_038 },
      { type: 'baron', subtype: null, side: 'blue', gameTimeSeconds: 1_322 },
    ],
    points: [
      { gameTimeSeconds: 0, blueGold: 2_500, redGold: 2_500, blueKills: 0, redKills: 0, goldDiff: 0 },
      { gameTimeSeconds: 300, blueGold: 10_200, redGold: 10_050, blueKills: 1, redKills: 1, goldDiff: 150 },
      { gameTimeSeconds: 600, blueGold: 18_900, redGold: 18_200, blueKills: 4, redKills: 3, goldDiff: 700 },
      { gameTimeSeconds: 900, blueGold: 27_700, redGold: 27_250, blueKills: 6, redKills: 6, goldDiff: 450 },
      { gameTimeSeconds: 1_200, blueGold: 37_100, redGold: 36_200, blueKills: 8, redKills: 7, goldDiff: 900 },
      { gameTimeSeconds: 1_465, blueGold: 45_000, redGold: 42_660, blueKills: 10, redKills: 8, goldDiff: 2_340 },
    ],
  },
};
