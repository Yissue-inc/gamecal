"use client";

import {
  Activity,
  CalendarDays,
  Database,
  Flame,
  Gauge,
  Gift,
  Medal,
  RefreshCw,
  RotateCcw,
  Share2,
  Shield,
  Target,
  Trophy,
  Users,
  Vibrate,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import FLAG_GRID from "@/lib/flagGrid.json";
import { trackEvent } from "@/lib/posthog";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EventTone = "milestone" | "clutch" | "drop" | "emotion";
type Pick = "team1" | "draw" | "team2";
type MatchFilter = "upcoming" | "today" | "all";
type CupTab = "trophies" | "play" | "power" | "matches" | "bets";
type TranslationKey = string;
type Translator = (key: TranslationKey) => string;
type ScoreSaveStatus = "idle" | "saving" | "saved" | "error";
type RoarAuthIntent =
  | "save_rank"
  | "prediction_pick"
  | "prediction_settle"
  | "prediction_claim";

type FeedEvent = {
  id: number;
  tone: EventTone;
  title: string;
  body: string;
};

type Drop = {
  id: number;
  name: string;
  rarity: "common" | "rare" | "epic";
  reward: number;
  power: string;
};

type CupMatch = {
  id: string;
  date: string;
  time?: string;
  round: string;
  group?: string;
  team1: string;
  team2: string;
  ground?: string;
  score?: { ft?: [number, number]; ht?: [number, number] };
  events?: MatchGoal[];
};

type MatchGoal = {
  type?: string;
  team?: string;
  name?: string;
  minute?: string | number;
};

type CheerAggregate = {
  matchId: string;
  country: string;
  taps: number;
  shakes: number;
  total: number;
  updatedAt: string;
};

type SavedScoreInfo = {
  awardedGp?: number;
  leaderboardRank?: number;
  message?: string;
};

type RoarLeaderboardRow = {
  rank: number;
  userId?: string;
  team: string;
  score: number;
  rankLabel?: string;
};

type BetSlip = {
  id: string;
  matchId: string;
  pick: Pick;
  pickLabel: string;
  stake: number;
  status: "open" | "won" | "lost";
  payout?: number;
  claimed?: boolean;
  settledAt?: string;
  createdAt: string;
};

type PersonalRecord = {
  id: string;
  matchId: string;
  matchLabel: string;
  country: string;
  impactPower: number;
  totalScore: number;
  taps: number;
  shakes: number;
  comboBonus: number;
  badges: number;
  updatedAt: string;
};

type FloatingPop = {
  id: number;
  text: string;
  tone: "tap" | "shake" | "combo" | "drop" | "badge";
  left: number;
};

type CoinPop = {
  id: number;
  amount: number;
  left: number;
};

type BetReveal = {
  id: number;
  title: string;
  body: string;
  tone: "placed" | "won" | "lost" | "blocked" | "cheer";
};

type GoalReveal = {
  id: number;
  tone: "ally" | "rival";
  country: string;
  title: string;
  body: string;
  scoreLine: string;
};

type BoardReveal = {
  id: number;
  title: string;
  body: string;
};

type ResultReveal = {
  id: string;
  tone: "victory" | "defeat";
  title: string;
  body: string;
  matchLabel: string;
  scoreLine: string;
  payout?: number;
  slipId?: string;
  claimed?: boolean;
};

type BoardSide = "ally" | "rival";
type MascotPose = "idle" | "cheer" | "jump" | "flag" | "celebrate";
type LocaleCode =
  | "en"
  | "ko"
  | "ja"
  | "zh"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ar"
  | "hi";
type RoarRankId = "rookie" | "regular" | "ultra" | "captain" | "legend";

type Badge = {
  id: string;
  name: string;
  icon: string;
  image?: string;
  tier: "bronze" | "silver" | "gold" | "legend";
  description: string;
  reward: number;
};

type DailyState = {
  date: string;
  claimedCheckIn: boolean;
  taps: number;
  shakes: number;
  bets: number;
  settlements: number;
  questClaims: Record<string, boolean>;
};

const OPEN_DATA_URL = "/api/roar/matches";
const CHEER_DATA_URL = "/api/roar/cheer";
const BETS_DATA_URL = "/api/roar/bets";
const BRAND_ASSETS = "/mini-cup/assets/brand/";
const BETTING_ASSETS = "/mini-cup/assets/betting/";
const CROWD_AVATAR_ASSETS = "/mini-cup/assets/crowd/avatars/";
const SPECTATOR_ASSETS = "/mini-cup/assets/crowd/spectators/";
const MASCOT_ASSETS = "/mini-cup/assets/mascot/";
const DATA_CACHE_MS = 60 * 1000;
const MATCH_REFRESH_MS = 90 * 1000;
const SCORE_VERSION = "unit-score-v3";
const WELCOME_COIN_KEY = "roar-welcome-coins-v1";
const PLAYER_NAME_KEY = "roar-player-name";
const SOUND_MUTED_KEY = "roar-sound-muted";
const WELCOME_COINS = 50;
const SFX = {
  tap: "/mini-cup/assets/sfx/tap.wav",
  coin: "/mini-cup/assets/sfx/coin.wav",
  combo: "/mini-cup/assets/sfx/combo.wav",
  cheer: "/mini-cup/assets/sfx/cheer.wav",
  rankup: "/mini-cup/assets/sfx/rankup.wav",
  whistle: "/mini-cup/assets/sfx/whistle.wav",
} as const;
const BGM_SRC = "/mini-cup/assets/music/stadium-hype.wav";
type SfxName = keyof typeof SFX;
const LANGUAGE_OPTIONS: Array<{
  code: LocaleCode;
  label: string;
  native: string;
}> = [
  { code: "en", label: "English", native: "English" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

const I18N: Record<LocaleCode, Record<string, string>> = {
  en: {
    welcome: "Join the ROAR",
    welcomeBody:
      "Pick your language and team. You can cheer before, during, or after every match.",
    language: "Language",
    nickname: "Nickname",
    nicknamePlaceholder: "Your supporter name",
    nicknameHint: "Shown on your proof card and History.",
    chooseTeam: "Choose your team",
    startPlaying: "Start cheering",
    tap: "Tap",
    shake: "Shake",
    myScore: "My score",
    myTeam: "My Team",
    rivalTeam: "Rival Team",
    teamScore: "Team score",
    coins: "Coins",
    coinBank: "Coin bank",
    coinHint: "Tap and Shake add points, team score, and coins.",
    scoreboard: "Scoreboard",
    contribution: "Your scoreboard contribution",
    trophies: "History",
    play: "Play",
    matches: "Matches",
    bets: "Bets",
    selected: "Selected",
    choose: "Choose",
    cheeringOpen: "cheering is always open",
    motionShake: "Motion shake",
    enable: "Enable",
    on: "ON",
    off: "Off",
    ready: "Ready",
    crowdBattle: "Crowd Battle",
    nowCheering: "Now cheering",
    combo: "Combo",
    playMatch: "Play a match",
    upcoming: "Upcoming",
    today: "Today",
    all: "All",
    predictionBets: "Prediction Picks",
    predictionBetsHint: "Spend coins here. Earn more in Play.",
    changeMatch: "Change match",
    stake: "Stake",
    toKickoff: "to kickoff",
    closedAfterKickoff: "Closed after kickoff",
    supportCoinRule: "1 support point earns 1 coin. Correct picks return 2x.",
    qaResultTrigger: "QA result trigger",
    qaResultBody: "Preview result spectacle without waiting for a final score.",
    demoWin: "Demo win",
    demoLoss: "Demo loss",
    firstBadge: "First badge",
    betBadge: "Pick badge",
    openSlips: "Open slips",
    noOpenSlips: "No open slips yet.",
    settlesAfterKickoff: "Settles after kickoff",
    resultReady: "result ready",
    waitingForResult: "waiting for result",
    openSlip: "open slip",
    settle: "Settle",
    wait: "Wait",
    settled: "Settled",
    noSettledBets: "No settled picks yet.",
    claim: "Claim",
    claimed: "Claimed",
    won: "Won",
    lost: "Lost",
    payout: "payout",
    payoutClaimed: "Payout claimed",
    shareProof: "Share proof",
    playAgain: "Play again",
    roarRank: "ROAR rank",
    supportPoints: "support points",
    toNextRank: "to",
    maxRank: "Max rank",
    taps: "Taps",
    shakes: "Shakes",
    boardIcons: "Board icons",
    betsPlaced: "Picks placed",
    betsWon: "Picks won",
    recentMatchRecords: "Recent match records",
    noSavedRecords: "No saved match records yet.",
    supportProof: "Support proof",
    createShareText: "Create share card",
    liveBursts: "Live bursts",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "Prediction open",
    bettingClosed: "Prediction closed",
    draw: "Draw",
    pick: "PICK",
    needCoins: "Need coins",
    closed: "Closed",
    prob: "prob.",
    returnRate: "return",
    itemDrop: "item drop",
    boost: "BOOST",
    badgeEarned: "badge earned",
    saved: "SAVED",
    rankUp: "rank up",
    prediction: "PREDICTION",
    contributionToast: "contribution",
    shareReadyTitle: "Share proof ready",
    shareReadyBody:
      "Your support proof is ready in the share sheet or clipboard.",
    betClosedTitle: "Predictions closed",
    betClosedBody: "Kickoff has passed. You can still earn coins in Play.",
    notEnoughCoinsTitle: "Not enough coins",
    notEnoughCoinsBody: "Earn coins with Tap and Shake before locking a pick.",
    betLockedTitle: "Pick locked in",
    potentialReturn: "potential return",
    predictionHit: "Prediction hit",
    predictionMissed: "Prediction missed",
    claimFromChest: "Claim {amount} from the result chest.",
    claimFromChestShort: "Claim {amount} from the chest",
    tapClaimPayout:
      "{pick} landed. Tap Claim to move the payout into your coin bank.",
    stakeGone: "{pick} missed. The stake is gone.",
    stakeBurned: "{amount} used. Earn it back in Play.",
    tryAgainBody:
      "{pick} did not land. Earn coins in Play and take another shot.",
    settlementLocked: "Result locked",
    settlementLockedBody: "Reload results after the estimated final whistle.",
    notReadyYet: "Not ready yet",
    notReadyYetBody: "This match has not reached result time.",
    resultPending: "Result pending",
    resultPendingBody:
      "Final score is not in the open data yet. Refresh and try again.",
    payoutClaimedTitle: "Payout claimed",
    payoutClaimedBody: "{amount} added to your coins",
    dailyCheckIn: "Daily check-in",
    dailyCheckInBody: "100 support coins added for today.",
    dailyQuestComplete: "Daily quest complete",
    rewardClaimed: "{amount} reward claimed.",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
  },
  ko: {
    welcome: "ROAR 참여하기",
    welcomeBody:
      "언어와 팀을 선택하세요. 모든 경기는 전/중/후 언제든 응원할 수 있습니다.",
    language: "언어",
    nickname: "닉네임",
    nicknamePlaceholder: "응원 닉네임",
    nicknameHint: "증명 카드와 기록에 표시됩니다.",
    chooseTeam: "팀 선택",
    startPlaying: "응원 시작",
    tap: "탭",
    shake: "흔들기",
    myScore: "내 점수",
    myTeam: "내 팀",
    rivalTeam: "상대 팀",
    teamScore: "팀 점수",
    coins: "코인",
    coinBank: "코인 뱅크",
    coinHint: "탭과 흔들기는 점수, 단체 점수, 코인을 함께 올립니다.",
    scoreboard: "전광판",
    contribution: "내 전광판 기여도",
    trophies: "기록",
    play: "플레이",
    matches: "경기",
    bets: "베팅",
    selected: "선택됨",
    choose: "선택",
    cheeringOpen: "응원은 항상 열려 있습니다",
    motionShake: "실제 흔들기",
    enable: "켜기",
    on: "ON",
    off: "끔",
    ready: "준비",
    crowdBattle: "크라우드 배틀",
    nowCheering: "응원 중",
    combo: "콤보",
    playMatch: "경기 참여",
    upcoming: "예정",
    today: "오늘",
    all: "전체",
    predictionBets: "예측 픽",
    predictionBetsHint: "여기서 코인을 쓰고, Play에서 다시 벌 수 있어요.",
    changeMatch: "경기 변경",
    stake: "스테이크",
    toKickoff: "킥오프까지",
    closedAfterKickoff: "킥오프 후 마감",
    supportCoinRule:
      "응원 포인트 1점은 코인 1개입니다. 맞추면 2배로 돌아옵니다.",
    qaResultTrigger: "QA 결과 트리거",
    qaResultBody: "최종 결과를 기다리지 않고 결과 연출을 미리 봅니다.",
    demoWin: "승리 데모",
    demoLoss: "패배 데모",
    firstBadge: "첫 뱃지",
    betBadge: "픽 뱃지",
    openSlips: "열린 픽",
    noOpenSlips: "아직 열린 픽이 없습니다.",
    settlesAfterKickoff: "킥오프 후 결과 처리",
    resultReady: "결과 준비됨",
    waitingForResult: "결과 대기",
    openSlip: "열린 픽",
    settle: "처리",
    wait: "대기",
    settled: "완료됨",
    noSettledBets: "완료된 픽이 없습니다.",
    claim: "받기",
    claimed: "수령 완료",
    won: "성공",
    lost: "실패",
    payout: "보상",
    payoutClaimed: "보상 수령 완료",
    shareProof: "증명 공유",
    playAgain: "다시 플레이",
    roarRank: "ROAR 등급",
    supportPoints: "응원 포인트",
    toNextRank: "까지",
    maxRank: "최고 등급",
    taps: "탭",
    shakes: "흔들기",
    boardIcons: "전광판 아이콘",
    betsPlaced: "픽 횟수",
    betsWon: "성공한 픽",
    recentMatchRecords: "최근 경기 기록",
    noSavedRecords: "저장된 경기 기록이 없습니다.",
    supportProof: "응원 증명",
    createShareText: "공유 카드 만들기",
    liveBursts: "라이브 버스트",
    stage: "스테이지",
    warmup: "워밍업",
    fillSeats: "좌석 채우기",
    spawnFans: "팬 등장",
    crowdReacts: "관중 반응",
    comboFever: "콤보 피버",
    boardTransfer: "전광판 전송",
    playing: "플레이 중",
    bettingOpen: "예측 열림",
    bettingClosed: "예측 마감",
    draw: "무승부",
    pick: "선택",
    needCoins: "코인 필요",
    closed: "마감",
    prob: "확률",
    returnRate: "반환",
    itemDrop: "아이템 드롭",
    boost: "부스트",
    badgeEarned: "뱃지 획득",
    saved: "저장됨",
    rankUp: "등급 상승",
    prediction: "예측",
    contributionToast: "기여도",
    shareReadyTitle: "공유 증명 준비됨",
    shareReadyBody: "공유 시트나 클립보드에 응원 증명이 준비됐습니다.",
    betClosedTitle: "예측 마감",
    betClosedBody: "킥오프가 지났습니다. Play에서 코인은 계속 벌 수 있어요.",
    notEnoughCoinsTitle: "코인 부족",
    notEnoughCoinsBody: "픽을 잠그기 전에 탭과 흔들기로 코인을 벌어주세요.",
    betLockedTitle: "픽 잠김",
    potentialReturn: "예상 반환",
    predictionHit: "예측 성공",
    predictionMissed: "예측 실패",
    claimFromChest: "결과 상자에서 {amount} 받기",
    claimFromChestShort: "상자에서 {amount} 받기",
    tapClaimPayout: "{pick} 성공. Claim을 눌러 코인 뱅크로 옮기세요.",
    stakeGone: "{pick} 실패. 스테이크가 사라졌습니다.",
    stakeBurned: "{amount} 사용됨. Play에서 다시 벌어보세요.",
    tryAgainBody:
      "{pick}이 맞지 않았습니다. Play에서 코인을 벌고 다시 도전하세요.",
    settlementLocked: "결과 잠김",
    settlementLockedBody: "예상 종료 후 결과를 다시 불러오세요.",
    notReadyYet: "아직 준비 안 됨",
    notReadyYetBody: "이 경기는 아직 결과 처리 시간이 아닙니다.",
    resultPending: "결과 대기",
    resultPendingBody:
      "오픈 데이터에 최종 스코어가 아직 없습니다. 새로고침 후 다시 시도하세요.",
    payoutClaimedTitle: "보상 수령 완료",
    payoutClaimedBody: "{amount} 코인에 추가됨",
    dailyCheckIn: "데일리 체크인",
    dailyCheckInBody: "오늘의 응원 코인 100개가 추가되었습니다.",
    dailyQuestComplete: "데일리 퀘스트 완료",
    rewardClaimed: "{amount} 보상을 받았습니다.",
    sessionReset: "세션 초기화",
    sessionResetBody:
      "오늘의 로컬 테스트 상태를 지웠습니다. 저장된 경기 기록은 유지됩니다.",
    motionOnTitle: "실제 흔들기 ON",
    motionOnBody:
      "실제 흔들기마다 1점이 추가됩니다. 탭과 번갈아 하면 연출 콤보가 강화됩니다.",
    motionBlockedTitle: "실제 흔들기 차단됨",
    motionBlockedBody:
      "수동 Shake 버튼을 쓰거나 브라우저 설정에서 모션을 허용하세요.",
    openDataSynced: "오픈 데이터 동기화",
    openDataSyncedBody: "월드컵 일정과 결과 데이터를 불러왔습니다.",
    openDataSyncedAgain: "최신 경기 데이터를 다시 확인했습니다.",
    openDataFailed: "오픈 데이터 실패",
    openDataFailedBody: "내장 샘플 경기로 계속 플레이할 수 있습니다.",
    kickoffPassed: "킥오프 지남",
    matchday: "매치데이",
    demoKickoff: "데모 킥오프",
    openDemo: "오픈 데모",
    firstRoar: "첫 함성",
    fingerWarmUp: "손가락 워밍업",
    shakeSignal: "흔들기 신호",
    firstDrop: "첫 드롭",
    rareCollector: "레어 수집가",
    epicProof: "에픽 증명",
    stadiumHeat: "스타디움 열기",
    wristBooster: "손목 부스터",
    predictionRookie: "예측 루키",
    badgeFirstRoarDesc: "첫 응원 포인트 획득",
    badgeTap30Desc: "30번 탭하기",
    badgeShake15Desc: "15번 흔들기",
    badgeCombo10Desc: "콤보 x10 달성",
    badgeFirstDropDesc: "아이템 1개 획득",
    badgeRareDesc: "레어 아이템 보유",
    badgeEpicDesc: "에픽 아이템 보유",
    badgeHypeDesc: "HYPE LV.4 달성",
    badgeScoreDesc: "응원 포인트 500점 달성",
    badgeFirstPickDesc: "첫 예측 픽 잠그기",
    badgeFirstWinDesc: "예측 1회 성공",
    rookie: "루키",
    regular: "레귤러",
    ultra: "울트라",
    captain: "캡틴",
    legend: "레전드",
    rookieTone: "관중석의 첫 목소리",
    regularTone: "관중이 당신의 구호를 압니다",
    ultraTone: "섹션이 당신의 리듬을 따릅니다",
    captainTone: "관중석 전체를 이끕니다",
    legendTone: "ROAR가 이 응원을 기억합니다",
    rankClimbed: "ROAR 레벨이 올라갔습니다.",
    rankReached: "{rank} 등급 달성",
    badgeUnlocked: "{badge} 뱃지 획득",
    badgeUnlockedBody: "{desc}. 응원 증명에 추가되었습니다.",
    seatsLit: "좌석 점등",
    seatsLitBody: "첫 함성이 아래 관중석을 밝혔습니다.",
    crowdWave: "관중 웨이브",
    crowdWaveBody: "당신의 섹션이 경기장 전체로 퍼집니다.",
    wristWarmed: "손목 예열",
    wristWarmedBody: "모든 탭이 관중을 더 높이 밀어올립니다.",
    feverBoost: "피버 부스트",
    feverBoostBody: "다음 액션이 화면에서 더 강하게 터집니다.",
    proofUnlocked: "증명 해제",
    proofUnlockedBody: "공유할 응원 증명이 준비됐습니다.",
    stadiumTakeover: "스타디움 점령",
    stadiumTakeoverBody: "우리 편이 상대 관중석을 압박하기 시작합니다.",
  },
  ja: {
    welcome: "ROAR に参加",
    welcomeBody:
      "言語とチームを選んでください。応援は試合前・試合中・試合後いつでも可能です。",
    language: "言語",
    nickname: "ニックネーム",
    nicknamePlaceholder: "応援ネーム",
    nicknameHint: "証明カードと履歴に表示されます。",
    chooseTeam: "チーム選択",
    startPlaying: "応援開始",
    tap: "タップ",
    shake: "シェイク",
    myScore: "自分のスコア",
    myTeam: "自分のチーム",
    rivalTeam: "相手チーム",
    teamScore: "チームスコア",
    coins: "コイン",
    coinBank: "コインバンク",
    coinHint: "タップとシェイクでスコア、チームスコア、コインが増えます。",
    scoreboard: "スコアボード",
    contribution: "あなたの貢献度",
    trophies: "履歴",
    play: "プレイ",
    matches: "試合",
    bets: "ベット",
    selected: "選択中",
    choose: "選択",
    cheeringOpen: "応援はいつでも可能",
    motionShake: "モーションシェイク",
    enable: "有効化",
    on: "ON",
    off: "オフ",
    ready: "準備",
    crowdBattle: "クラウドバトル",
    nowCheering: "応援中",
    combo: "コンボ",
    playMatch: "試合を選ぶ",
    upcoming: "予定",
    today: "今日",
    all: "すべて",
    predictionBets: "予想ピック",
    predictionBetsHint: "ここでコインを使い、Playでまた獲得できます。",
    changeMatch: "試合変更",
    stake: "投入",
    toKickoff: "キックオフまで",
    closedAfterKickoff: "キックオフ後は締切",
    supportCoinRule: "応援ポイント1点でコイン1枚。正解すると2倍で戻ります。",
    qaResultTrigger: "QA結果トリガー",
    qaResultBody: "実際の最終結果を待たずに結果演出を確認します。",
    demoWin: "勝利デモ",
    demoLoss: "敗北デモ",
    firstBadge: "最初のバッジ",
    betBadge: "予想バッジ",
    openSlips: "未確定ピック",
    noOpenSlips: "未確定ピックはまだありません。",
    settlesAfterKickoff: "キックオフ後に結果処理",
    resultReady: "結果準備済み",
    waitingForResult: "結果待ち",
    openSlip: "未確定ピック",
    settle: "処理",
    wait: "待機",
    settled: "確定済み",
    noSettledBets: "確定済みピックはまだありません。",
    claim: "受け取る",
    claimed: "受取済み",
    won: "成功",
    lost: "失敗",
    payout: "報酬",
    payoutClaimed: "報酬受取済み",
    shareProof: "証明を共有",
    playAgain: "もう一度",
    roarRank: "ROARランク",
    supportPoints: "応援ポイント",
    toNextRank: "まで",
    maxRank: "最高ランク",
    taps: "タップ",
    shakes: "シェイク",
    boardIcons: "ボードアイコン",
    betsPlaced: "ピック数",
    betsWon: "的中数",
    recentMatchRecords: "最近の試合記録",
    noSavedRecords: "保存された試合記録はまだありません。",
    supportProof: "応援証明",
    createShareText: "共有カードを作成",
    liveBursts: "ライブバースト",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "予想受付中",
    bettingClosed: "予想締切",
    draw: "引き分け",
    pick: "選択",
    needCoins: "コイン不足",
    closed: "締切",
    prob: "確率",
    returnRate: "戻り",
    itemDrop: "アイテム獲得",
    boost: "ブースト",
    badgeEarned: "バッジ獲得",
    saved: "保存済み",
    rankUp: "ランクアップ",
    prediction: "予想",
    contributionToast: "貢献度",
    shareReadyTitle: "共有証明の準備完了",
    betClosedTitle: "予想締切",
    betClosedBody: "キックオフ後です。Playでは引き続きコインを獲得できます。",
    notEnoughCoinsTitle: "コイン不足",
    notEnoughCoinsBody:
      "ピックを確定する前にTapとShakeでコインを獲得してください。",
    betLockedTitle: "ピック確定",
    potentialReturn: "見込みリターン",
    predictionHit: "予想的中",
    predictionMissed: "予想失敗",
    claimFromChest: "結果チェストから{amount}を受け取る",
    claimFromChestShort: "チェストから{amount}を受け取る",
    stakeGone: "{pick}は外れました。投入分は戻りません。",
    stakeBurned: "{amount}を使用しました。Playで取り戻しましょう。",
    settlementLocked: "結果ロック中",
    settlementLockedBody: "終了予定後に結果を再読み込みしてください。",
    notReadyYet: "まだ準備中",
    notReadyYetBody: "この試合はまだ結果処理時間ではありません。",
    resultPending: "結果待ち",
    payoutClaimedTitle: "報酬受取済み",
    payoutClaimedBody: "{amount}をコインに追加しました",
    dailyCheckIn: "デイリーチェックイン",
    dailyCheckInBody: "今日の応援コイン100枚を追加しました。",
    dailyQuestComplete: "デイリークエスト完了",
    rewardClaimed: "{amount}の報酬を受け取りました。",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
    shareReadyBody: "共有シートまたはクリップボードに応援証明を用意しました。",
    tapClaimPayout: "{pick}が的中。Claimでコインバンクへ移動します。",
    tryAgainBody: "{pick}は的中しませんでした。Playでコインを獲得して再挑戦。",
    resultPendingBody:
      "オープンデータに最終スコアがまだありません。更新して再試行してください。",
  },
  zh: {
    welcome: "加入 ROAR",
    welcomeBody: "选择语言和球队。每场比赛赛前、赛中、赛后都可以助威。",
    language: "语言",
    nickname: "昵称",
    nicknamePlaceholder: "你的助威名称",
    nicknameHint: "会显示在证明卡和记录中。",
    chooseTeam: "选择球队",
    startPlaying: "开始助威",
    tap: "点击",
    shake: "摇动",
    myScore: "我的分数",
    myTeam: "我的队伍",
    rivalTeam: "对手队伍",
    teamScore: "球队分数",
    coins: "金币",
    coinBank: "金币库",
    coinHint: "点击和摇动会增加个人分、团队分和金币。",
    scoreboard: "记分牌",
    contribution: "我的记分牌贡献",
    trophies: "记录",
    play: "游戏",
    matches: "比赛",
    bets: "竞猜",
    selected: "已选择",
    choose: "选择",
    cheeringOpen: "助威随时开放",
    motionShake: "动作摇动",
    enable: "启用",
    on: "ON",
    off: "关",
    ready: "就绪",
    crowdBattle: "人群对战",
    nowCheering: "正在助威",
    combo: "连击",
    playMatch: "选择比赛",
    upcoming: "即将开始",
    today: "今天",
    all: "全部",
    predictionBets: "预测选择",
    predictionBetsHint: "在这里使用金币，在 Play 中继续赚取。",
    changeMatch: "更换比赛",
    stake: "投入",
    toKickoff: "距开球",
    closedAfterKickoff: "开球后关闭",
    supportCoinRule: "1 点助威获得 1 枚金币。猜中返还 2 倍。",
    qaResultTrigger: "QA 结果触发",
    qaResultBody: "无需等待真实完场即可预览结果演出。",
    demoWin: "胜利演示",
    demoLoss: "失败演示",
    firstBadge: "首个徽章",
    betBadge: "预测徽章",
    openSlips: "进行中的选择",
    noOpenSlips: "还没有进行中的选择。",
    settlesAfterKickoff: "开球后结算",
    resultReady: "结果已就绪",
    waitingForResult: "等待结果",
    openSlip: "进行中的选择",
    settle: "结算",
    wait: "等待",
    settled: "已结算",
    noSettledBets: "还没有已结算选择。",
    claim: "领取",
    claimed: "已领取",
    won: "成功",
    lost: "失败",
    payout: "奖励",
    payoutClaimed: "奖励已领取",
    shareProof: "分享证明",
    playAgain: "再玩一次",
    roarRank: "ROAR 等级",
    supportPoints: "助威点数",
    toNextRank: "到",
    maxRank: "最高等级",
    taps: "点击",
    shakes: "摇动",
    boardIcons: "看板图标",
    betsPlaced: "选择次数",
    betsWon: "命中次数",
    recentMatchRecords: "最近比赛记录",
    noSavedRecords: "还没有保存的比赛记录。",
    supportProof: "助威证明",
    createShareText: "生成分享卡",
    liveBursts: "实时爆发",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "预测开放",
    bettingClosed: "预测关闭",
    draw: "平局",
    pick: "选择",
    needCoins: "金币不足",
    closed: "已关闭",
    prob: "概率",
    returnRate: "回报",
    itemDrop: "道具掉落",
    boost: "加成",
    badgeEarned: "获得徽章",
    saved: "已保存",
    rankUp: "等级提升",
    prediction: "预测",
    contributionToast: "贡献",
    shareReadyTitle: "分享证明已准备",
    betClosedTitle: "预测已关闭",
    betClosedBody: "比赛已开球。仍可在 Play 中赚取金币。",
    notEnoughCoinsTitle: "金币不足",
    notEnoughCoinsBody: "锁定选择前，请通过点击和摇动赚取金币。",
    betLockedTitle: "选择已锁定",
    potentialReturn: "预计回报",
    predictionHit: "预测命中",
    predictionMissed: "预测未中",
    claimFromChest: "从结果宝箱领取 {amount}",
    claimFromChestShort: "从宝箱领取 {amount}",
    stakeGone: "{pick} 未中。投入已失效。",
    stakeBurned: "已使用 {amount}。去 Play 赚回来。",
    settlementLocked: "结果锁定",
    settlementLockedBody: "预计终场后重新加载结果。",
    notReadyYet: "尚未就绪",
    notReadyYetBody: "这场比赛尚未到结果处理时间。",
    resultPending: "结果待定",
    payoutClaimedTitle: "奖励已领取",
    payoutClaimedBody: "{amount} 已加入金币",
    dailyCheckIn: "每日签到",
    dailyCheckInBody: "今日助威金币 100 枚已加入。",
    dailyQuestComplete: "每日任务完成",
    rewardClaimed: "已领取 {amount} 奖励。",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
    shareReadyBody: "助威证明已准备到分享面板或剪贴板。",
    tapClaimPayout: "{pick} 命中。点击 Claim 转入金币库。",
    tryAgainBody: "{pick} 没有命中。在 Play 中赚金币后再试。",
    resultPendingBody: "开放数据中还没有最终比分。刷新后再试。",
  },
  es: {
    welcome: "Únete a ROAR",
    welcomeBody:
      "Elige idioma y equipo. Puedes animar antes, durante o después de cada partido.",
    language: "Idioma",
    nickname: "Apodo",
    nicknamePlaceholder: "Tu nombre de hincha",
    nicknameHint: "Aparece en tu tarjeta y en el historial.",
    chooseTeam: "Elige tu equipo",
    startPlaying: "Empezar",
    tap: "Tocar",
    shake: "Agitar",
    myScore: "Mi puntuación",
    myTeam: "Mi equipo",
    rivalTeam: "Rival",
    teamScore: "Puntuación del equipo",
    coins: "Monedas",
    coinBank: "Banco de monedas",
    coinHint: "Tocar y agitar suman puntos, marcador del equipo y monedas.",
    scoreboard: "Marcador",
    contribution: "Tu contribución",
    trophies: "Historial",
    play: "Jugar",
    matches: "Partidos",
    bets: "Apuestas",
    selected: "Seleccionado",
    choose: "Elegir",
    cheeringOpen: "animar siempre está abierto",
    motionShake: "Agitar móvil",
    enable: "Activar",
    on: "ON",
    off: "No",
    ready: "Listo",
    crowdBattle: "Batalla de hinchada",
    nowCheering: "Animando ahora",
    combo: "Combo",
    playMatch: "Jugar partido",
    upcoming: "Próximos",
    today: "Hoy",
    all: "Todos",
    predictionBets: "Predicciones",
    predictionBetsHint: "Usa monedas aquí. Gana más en Play.",
    changeMatch: "Cambiar partido",
    stake: "Apuesta",
    toKickoff: "para el inicio",
    closedAfterKickoff: "Cerrado tras el inicio",
    supportCoinRule:
      "1 punto de apoyo gana 1 moneda. Los aciertos devuelven 2x.",
    qaResultTrigger: "Disparador QA",
    qaResultBody: "Previsualiza el resultado sin esperar el marcador final.",
    demoWin: "Demo acierto",
    demoLoss: "Demo fallo",
    firstBadge: "Primera insignia",
    betBadge: "Insignia de pick",
    openSlips: "Predicciones abiertas",
    noOpenSlips: "Aún no hay predicciones abiertas.",
    settlesAfterKickoff: "Se resuelve tras el inicio",
    resultReady: "resultado listo",
    waitingForResult: "esperando resultado",
    openSlip: "predicción abierta",
    settle: "Resolver",
    wait: "Esperar",
    settled: "Resueltas",
    noSettledBets: "Aún no hay predicciones resueltas.",
    claim: "Cobrar",
    claimed: "Cobrado",
    won: "Acertada",
    lost: "Fallida",
    payout: "recompensa",
    payoutClaimed: "Recompensa cobrada",
    shareProof: "Compartir prueba",
    playAgain: "Jugar otra vez",
    roarRank: "Rango ROAR",
    supportPoints: "puntos de apoyo",
    toNextRank: "para",
    maxRank: "Rango máximo",
    taps: "Taps",
    shakes: "Shakes",
    boardIcons: "Iconos del tablero",
    betsPlaced: "Predicciones hechas",
    betsWon: "Predicciones acertadas",
    recentMatchRecords: "Registros recientes",
    noSavedRecords: "Aún no hay registros guardados.",
    supportProof: "Prueba de apoyo",
    createShareText: "Crear tarjeta",
    liveBursts: "Ráfagas en vivo",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "Predicción abierta",
    bettingClosed: "Predicción cerrada",
    draw: "Empate",
    pick: "Elegir",
    needCoins: "Faltan monedas",
    closed: "Cerrado",
    prob: "prob.",
    returnRate: "retorno",
    itemDrop: "objeto obtenido",
    boost: "IMPULSO",
    badgeEarned: "insignia ganada",
    saved: "GUARDADO",
    rankUp: "Sube de rango",
    prediction: "predicción",
    contributionToast: "contribución",
    shareReadyTitle: "Prueba lista",
    betClosedTitle: "Predicciones cerradas",
    betClosedBody:
      "El partido ya empezó. Puedes seguir ganando monedas en Play.",
    notEnoughCoinsTitle: "Faltan monedas",
    notEnoughCoinsBody: "Gana monedas con Tap y Shake antes de fijar un pick.",
    betLockedTitle: "Pick fijado",
    potentialReturn: "retorno posible",
    predictionHit: "Predicción acertada",
    predictionMissed: "Predicción fallida",
    claimFromChest: "Recibe {amount} del cofre de resultado",
    claimFromChestShort: "Recibe {amount} del cofre",
    stakeGone: "{pick} falló. La entrada se perdió.",
    stakeBurned: "Usaste {amount}. Recupéralo en Play.",
    settlementLocked: "Resultado bloqueado",
    settlementLockedBody:
      "Recarga los resultados tras el silbato final estimado.",
    notReadyYet: "Aún no está listo",
    notReadyYetBody: "El partido aún no llegó al momento de resultado.",
    resultPending: "Resultado pendiente",
    payoutClaimedTitle: "Recompensa cobrada",
    payoutClaimedBody: "{amount} añadido a tus monedas",
    dailyCheckIn: "Check-in diario",
    dailyCheckInBody: "Se añadieron 100 monedas de apoyo hoy.",
    dailyQuestComplete: "Misión diaria completa",
    rewardClaimed: "Recompensa de {amount} cobrada.",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
    shareReadyBody: "Tu prueba está lista para compartir o copiar.",
    tapClaimPayout: "{pick} acertó. Toca Claim para mover la recompensa.",
    tryAgainBody:
      "{pick} no acertó. Gana monedas en Play e inténtalo otra vez.",
    resultPendingBody: "El marcador final aún no está en los datos abiertos.",
  },
  fr: {
    welcome: "Rejoindre ROAR",
    welcomeBody:
      "Choisissez votre langue et votre équipe. Vous pouvez encourager avant, pendant ou après chaque match.",
    language: "Langue",
    nickname: "Pseudo",
    nicknamePlaceholder: "Votre nom de supporter",
    nicknameHint: "Affiché sur la carte et l'historique.",
    chooseTeam: "Choisir l'équipe",
    startPlaying: "Encourager",
    tap: "Tap",
    shake: "Secouer",
    myScore: "Mon score",
    myTeam: "Mon équipe",
    rivalTeam: "Rival",
    teamScore: "Score d'équipe",
    coins: "Pièces",
    coinBank: "Banque de pièces",
    coinHint: "Tap et shake ajoutent score, score d'équipe et pièces.",
    scoreboard: "Panneau",
    contribution: "Votre contribution",
    trophies: "Historique",
    play: "Jouer",
    matches: "Matchs",
    bets: "Paris",
    selected: "Sélectionné",
    choose: "Choisir",
    cheeringOpen: "les encouragements sont toujours ouverts",
    motionShake: "Secouer",
    enable: "Activer",
    on: "ON",
    off: "Non",
    ready: "Prêt",
    crowdBattle: "Bataille de foule",
    nowCheering: "En soutien",
    combo: "Combo",
    playMatch: "Jouer un match",
    upcoming: "À venir",
    today: "Aujourd’hui",
    all: "Tous",
    predictionBets: "Pronostics",
    predictionBetsHint: "Utilisez des pièces ici. Gagnez-en plus dans Play.",
    changeMatch: "Changer",
    stake: "Mise",
    toKickoff: "avant coup d’envoi",
    closedAfterKickoff: "Fermé après le coup d’envoi",
    supportCoinRule:
      "1 point de soutien donne 1 pièce. Un bon choix rapporte 2x.",
    qaResultTrigger: "Déclencheur QA",
    qaResultBody: "Prévisualisez le résultat sans attendre le score final.",
    demoWin: "Démo réussite",
    demoLoss: "Démo échec",
    firstBadge: "Premier badge",
    betBadge: "Badge de choix",
    openSlips: "Pronostics ouverts",
    noOpenSlips: "Aucun pronostic ouvert.",
    settlesAfterKickoff: "Réglé après le coup d’envoi",
    resultReady: "résultat prêt",
    waitingForResult: "en attente du résultat",
    openSlip: "pronostic ouvert",
    settle: "Régler",
    wait: "Attendre",
    settled: "Réglés",
    noSettledBets: "Aucun pronostic réglé.",
    claim: "Recevoir",
    claimed: "Reçu",
    won: "Réussi",
    lost: "Raté",
    payout: "récompense",
    payoutClaimed: "Récompense reçue",
    shareProof: "Partager",
    playAgain: "Rejouer",
    roarRank: "Rang ROAR",
    supportPoints: "points de soutien",
    toNextRank: "avant",
    maxRank: "Rang max",
    taps: "Taps",
    shakes: "Shakes",
    boardIcons: "Icônes du panneau",
    betsPlaced: "Choix placés",
    betsWon: "Choix réussis",
    recentMatchRecords: "Records récents",
    noSavedRecords: "Aucun record enregistré.",
    supportProof: "Preuve de soutien",
    createShareText: "Créer la carte",
    liveBursts: "Éclats en direct",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "Pronostic ouvert",
    bettingClosed: "Pronostic fermé",
    draw: "Nul",
    pick: "Choisir",
    needCoins: "Pièces requises",
    closed: "Fermé",
    prob: "prob.",
    returnRate: "retour",
    itemDrop: "objet obtenu",
    boost: "BOOST",
    badgeEarned: "badge gagné",
    saved: "ENREGISTRÉ",
    rankUp: "Rang supérieur",
    prediction: "pronostic",
    contributionToast: "contribution",
    shareReadyTitle: "Preuve prête",
    betClosedTitle: "Pronostics fermés",
    betClosedBody:
      "Le coup d’envoi est passé. Vous pouvez encore gagner des pièces dans Play.",
    notEnoughCoinsTitle: "Pièces insuffisantes",
    notEnoughCoinsBody:
      "Gagnez des pièces avec Tap et Shake avant de fixer un choix.",
    betLockedTitle: "Choix verrouillé",
    potentialReturn: "retour possible",
    predictionHit: "Pronostic réussi",
    predictionMissed: "Pronostic raté",
    claimFromChest: "Recevoir {amount} depuis le coffre",
    claimFromChestShort: "Recevoir {amount} du coffre",
    stakeGone: "{pick} a échoué. La mise est perdue.",
    stakeBurned: "{amount} utilisé. Regagnez-le dans Play.",
    settlementLocked: "Résultat verrouillé",
    settlementLockedBody: "Rechargez les résultats après la fin estimée.",
    notReadyYet: "Pas encore prêt",
    notReadyYetBody: "Le match n’est pas encore au moment du résultat.",
    resultPending: "Résultat en attente",
    payoutClaimedTitle: "Récompense reçue",
    payoutClaimedBody: "{amount} ajouté aux pièces",
    dailyCheckIn: "Connexion quotidienne",
    dailyCheckInBody: "100 pièces de soutien ajoutées aujourd’hui.",
    dailyQuestComplete: "Quête quotidienne terminée",
    rewardClaimed: "Récompense {amount} reçue.",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
    shareReadyBody:
      "Votre preuve est prête dans le partage ou le presse-papiers.",
    tapClaimPayout:
      "{pick} a réussi. Touchez Claim pour déplacer la récompense.",
    tryAgainBody: "{pick} n’a pas réussi. Gagnez des pièces et réessayez.",
    resultPendingBody:
      "Le score final n’est pas encore dans les données ouvertes.",
  },
  de: {
    welcome: "ROAR beitreten",
    welcomeBody:
      "Wähle Sprache und Team. Du kannst vor, während und nach jedem Spiel anfeuern.",
    language: "Sprache",
    nickname: "Nickname",
    nicknamePlaceholder: "Dein Supporter-Name",
    nicknameHint: "Erscheint auf Karte und Historie.",
    chooseTeam: "Team wählen",
    startPlaying: "Anfeuern",
    tap: "Tippen",
    shake: "Schütteln",
    myScore: "Mein Score",
    myTeam: "Mein Team",
    rivalTeam: "Rivale",
    teamScore: "Team-Score",
    coins: "Münzen",
    coinBank: "Münzbank",
    coinHint: "Tippen und Schütteln erhöhen Score, Team-Score und Münzen.",
    scoreboard: "Anzeigetafel",
    contribution: "Dein Beitrag",
    trophies: "Historie",
    play: "Spielen",
    matches: "Spiele",
    bets: "Wetten",
    selected: "Ausgewählt",
    choose: "Wählen",
    cheeringOpen: "Anfeuern ist immer offen",
    motionShake: "Motion Shake",
    enable: "Aktivieren",
    on: "ON",
    off: "Aus",
    ready: "Bereit",
    crowdBattle: "Crowd Battle",
    nowCheering: "Jetzt anfeuern",
    combo: "Combo",
    playMatch: "Spiel wählen",
    upcoming: "Demnächst",
    today: "Heute",
    all: "Alle",
    predictionBets: "Tipps",
    predictionBetsHint: "Setze Münzen hier ein. Mehr bekommst du in Play.",
    changeMatch: "Spiel ändern",
    stake: "Einsatz",
    toKickoff: "bis Anpfiff",
    closedAfterKickoff: "Nach Anpfiff geschlossen",
    supportCoinRule:
      "1 Supportpunkt bringt 1 Münze. Richtige Picks bringen 2x zurück.",
    qaResultTrigger: "QA-Ergebnis",
    qaResultBody: "Ergebnis-Show ohne echtes Endresultat prüfen.",
    demoWin: "Demo Treffer",
    demoLoss: "Demo Fehlgriff",
    firstBadge: "Erstes Badge",
    betBadge: "Pick-Badge",
    openSlips: "Offene Tipps",
    noOpenSlips: "Noch keine offenen Tipps.",
    settlesAfterKickoff: "Wird nach Anpfiff ausgewertet",
    resultReady: "Ergebnis bereit",
    waitingForResult: "warte auf Ergebnis",
    openSlip: "offener Tipp",
    settle: "Auswerten",
    wait: "Warten",
    settled: "Erledigt",
    noSettledBets: "Noch keine ausgewerteten Tipps.",
    claim: "Abholen",
    claimed: "Abgeholt",
    won: "Getroffen",
    lost: "Verpasst",
    payout: "Belohnung",
    payoutClaimed: "Belohnung abgeholt",
    shareProof: "Nachweis teilen",
    playAgain: "Noch einmal",
    roarRank: "ROAR-Rang",
    supportPoints: "Supportpunkte",
    toNextRank: "bis",
    maxRank: "Maximalrang",
    taps: "Taps",
    shakes: "Shakes",
    boardIcons: "Tafel-Icons",
    betsPlaced: "Picks platziert",
    betsWon: "Picks getroffen",
    recentMatchRecords: "Letzte Spielrekorde",
    noSavedRecords: "Noch keine gespeicherten Rekorde.",
    supportProof: "Support-Nachweis",
    createShareText: "Share-Karte erstellen",
    liveBursts: "Live-Bursts",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "Pick offen",
    bettingClosed: "Pick geschlossen",
    draw: "Remis",
    pick: "Wählen",
    needCoins: "Münzen fehlen",
    closed: "Geschlossen",
    prob: "Wahrsch.",
    returnRate: "Rückgabe",
    itemDrop: "Item erhalten",
    boost: "BOOST",
    badgeEarned: "Badge erhalten",
    saved: "GESPEICHERT",
    rankUp: "Rangaufstieg",
    prediction: "Vorhersage",
    contributionToast: "Beitrag",
    shareReadyTitle: "Nachweis bereit",
    betClosedTitle: "Picks geschlossen",
    betClosedBody:
      "Der Anpfiff ist vorbei. In Play kannst du weiter Münzen verdienen.",
    notEnoughCoinsTitle: "Nicht genug Münzen",
    notEnoughCoinsBody:
      "Verdiene mit Tap und Shake Münzen, bevor du einen Pick fixierst.",
    betLockedTitle: "Pick fixiert",
    potentialReturn: "mögliche Rückgabe",
    predictionHit: "Pick getroffen",
    predictionMissed: "Pick verfehlt",
    claimFromChest: "{amount} aus der Ergebnis-Truhe holen",
    claimFromChestShort: "{amount} aus der Truhe holen",
    stakeGone: "{pick} verfehlt. Der Einsatz ist weg.",
    stakeBurned: "{amount} genutzt. Hol es in Play zurück.",
    settlementLocked: "Ergebnis gesperrt",
    settlementLockedBody: "Lade Ergebnisse nach dem erwarteten Abpfiff neu.",
    notReadyYet: "Noch nicht bereit",
    notReadyYetBody: "Dieses Spiel ist noch nicht bei der Auswertung.",
    resultPending: "Ergebnis ausstehend",
    payoutClaimedTitle: "Belohnung abgeholt",
    payoutClaimedBody: "{amount} zu deinen Münzen hinzugefügt",
    dailyCheckIn: "Täglicher Check-in",
    dailyCheckInBody: "100 Support-Münzen für heute hinzugefügt.",
    dailyQuestComplete: "Tagesquest erledigt",
    rewardClaimed: "{amount} Belohnung abgeholt.",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
    shareReadyBody:
      "Dein Support-Nachweis ist zum Teilen oder Kopieren bereit.",
    tapClaimPayout:
      "{pick} getroffen. Tippe Claim, um die Belohnung zu verschieben.",
    tryAgainBody:
      "{pick} landete nicht. Verdiene Münzen und versuche es erneut.",
    resultPendingBody: "Der Endstand ist noch nicht in den offenen Daten.",
  },
  pt: {
    welcome: "Entrar no ROAR",
    welcomeBody:
      "Escolha idioma e time. Você pode torcer antes, durante ou depois de cada partida.",
    language: "Idioma",
    nickname: "Apelido",
    nicknamePlaceholder: "Seu nome de torcedor",
    nicknameHint: "Aparece no cartão e no histórico.",
    chooseTeam: "Escolha seu time",
    startPlaying: "Começar",
    tap: "Tocar",
    shake: "Agitar",
    myScore: "Minha pontuação",
    myTeam: "Meu time",
    rivalTeam: "Rival",
    teamScore: "Pontuação do time",
    coins: "Moedas",
    coinBank: "Banco de moedas",
    coinHint: "Tocar e agitar somam pontos, placar do time e moedas.",
    scoreboard: "Placar",
    contribution: "Sua contribuição",
    trophies: "Histórico",
    play: "Jogar",
    matches: "Partidas",
    bets: "Apostas",
    selected: "Selecionado",
    choose: "Escolher",
    cheeringOpen: "torcida sempre aberta",
    motionShake: "Agitar",
    enable: "Ativar",
    on: "ON",
    off: "Off",
    ready: "Pronto",
    crowdBattle: "Batalha da torcida",
    nowCheering: "Torcendo agora",
    combo: "Combo",
    playMatch: "Jogar partida",
    upcoming: "Próximas",
    today: "Hoje",
    all: "Todas",
    predictionBets: "Previsões",
    predictionBetsHint: "Use moedas aqui. Ganhe mais no Play.",
    changeMatch: "Trocar partida",
    stake: "Entrada",
    toKickoff: "até o início",
    closedAfterKickoff: "Fechado após o início",
    supportCoinRule: "1 ponto de apoio rende 1 moeda. Acertos retornam 2x.",
    qaResultTrigger: "Gatilho QA",
    qaResultBody: "Veja a celebração sem esperar o placar final.",
    demoWin: "Demo acerto",
    demoLoss: "Demo erro",
    firstBadge: "Primeiro emblema",
    betBadge: "Emblema de palpite",
    openSlips: "Previsões abertas",
    noOpenSlips: "Ainda não há palpites abertos.",
    settlesAfterKickoff: "Resolve após o início",
    resultReady: "resultado pronto",
    waitingForResult: "aguardando resultado",
    openSlip: "palpite aberto",
    settle: "Resolver",
    wait: "Aguardar",
    settled: "Resolvidas",
    noSettledBets: "Ainda não há palpites resolvidos.",
    claim: "Receber",
    claimed: "Recebido",
    won: "Acertou",
    lost: "Errou",
    payout: "recompensa",
    payoutClaimed: "Recompensa recebida",
    shareProof: "Compartilhar prova",
    playAgain: "Jogar de novo",
    roarRank: "Rank ROAR",
    supportPoints: "pontos de apoio",
    toNextRank: "para",
    maxRank: "Rank máximo",
    taps: "Taps",
    shakes: "Shakes",
    boardIcons: "Ícones do painel",
    betsPlaced: "Palpites feitos",
    betsWon: "Palpites certos",
    recentMatchRecords: "Registros recentes",
    noSavedRecords: "Ainda não há registros salvos.",
    supportProof: "Prova de torcida",
    createShareText: "Criar cartão",
    liveBursts: "Explosões ao vivo",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "Palpite aberto",
    bettingClosed: "Palpite fechado",
    draw: "Empate",
    pick: "Escolher",
    needCoins: "Faltam moedas",
    closed: "Fechado",
    prob: "prob.",
    returnRate: "retorno",
    itemDrop: "item recebido",
    boost: "BOOST",
    badgeEarned: "emblema ganho",
    saved: "SALVO",
    rankUp: "Subiu de nível",
    prediction: "previsão",
    contributionToast: "contribuição",
    shareReadyTitle: "Prova pronta",
    betClosedTitle: "Palpites fechados",
    betClosedBody: "A partida começou. Você ainda pode ganhar moedas no Play.",
    notEnoughCoinsTitle: "Moedas insuficientes",
    notEnoughCoinsBody:
      "Ganhe moedas com Tap e Shake antes de fixar um palpite.",
    betLockedTitle: "Palpite fixado",
    potentialReturn: "retorno possível",
    predictionHit: "Palpite certo",
    predictionMissed: "Palpite errado",
    claimFromChest: "Receba {amount} do baú de resultado",
    claimFromChestShort: "Receba {amount} do baú",
    stakeGone: "{pick} errou. A entrada foi perdida.",
    stakeBurned: "{amount} usado. Ganhe de volta no Play.",
    settlementLocked: "Resultado bloqueado",
    settlementLockedBody:
      "Recarregue os resultados após o apito final estimado.",
    notReadyYet: "Ainda não está pronto",
    notReadyYetBody: "Esta partida ainda não chegou ao horário de resultado.",
    resultPending: "Resultado pendente",
    payoutClaimedTitle: "Recompensa recebida",
    payoutClaimedBody: "{amount} adicionado às moedas",
    dailyCheckIn: "Check-in diário",
    dailyCheckInBody: "100 moedas de apoio adicionadas hoje.",
    dailyQuestComplete: "Missão diária completa",
    rewardClaimed: "Recompensa de {amount} recebida.",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
    shareReadyBody: "Sua prova está pronta para compartilhar ou copiar.",
    tapClaimPayout: "{pick} acertou. Toque Claim para mover a recompensa.",
    tryAgainBody: "{pick} não acertou. Ganhe moedas e tente de novo.",
    resultPendingBody: "O placar final ainda não está nos dados abertos.",
  },
  ar: {
    welcome: "انضم إلى ROAR",
    welcomeBody:
      "اختر اللغة والفريق. يمكنك التشجيع قبل أو أثناء أو بعد كل مباراة.",
    language: "اللغة",
    nickname: "الاسم",
    nicknamePlaceholder: "اسم المشجع",
    nicknameHint: "يظهر على بطاقة الإثبات والسجل.",
    chooseTeam: "اختر فريقك",
    startPlaying: "ابدأ التشجيع",
    tap: "نقر",
    shake: "هز",
    myScore: "نقاطي",
    myTeam: "فريقي",
    rivalTeam: "الفريق المنافس",
    teamScore: "نقاط الفريق",
    coins: "عملات",
    coinBank: "رصيد العملات",
    coinHint: "النقر والهز يزيدان النقاط ونقاط الفريق والعملات.",
    scoreboard: "لوحة النتائج",
    contribution: "مساهمتك",
    trophies: "السجل",
    play: "العب",
    matches: "المباريات",
    bets: "التوقعات",
    selected: "مختار",
    choose: "اختر",
    cheeringOpen: "التشجيع مفتوح دائمًا",
    motionShake: "هز الحركة",
    enable: "تفعيل",
    on: "ON",
    off: "إيقاف",
    ready: "جاهز",
    crowdBattle: "معركة الجمهور",
    nowCheering: "تشجيع الآن",
    combo: "كومبو",
    playMatch: "اختر مباراة",
    upcoming: "قادمة",
    today: "اليوم",
    all: "الكل",
    predictionBets: "اختيارات التوقع",
    predictionBetsHint: "استخدم العملات هنا. اكسب المزيد في Play.",
    changeMatch: "تغيير المباراة",
    stake: "المبلغ",
    toKickoff: "حتى البداية",
    closedAfterKickoff: "مغلق بعد البداية",
    supportCoinRule: "كل نقطة تشجيع تمنح عملة واحدة. الاختيار الصحيح يعيد 2x.",
    qaResultTrigger: "مشغّل اختبار النتيجة",
    qaResultBody: "عاين عرض النتيجة دون انتظار النتيجة النهائية.",
    demoWin: "عرض نجاح",
    demoLoss: "عرض إخفاق",
    firstBadge: "الشارة الأولى",
    betBadge: "شارة الاختيار",
    openSlips: "اختيارات مفتوحة",
    noOpenSlips: "لا توجد اختيارات مفتوحة بعد.",
    settlesAfterKickoff: "تتم التسوية بعد البداية",
    resultReady: "النتيجة جاهزة",
    waitingForResult: "بانتظار النتيجة",
    openSlip: "اختيار مفتوح",
    settle: "تسوية",
    wait: "انتظار",
    settled: "تمت التسوية",
    noSettledBets: "لا توجد اختيارات تمت تسويتها بعد.",
    claim: "استلام",
    claimed: "تم الاستلام",
    won: "نجح",
    lost: "لم ينجح",
    payout: "مكافأة",
    payoutClaimed: "تم استلام المكافأة",
    shareProof: "مشاركة الإثبات",
    playAgain: "العب مجددًا",
    roarRank: "رتبة ROAR",
    supportPoints: "نقاط التشجيع",
    toNextRank: "إلى",
    maxRank: "أعلى رتبة",
    taps: "نقرات",
    shakes: "هزات",
    boardIcons: "أيقونات اللوحة",
    betsPlaced: "الاختيارات",
    betsWon: "الاختيارات الناجحة",
    recentMatchRecords: "سجلات المباريات الأخيرة",
    noSavedRecords: "لا توجد سجلات محفوظة بعد.",
    supportProof: "إثبات التشجيع",
    createShareText: "إنشاء بطاقة مشاركة",
    liveBursts: "ومضات مباشرة",
    stage: "Stage",
    warmup: "Warm-up",
    fillSeats: "Fill seats",
    spawnFans: "Spawn fans",
    crowdReacts: "Crowd reacts",
    comboFever: "Combo fever",
    boardTransfer: "Board transfer",
    playing: "Playing",
    bettingOpen: "التوقع مفتوح",
    bettingClosed: "التوقع مغلق",
    draw: "تعادل",
    pick: "اختر",
    needCoins: "تحتاج عملات",
    closed: "مغلق",
    prob: "احتمال",
    returnRate: "عائد",
    itemDrop: "عنصر جديد",
    boost: "تعزيز",
    badgeEarned: "شارة مكتسبة",
    saved: "تم الحفظ",
    rankUp: "ترقية الرتبة",
    prediction: "توقع",
    contributionToast: "مساهمة",
    shareReadyTitle: "الإثبات جاهز",
    betClosedTitle: "التوقعات مغلقة",
    betClosedBody: "بدأت المباراة. يمكنك الاستمرار في كسب العملات في Play.",
    notEnoughCoinsTitle: "عملات غير كافية",
    notEnoughCoinsBody: "اكسب العملات عبر Tap و Shake قبل تثبيت الاختيار.",
    betLockedTitle: "تم تثبيت الاختيار",
    potentialReturn: "العائد المحتمل",
    predictionHit: "توقع ناجح",
    predictionMissed: "توقع غير ناجح",
    claimFromChest: "استلم {amount} من صندوق النتيجة",
    claimFromChestShort: "استلم {amount} من الصندوق",
    stakeGone: "لم ينجح {pick}. فقدت العملات المستخدمة.",
    stakeBurned: "تم استخدام {amount}. اكسبها مجددًا في Play.",
    settlementLocked: "النتيجة مقفلة",
    settlementLockedBody: "أعد تحميل النتائج بعد صافرة النهاية المقدرة.",
    notReadyYet: "ليست جاهزة بعد",
    notReadyYetBody: "لم تصل المباراة بعد إلى وقت النتيجة.",
    resultPending: "النتيجة معلقة",
    payoutClaimedTitle: "تم استلام المكافأة",
    payoutClaimedBody: "تمت إضافة {amount} إلى عملاتك",
    dailyCheckIn: "تسجيل يومي",
    dailyCheckInBody: "تمت إضافة 100 عملة تشجيع اليوم.",
    dailyQuestComplete: "اكتملت مهمة اليوم",
    rewardClaimed: "تم استلام مكافأة {amount}.",
    sessionReset: "Session reset",
    sessionResetBody:
      "Local test state cleared for today. Saved match records were kept.",
    motionOnTitle: "Motion shake ON",
    motionOnBody:
      "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
    motionBlockedTitle: "Motion shake blocked",
    motionBlockedBody:
      "Use the Shake button for manual points, or enable motion in browser settings.",
    openDataSynced: "Open data synced",
    openDataSyncedBody: "Summer Cup 2026 schedule and result data loaded.",
    openDataSyncedAgain: "Latest match data checked again.",
    openDataFailed: "Open data failed",
    openDataFailedBody: "Built-in sample matches keep the game playable.",
    kickoffPassed: "Kickoff passed",
    matchday: "Matchday",
    demoKickoff: "Demo kickoff",
    openDemo: "Open Demo",
    firstRoar: "First Roar",
    fingerWarmUp: "Finger Warm-Up",
    shakeSignal: "Shake Signal",
    firstDrop: "First Drop",
    rareCollector: "Rare Collector",
    epicProof: "Epic Proof",
    stadiumHeat: "Stadium Heat",
    wristBooster: "Wrist Booster",
    predictionRookie: "Prediction Rookie",
    badgeFirstRoarDesc: "Earn your first support point",
    badgeTap30Desc: "Tap 30 times",
    badgeShake15Desc: "Shake 15 times",
    badgeCombo10Desc: "Reach combo x10",
    badgeFirstDropDesc: "Collect 1 item",
    badgeRareDesc: "Own a rare item",
    badgeEpicDesc: "Own an epic item",
    badgeHypeDesc: "Reach HYPE LV.4",
    badgeScoreDesc: "Score 500 support points",
    badgeFirstPickDesc: "Lock your first prediction",
    badgeFirstWinDesc: "Land 1 prediction",
    rookie: "Rookie",
    regular: "Regular",
    ultra: "Ultra",
    captain: "Captain",
    legend: "Legend",
    rookieTone: "First voice in the stand",
    regularTone: "The crowd knows your chant",
    ultraTone: "Your section follows your rhythm",
    captainTone: "You lead the whole stand",
    legendTone: "ROAR remembers this run",
    rankClimbed: "Your ROAR level just climbed.",
    rankReached: "{rank} rank reached",
    badgeUnlocked: "{badge} badge unlocked",
    badgeUnlockedBody: "{desc}. Added to your support proof.",
    seatsLit: "Seats lit",
    seatsLitBody: "Your first roar lights up the lower stand.",
    crowdWave: "Crowd wave",
    crowdWaveBody: "Your section expands across the stadium.",
    wristWarmed: "Wrist warmed up",
    wristWarmedBody: "Every tap starts pushing the crowd higher.",
    feverBoost: "Fever boost",
    feverBoostBody: "The next actions hit harder on screen.",
    proofUnlocked: "Proof unlocked",
    proofUnlockedBody: "Your support proof is ready to share.",
    stadiumTakeover: "Stadium takeover",
    stadiumTakeoverBody: "Your side is visibly pressuring the rival stand.",
    shareReadyBody: "إثبات التشجيع جاهز للمشاركة أو النسخ.",
    tapClaimPayout: "نجح {pick}. اضغط Claim لنقل المكافأة.",
    tryAgainBody: "لم ينجح {pick}. اكسب عملات في Play وحاول مرة أخرى.",
    resultPendingBody: "النتيجة النهائية غير متوفرة بعد في البيانات المفتوحة.",
  },
  hi: {
    welcome: "ROAR में शामिल हों",
    welcomeBody:
      "भाषा और टीम चुनें। आप हर मैच से पहले, दौरान या बाद में चीयर कर सकते हैं।",
    language: "भाषा",
    nickname: "निकनेम",
    nicknamePlaceholder: "आपका सपोर्टर नाम",
    nicknameHint: "प्रूफ कार्ड और इतिहास में दिखेगा।",
    chooseTeam: "टीम चुनें",
    startPlaying: "चीयर शुरू करें",
    tap: "टैप",
    shake: "शेक",
    myScore: "मेरा स्कोर",
    myTeam: "मेरी टीम",
    rivalTeam: "प्रतिद्वंद्वी",
    teamScore: "टीम स्कोर",
    coins: "कॉइन",
    coinBank: "कॉइन बैंक",
    coinHint: "टैप और शेक से स्कोर, टीम स्कोर और कॉइन बढ़ते हैं।",
    scoreboard: "स्कोरबोर्ड",
    contribution: "आपका योगदान",
    trophies: "इतिहास",
    play: "प्ले",
    matches: "मैच",
    bets: "बेट्स",
    selected: "चुना गया",
    choose: "चुनें",
    cheeringOpen: "चीयर हमेशा खुला है",
    motionShake: "मोशन शेक",
    enable: "चालू करें",
    on: "ON",
    predictionBetsHint: "यहां कॉइन खर्च करें। Play में और कमाएं।",
    toKickoff: "किकऑफ तक",
    closedAfterKickoff: "किकऑफ के बाद बंद",
    supportCoinRule: "1 सपोर्ट पॉइंट से 1 कॉइन मिलता है। सही पिक 2x लौटाती है।",
    qaResultTrigger: "QA रिज़ल्ट ट्रिगर",
    qaResultBody: "फाइनल स्कोर का इंतज़ार किए बिना रिज़ल्ट इफेक्ट देखें।",
    demoWin: "डेमो जीत",
    demoLoss: "डेमो हार",
    firstBadge: "पहला बैज",
    betBadge: "पिक बैज",
    noOpenSlips: "अभी कोई ओपन पिक नहीं।",
    settlesAfterKickoff: "किकऑफ के बाद सेटल",
    resultReady: "रिज़ल्ट तैयार",
    waitingForResult: "रिज़ल्ट का इंतज़ार",
    openSlip: "ओपन पिक",
    settle: "सेटल",
    wait: "रुकें",
    noSettledBets: "अभी कोई सेटल्ड पिक नहीं।",
    payout: "रिवार्ड",
    payoutClaimed: "रिवार्ड क्लेम्ड",
    roarRank: "ROAR रैंक",
    toNextRank: "तक",
    maxRank: "मैक्स रैंक",
    boardIcons: "बोर्ड आइकन",
    betsPlaced: "पिक्स रखे",
    betsWon: "पिक्स जीते",
    recentMatchRecords: "हाल के मैच रिकॉर्ड",
    noSavedRecords: "अभी कोई सेव रिकॉर्ड नहीं।",
    supportProof: "सपोर्ट प्रूफ",
    createShareText: "शेयर कार्ड बनाएं",
    liveBursts: "लाइव बर्स्ट",
    bettingOpen: "पिक खुली",
    bettingClosed: "पिक बंद",
    prob: "संभावना",
    returnRate: "रिटर्न",
    itemDrop: "आइटम ड्रॉप",
    boost: "बूस्ट",
    badgeEarned: "बैज मिला",
    saved: "सेव्ड",
    prediction: "प्रेडिक्शन",
    contributionToast: "योगदान",
    shareReadyTitle: "प्रूफ तैयार",
    shareReadyBody: "आपका सपोर्ट प्रूफ शेयर शीट या क्लिपबोर्ड में तैयार है।",
    betClosedTitle: "पिक्स बंद",
    betClosedBody: "किकऑफ हो चुका है। Play में कॉइन फिर भी कमा सकते हैं।",
    notEnoughCoinsTitle: "कॉइन कम हैं",
    notEnoughCoinsBody: "पिक लॉक करने से पहले Tap और Shake से कॉइन कमाएं।",
    betLockedTitle: "पिक लॉक हुई",
    potentialReturn: "संभावित रिटर्न",
    predictionHit: "प्रेडिक्शन हिट",
    predictionMissed: "प्रेडिक्शन मिस",
    claimFromChest: "रिज़ल्ट चेस्ट से {amount} क्लेम करें",
    claimFromChestShort: "चेस्ट से {amount} क्लेम करें",
    tapClaimPayout:
      "{pick} हिट हुई। रिवार्ड कॉइन बैंक में भेजने के लिए Claim दबाएं।",
    stakeGone: "{pick} मिस हुई। लगाए कॉइन चले गए।",
    stakeBurned: "{amount} इस्तेमाल हुए। Play में वापस कमाएं।",
    tryAgainBody: "{pick} नहीं लगी। Play में कॉइन कमाएं और फिर कोशिश करें।",
    settlementLocked: "रिज़ल्ट लॉक",
    settlementLockedBody: "अनुमानित फाइनल व्हिसल के बाद रिज़ल्ट रीलोड करें।",
    notReadyYet: "अभी तैयार नहीं",
    notReadyYetBody: "यह मैच अभी रिज़ल्ट समय तक नहीं पहुंचा।",
    resultPending: "रिज़ल्ट पेंडिंग",
    resultPendingBody:
      "ओपन डेटा में फाइनल स्कोर अभी नहीं है। रिफ्रेश करके फिर कोशिश करें।",
    payoutClaimedTitle: "रिवार्ड क्लेम्ड",
    payoutClaimedBody: "{amount} आपके कॉइन में जोड़े गए",
    dailyCheckIn: "डेली चेक-इन",
    dailyCheckInBody: "आज 100 सपोर्ट कॉइन जोड़े गए।",
    dailyQuestComplete: "डेली क्वेस्ट पूरी",
    rewardClaimed: "{amount} रिवार्ड क्लेम हुआ।",
  },
};
const PERSONAL_STAND_COLS = 24;
const PERSONAL_STAND_ROWS = 6;
const PERSONAL_STAND_COUNT = PERSONAL_STAND_COLS * PERSONAL_STAND_ROWS;
const SCOREBOARD_COLS = 18;
const SCOREBOARD_ROWS = 10;
const SCOREBOARD_CELL_COUNT = SCOREBOARD_COLS * SCOREBOARD_ROWS;
const PERSONAL_SCOREBOARD_GOALS = [40, 120, 300, 700, 1500, 3000];
const COLLECTIVE_SCOREBOARD_GOALS = [150, 350, 800, 2000, 8000, 30000];
const ROUND_DURATION_MS = 60_000;
const CLUTCH_DURATION_MS = 10_000;
const IDLE_SAVE_PROMPT_LEAD_MS = 900;
const RETURN_BANK_MIN_IDLE_MS = 120_000;
const RETURN_BANK_STORAGE_KEY = "roar-return-bank-v1";
const FAIR_CHEER_ROUND_CAP = 300;
const FAIR_CHEER_PAIR_BONUS = 2;
const SPECTATOR_SETS = [
  ["set-a", 100],
  ["set-b", 80],
  ["set-c", 53],
] as const;
const PERSONAL_STAGE_STEPS = [
  { goal: 0, label: "Warm-up", key: "warmup" },
  { goal: 25, label: "Fill seats", key: "fillSeats" },
  { goal: 120, label: "Spawn fans", key: "spawnFans" },
  { goal: 450, label: "Crowd reacts", key: "crowdReacts" },
  { goal: 1200, label: "Combo fever", key: "comboFever" },
  { goal: 3000, label: "Board transfer", key: "boardTransfer" },
];
const COMBO_TIERS = [
  { count: 60, multiplier: 5 },
  { count: 40, multiplier: 4 },
  { count: 20, multiplier: 3 },
  { count: 10, multiplier: 2 },
  { count: 6, multiplier: 1.5 },
  { count: 1, multiplier: 1 },
] as const;
const BASE_COMBO_DECAY_DELAY_MS = 1500;
const FEVER_DURATION_MS = 5000;
const UPGRADE_STORAGE_KEY = "roar-upgrades-v1";
const DEFAULT_UPGRADES = {
  tapPower: 0,
  comboKeeper: 0,
  critChance: 0,
};
type UpgradeKey = keyof typeof DEFAULT_UPGRADES;
type UpgradeState = Record<UpgradeKey, number>;
type SessionSummary = {
  id: number;
  country: string;
  roar: number;
  bestMultiplier: number;
  coinsEarned: number;
  boardIcons: number;
};
type WelcomeBackReward = {
  id: number;
  amount: number;
  idleMinutes: number;
  jackpot: boolean;
};

function comboMultiplierFor(comboCount: number) {
  return (
    COMBO_TIERS.find((tier) => comboCount >= tier.count)?.multiplier ?? 1
  );
}

function decayComboCount(comboCount: number) {
  if (comboCount <= 1) return 1;
  if (comboCount > 60) return 60;
  if (comboCount > 40) return 40;
  if (comboCount > 20) return 20;
  if (comboCount > 10) return 10;
  if (comboCount > 6) return 6;
  return 1;
}

function upgradeCost(kind: UpgradeKey, level: number) {
  const base = kind === "tapPower" ? 120 : kind === "comboKeeper" ? 160 : 180;
  return Math.round(base * Math.pow(1.72, level));
}

function scaledCollectiveGoals(activeCheerers: number) {
  const scale = Math.max(0.7, Math.min(2.4, Math.sqrt(activeCheerers)));
  return COLLECTIVE_SCOREBOARD_GOALS.map((goal) => Math.round(goal * scale));
}

function variableReturnReward(idleMs: number) {
  const idleMinutes = Math.max(2, Math.floor(idleMs / 60_000));
  const roll = Math.random();
  const base = Math.min(1200, 20 + idleMinutes * 7);
  if (roll > 0.985) return Math.round(base * 12);
  if (roll > 0.92) return Math.round(base * 4);
  if (roll > 0.62) return Math.round(base * 1.6);
  return Math.max(12, Math.round(base * (0.35 + Math.random() * 0.55)));
}

const UPGRADE_DEFS: Record<
  UpgradeKey,
  { label: string; body: string; stat: string }
> = {
  tapPower: {
    label: "Tap Power",
    body: "+1 base roar per level",
    stat: "Base",
  },
  comboKeeper: {
    label: "Combo Keeper",
    body: "+0.45s before combo decay",
    stat: "Hold",
  },
  critChance: {
    label: "Crit Chance",
    body: "+3.5% CRIT chance per level",
    stat: "Crit",
  },
};

// Runner/campaign progress mapped to even stage segments so the runner
// advances a visible chunk each stage (instead of crawling 0->3000 linearly).
function campaignStageProgress(cheer: number): number {
  const goals = PERSONAL_STAGE_STEPS.map((step) => step.goal);
  const last = goals.length - 1;
  let seg = 0;
  while (seg < last && cheer >= goals[seg + 1]) seg += 1;
  const start = goals[seg];
  const end = goals[Math.min(seg + 1, last)];
  const intra = end > start ? Math.min(1, (cheer - start) / (end - start)) : 1;
  return Math.min(100, Math.round(((seg + intra) / last) * 100));
}

const FALLBACK_MATCHES: CupMatch[] = [
  {
    id: "fallback-1",
    date: "2026-06-11",
    time: "13:00 UTC-6",
    round: "Matchday 1",
    group: "Group A",
    team1: "Mexico",
    team2: "South Africa",
    ground: "Mexico City",
  },
  {
    id: "fallback-2",
    date: "2026-06-11",
    time: "20:00 UTC-6",
    round: "Matchday 1",
    group: "Group A",
    team1: "South Korea",
    team2: "Czech Republic",
    ground: "Guadalajara",
  },
  {
    id: "fallback-3",
    date: "2026-06-18",
    time: "12:00 UTC-4",
    round: "Matchday 8",
    group: "Group A",
    team1: "Czech Republic",
    team2: "South Africa",
    ground: "Atlanta",
  },
  {
    id: "fallback-4",
    date: "2026-06-19",
    time: "20:00 UTC-6",
    round: "Matchday 9",
    group: "Group A",
    team1: "South Korea",
    team2: "Mexico",
    ground: "Mexico City",
  },
  {
    id: "fallback-5",
    date: "2026-06-24",
    time: "18:00 UTC-5",
    round: "Matchday 14",
    group: "Group A",
    team1: "South Africa",
    team2: "South Korea",
    ground: "Dallas",
  },
];

function demoUpcomingMatch(referenceMs = Date.now()): CupMatch {
  const start = new Date(referenceMs + 8 * 60 * 60 * 1000);
  return {
    id: `demo-upcoming-${start.toISOString().slice(0, 10)}`,
    date: start.toISOString().slice(0, 10),
    time: `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")} UTC+0`,
    round: "Demo kickoff",
    group: "Open Demo",
    team1: "Brazil",
    team2: "Haiti",
    ground: "ROAR Arena",
  };
}

const MILESTONES = [
  { score: 50, titleKey: "seatsLit", bodyKey: "seatsLitBody" },
  { score: 150, titleKey: "crowdWave", bodyKey: "crowdWaveBody" },
  { score: 350, titleKey: "wristWarmed", bodyKey: "wristWarmedBody" },
  { score: 700, titleKey: "feverBoost", bodyKey: "feverBoostBody" },
  { score: 1200, titleKey: "proofUnlocked", bodyKey: "proofUnlockedBody" },
  { score: 2200, titleKey: "stadiumTakeover", bodyKey: "stadiumTakeoverBody" },
];

const DROP_THRESHOLDS = [120, 240, 420, 700, 1050, 1450, 1900, 2500];

const DROPS = [
  {
    name: "Second-Half Maniac",
    rarity: "rare" as const,
    reward: 80,
    power: "Big heat boost on the next run",
  },
  {
    name: "VAR Skeptic",
    rarity: "common" as const,
    reward: 30,
    power: "Small rival pressure boost",
  },
  {
    name: "Goal Sense",
    rarity: "epic" as const,
    reward: 180,
    power: "Stadium flash burst",
  },
  {
    name: "Extra Wrist",
    rarity: "rare" as const,
    reward: 90,
    power: "Combo hold +1",
  },
  {
    name: "Stoppage Believer",
    rarity: "common" as const,
    reward: 40,
    power: "Bonus support coins",
  },
  {
    name: "Stand Commander",
    rarity: "epic" as const,
    reward: 220,
    power: "Team possession boost",
  },
];

const BADGE_ART = "/mini-cup/assets/badges/";
const BADGES: Badge[] = [
  {
    id: "first-roar",
    name: "First Roar",
    icon: "01",
    image: `${BADGE_ART}badge-sc-01.png`,
    tier: "bronze",
    description: "Earn your first support point",
    reward: 20,
  },
  {
    id: "tap-30",
    name: "Finger Warm-Up",
    icon: "30",
    image: `${BADGE_ART}badge-sc-02.png`,
    tier: "bronze",
    description: "Tap 30 times",
    reward: 40,
  },
  {
    id: "shake-15",
    name: "Shake Signal",
    icon: "15",
    image: `${BADGE_ART}badge-sc-03.png`,
    tier: "bronze",
    description: "Shake 15 times",
    reward: 40,
  },
  {
    id: "combo-10",
    name: "Combo Fever",
    icon: "10",
    image: `${BADGE_ART}badge-sc-04.png`,
    tier: "silver",
    description: "Reach combo x10",
    reward: 80,
  },
  {
    id: "first-drop",
    name: "First Drop",
    icon: "IT",
    image: `${BADGE_ART}badge-sc-05.png`,
    tier: "silver",
    description: "Collect 1 item",
    reward: 80,
  },
  {
    id: "rare-owner",
    name: "Rare Collector",
    icon: "R",
    image: `${BADGE_ART}badge-sc-06.png`,
    tier: "gold",
    description: "Own a rare item",
    reward: 120,
  },
  {
    id: "epic-owner",
    name: "Epic Proof",
    icon: "E",
    image: `${BADGE_ART}badge-sc-07.png`,
    tier: "legend",
    description: "Own an epic item",
    reward: 220,
  },
  {
    id: "hype-3",
    name: "Stadium Heat",
    icon: "H3",
    image: `${BADGE_ART}badge-sc-08.png`,
    tier: "gold",
    description: "Reach HYPE LV.4",
    reward: 140,
  },
  {
    id: "score-500",
    name: "Wrist Booster",
    icon: "500",
    image: `${BADGE_ART}badge-sc-09.png`,
    tier: "gold",
    description: "Score 500 support points",
    reward: 160,
  },
  {
    id: "first-bet",
    name: "Prediction Rookie",
    icon: "B",
    image: `${BADGE_ART}badge-10.png`,
    tier: "silver",
    description: "Place your first bet",
    reward: 100,
  },
  {
    id: "first-win",
    name: "Prediction Hit",
    icon: "W",
    image: `${BADGE_ART}badge-11.png`,
    tier: "legend",
    description: "Win 1 bet",
    reward: 240,
  },
];

const EMOTIONS = [
  "Let's go",
  "No way",
  "VAR",
  "Please",
  "Goal soon",
  "Hold it",
];
const ROAR_RANKS: Array<{
  id: RoarRankId;
  name: string;
  threshold: number;
  image: string;
  tone: string;
}> = [
  {
    id: "rookie",
    name: "Rookie",
    threshold: 0,
    image: `${MASCOT_ASSETS}rank-01.png`,
    tone: "First voice in the stand",
  },
  {
    id: "regular",
    name: "Regular",
    threshold: 500,
    image: `${MASCOT_ASSETS}rank-02.png`,
    tone: "The crowd knows your chant",
  },
  {
    id: "ultra",
    name: "Ultra",
    threshold: 2000,
    image: `${MASCOT_ASSETS}rank-03.png`,
    tone: "Your section follows your rhythm",
  },
  {
    id: "captain",
    name: "Captain",
    threshold: 8000,
    image: `${MASCOT_ASSETS}rank-04.png`,
    tone: "You lead the whole stand",
  },
  {
    id: "legend",
    name: "Legend",
    threshold: 25000,
    image: `${MASCOT_ASSETS}rank-05.png`,
    tone: "ROAR remembers this run",
  },
];

const formatter = new Intl.NumberFormat("en-US");
const bigNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function localeTag(locale: LocaleCode) {
  return (
    (
      {
        en: "en-US",
        ko: "ko-KR",
        ja: "ja-JP",
        zh: "zh-CN",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        pt: "pt-BR",
        ar: "ar",
        hi: "hi-IN",
      } as Record<LocaleCode, string>
    )[locale] ?? "en-US"
  );
}

function fillCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll("{" + key + "}", String(value)),
    template,
  );
}

function coinText(
  value: number,
  format: Intl.NumberFormat = formatter,
  label = I18N.en.coins,
) {
  return format.format(Math.max(0, Math.floor(value))) + " " + label;
}

function badgeCopyKey(id: string, kind: "name" | "description") {
  const map: Record<string, [string, string]> = {
    "first-roar": ["firstRoar", "badgeFirstRoarDesc"],
    "tap-30": ["fingerWarmUp", "badgeTap30Desc"],
    "shake-15": ["shakeSignal", "badgeShake15Desc"],
    "combo-10": ["comboFever", "badgeCombo10Desc"],
    "first-drop": ["firstDrop", "badgeFirstDropDesc"],
    "rare-owner": ["rareCollector", "badgeRareDesc"],
    "epic-owner": ["epicProof", "badgeEpicDesc"],
    "hype-3": ["stadiumHeat", "badgeHypeDesc"],
    "score-500": ["wristBooster", "badgeScoreDesc"],
    "first-bet": ["predictionRookie", "badgeFirstPickDesc"],
    "first-win": ["predictionHit", "badgeFirstWinDesc"],
  };
  return map[id]?.[kind === "name" ? 0 : 1];
}

function rankCopyKey(id: RoarRankId, kind: "name" | "tone") {
  const map: Record<RoarRankId, [string, string]> = {
    rookie: ["rookie", "rookieTone"],
    regular: ["regular", "regularTone"],
    ultra: ["ultra", "ultraTone"],
    captain: ["captain", "captainTone"],
    legend: ["legend", "legendTone"],
  };
  return map[id][kind === "name" ? 0 : 1];
}

function rankForSupport(points: number) {
  return (
    [...ROAR_RANKS].reverse().find((rank) => points >= rank.threshold) ??
    ROAR_RANKS[0]
  );
}

function nextRankForSupport(points: number) {
  return ROAR_RANKS.find((rank) => points < rank.threshold);
}

function rankProgress(points: number) {
  const current = rankForSupport(points);
  const next = nextRankForSupport(points);
  if (!next) return 100;
  return Math.min(
    100,
    Math.round(
      ((points - current.threshold) /
        Math.max(1, next.threshold - current.threshold)) *
        100,
    ),
  );
}

function countdownText(match: CupMatch, now = Date.now(), t?: Translator) {
  const diff = matchStartAt(match).getTime() - now;
  if (diff <= 0) return t ? t("kickoffPassed") : "Kickoff passed";
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const FLAG_EMOJI: Record<string, string> = {
  Argentina: "🇦🇷",
  Algeria: "🇩🇿",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  "Bosnia & Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  "Cape Verde": "🇨🇻",
  Colombia: "🇨🇴",
  Croatia: "🇭🇷",
  Curaçao: "🇨🇼",
  "Czech Republic": "🇨🇿",
  Czechia: "🇨🇿",
  "DR Congo": "🇨🇩",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Haiti: "🇭🇹",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  Italy: "🇮🇹",
  "Ivory Coast": "🇨🇮",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Norway: "🇳🇴",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Scotland: "🏴",
  Senegal: "🇸🇳",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Turkey: "🇹🇷",
  USA: "🇺🇸",
  Uruguay: "🇺🇾",
  Uzbekistan: "🇺🇿",
};

const TEAM_COLOR: Record<string, [string, string]> = {
  Algeria: ["#006233", "#ffffff"],
  Argentina: ["#75aadb", "#ffffff"],
  Australia: ["#0b2f73", "#00843d"],
  Austria: ["#ed2939", "#ffffff"],
  Brazil: ["#009b3a", "#ffdf00"],
  "Bosnia & Herzegovina": ["#002395", "#fecb00"],
  Canada: ["#ff0000", "#ffffff"],
  "Cape Verde": ["#003893", "#cf2027"],
  Colombia: ["#fcd116", "#003893"],
  Croatia: ["#ff0000", "#ffffff"],
  Curaçao: ["#002b7f", "#f9e814"],
  France: ["#0055a4", "#ef4135"],
  Germany: ["#111111", "#dd0000"],
  "DR Congo": ["#00a3e0", "#ce1021"],
  Ecuador: ["#ffdd00", "#034ea2"],
  Egypt: ["#ce1126", "#000000"],
  England: ["#ffffff", "#cf142b"],
  Ghana: ["#ce1126", "#fcd116"],
  Haiti: ["#00209f", "#d21034"],
  Iran: ["#239f40", "#da0000"],
  Iraq: ["#ce1126", "#000000"],
  "Ivory Coast": ["#f77f00", "#009e60"],
  Japan: ["#ffffff", "#bc002d"],
  Jordan: ["#ce1126", "#007a3d"],
  Mexico: ["#006847", "#ce1126"],
  Morocco: ["#c1272d", "#006233"],
  Netherlands: ["#ae1c28", "#21468b"],
  "New Zealand": ["#00247d", "#cc142b"],
  Norway: ["#ba0c2f", "#00205b"],
  Panama: ["#ffffff", "#d21034"],
  Paraguay: ["#d52b1e", "#0038a8"],
  Portugal: ["#006600", "#ff0000"],
  Qatar: ["#8a1538", "#ffffff"],
  "Saudi Arabia": ["#006c35", "#ffffff"],
  Scotland: ["#0065bd", "#ffffff"],
  Senegal: ["#00853f", "#fdef42"],
  "South Africa": ["#007a4d", "#ffb612"],
  "South Korea": ["#ffffff", "#cd2e3a"],
  Spain: ["#aa151b", "#f1bf00"],
  Sweden: ["#006aa7", "#fecc00"],
  Switzerland: ["#d52b1e", "#ffffff"],
  Tunisia: ["#e70013", "#ffffff"],
  Turkey: ["#e30a17", "#ffffff"],
  Uruguay: ["#ffffff", "#0038a8"],
  Uzbekistan: ["#1eb6e7", "#009a44"],
  USA: ["#3c3b6e", "#b22234"],
};

function todayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function createDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dateKeyFrom(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("sv-SE");
}

function freshDailyState(): DailyState {
  return {
    date: todayKey(),
    claimedCheckIn: false,
    taps: 0,
    shakes: 0,
    bets: 0,
    settlements: 0,
    questClaims: {},
  };
}

function loadDailyState(): DailyState {
  if (typeof window === "undefined") return freshDailyState();
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem("roar-daily") ?? "null",
    ) as DailyState | null;
    if (parsed?.date === todayKey()) return parsed;
  } catch {
    return freshDailyState();
  }
  return freshDailyState();
}

function matchStartAt(match: CupMatch) {
  if (!match.time) return new Date(`${match.date}T00:00:00`);
  const parsed = match.time.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/);
  if (!parsed) return new Date(`${match.date}T00:00:00`);
  const [, hour, minute, offset] = parsed;
  const offsetNumber = Number(offset);
  const offsetText = `${offsetNumber >= 0 ? "+" : "-"}${String(Math.abs(offsetNumber)).padStart(2, "0")}:00`;
  return new Date(
    `${match.date}T${hour.padStart(2, "0")}:${minute}:00${offsetText}`,
  );
}

function matchFinishedAt(match: CupMatch) {
  return new Date(matchStartAt(match).getTime() + 2.25 * 60 * 60 * 1000);
}

function canBetOnMatch(match: CupMatch) {
  return Date.now() < matchStartAt(match).getTime();
}

function canSettleMatch(match: CupMatch) {
  return Date.now() >= matchFinishedAt(match).getTime();
}

function matchPhase(match: CupMatch) {
  const now = Date.now();
  const start = matchStartAt(match).getTime();
  const finish = matchFinishedAt(match).getTime();
  if (now < start) return "upcoming";
  if (now <= finish) return "live";
  return "ended";
}

function matchPhaseLabel(match: CupMatch) {
  const phase = matchPhase(match);
  if (phase === "upcoming")
    return canBetOnMatch(match) ? "Play & bet open" : "Play open";
  if (phase === "live") return "Live cheering";
  return outcomeFromScore(match) ? "Result synced" : "Cheering open";
}

function parseOpenFootball(data: unknown): CupMatch[] {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as { matches?: unknown[] }).matches)
  )
    return FALLBACK_MATCHES;
  return (data as { matches: Array<Record<string, unknown>> }).matches
    .map((match, index) => ({
      id: `${String(match.date ?? "unknown")}-${String(match.team1 ?? "team1")}-${String(match.team2 ?? "team2")}-${index}`,
      date: String(match.date ?? "2026-06-11"),
      time: typeof match.time === "string" ? match.time : undefined,
      round: String(match.round ?? "Matchday"),
      group: typeof match.group === "string" ? match.group : undefined,
      team1: String(match.team1 ?? "Team A"),
      team2: String(match.team2 ?? "Team B"),
      ground: typeof match.ground === "string" ? match.ground : undefined,
      score: match.score as CupMatch["score"],
      events: Array.isArray(match.events)
        ? (match.events as MatchGoal[])
        : undefined,
    }))
    .filter((match) => match.team1 && match.team2);
}

function outcomeFromScore(match: CupMatch): Pick | null {
  const ft = match.score?.ft;
  if (!ft || !canSettleMatch(match)) return null;
  if (ft[0] > ft[1]) return "team1";
  if (ft[0] < ft[1]) return "team2";
  return "draw";
}

function teamIndexFor(match: CupMatch, country: string) {
  return country === match.team1 ? 0 : country === match.team2 ? 1 : 0;
}

function goalMinuteLabel(goal: MatchGoal) {
  if (goal.minute == null || goal.minute === "") return "";
  const raw = String(goal.minute).replace(/'$/, "");
  return `${raw}'`;
}

function goalEventsFor(match: CupMatch) {
  return (match.events ?? [])
    .filter((event) => event.type === "goal" && event.team)
    .map((event, index) => ({
      ...event,
      id: `${event.team}-${event.minute ?? index}-${event.name ?? index}`,
    }));
}

function latestGoalFor(match: CupMatch, country: string) {
  return [...goalEventsFor(match)]
    .reverse()
    .find((goal) => goal.team === country);
}

function pickLabel(match: CupMatch, pick: Pick) {
  if (pick === "team1") return match.team1;
  if (pick === "team2") return match.team2;
  return "Draw";
}

function flagFor(country: string) {
  return FLAG_EMOJI[country] ?? "🏳️";
}

function colorsFor(country: string) {
  return TEAM_COLOR[country] ?? ["#2937e8", "#0b6555"];
}

const CROWD_HUE_BUCKETS: Record<string, string> = {
  base: "0deg",
  redWhite: "145deg",
  greenYellow: "265deg",
  redYellow: "160deg",
  orange: "175deg",
  purple: "55deg",
};

const CROWD_HUE_COUNTRY: Record<string, keyof typeof CROWD_HUE_BUCKETS> = {
  Argentina: "base",
  Australia: "greenYellow",
  Belgium: "redYellow",
  Brazil: "greenYellow",
  Cameroon: "greenYellow",
  Canada: "redWhite",
  Chile: "redWhite",
  China: "redYellow",
  Colombia: "greenYellow",
  Croatia: "redWhite",
  "Czech Republic": "redWhite",
  Denmark: "redWhite",
  Ecuador: "greenYellow",
  England: "redWhite",
  France: "redWhite",
  Germany: "redYellow",
  Ghana: "redYellow",
  Haiti: "purple",
  Iran: "greenYellow",
  Italy: "greenYellow",
  Japan: "redWhite",
  Mexico: "greenYellow",
  Morocco: "redWhite",
  Netherlands: "orange",
  Nigeria: "greenYellow",
  Poland: "redWhite",
  Portugal: "greenYellow",
  Qatar: "redWhite",
  Scotland: "base",
  Senegal: "greenYellow",
  Serbia: "redWhite",
  "South Africa": "greenYellow",
  "South Korea": "redWhite",
  Spain: "redYellow",
  Sweden: "base",
  Switzerland: "redWhite",
  Ukraine: "base",
  Uruguay: "base",
  USA: "redWhite",
};

function crowdHueFor(country: string) {
  return CROWD_HUE_BUCKETS[CROWD_HUE_COUNTRY[country] ?? "purple"];
}

type CrowdScheme = "rw" | "bw" | "gy" | "ry" | "gr" | "kg";

const CROWD_SCHEME_SWATCH: Record<CrowdScheme, [string, string]> = {
  rw: ["#f8fafc", "#cf142b"],
  bw: ["#0f172a", "#f8fafc"],
  gy: ["#16a34a", "#facc15"],
  ry: ["#dc2626", "#facc15"],
  gr: ["#16a34a", "#dc2626"],
  kg: ["#111827", "#facc15"],
};

const CROWD_SCHEME_BY_CODE: Record<string, CrowdScheme> = {
  en: "rw",
  jp: "rw",
  ch: "rw",
  dk: "rw",
  pl: "rw",
  ca: "rw",
  ar: "bw",
  uy: "bw",
  scot: "bw",
  us: "bw",
  br: "gy",
  au: "gy",
  es: "ry",
  cn: "ry",
  mx: "gr",
  pt: "gr",
  it: "gr",
  ma: "gr",
  de: "kg",
  be: "kg",
};

const CROWD_COUNTRY_CODE: Record<string, string> = {
  argentina: "ar",
  australia: "au",
  belgium: "be",
  bosnia: "ba",
  "bosnia and herzegovina": "ba",
  "bosnia & herzegovina": "ba",
  brazil: "br",
  canada: "ca",
  cameroon: "cm",
  chile: "cl",
  china: "cn",
  colombia: "co",
  croatia: "hr",
  "czech republic": "cz",
  denmark: "dk",
  ecuador: "ec",
  england: "en",
  france: "fr",
  germany: "de",
  ghana: "gh",
  haiti: "ht",
  iran: "ir",
  italy: "it",
  japan: "jp",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  nigeria: "ng",
  poland: "pl",
  portugal: "pt",
  qatar: "qa",
  "saudi arabia": "sa",
  scotland: "scot",
  senegal: "sn",
  serbia: "rs",
  "south africa": "za",
  "south korea": "kr",
  korea: "kr",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  ukraine: "ua",
  uruguay: "uy",
  usa: "us",
  "united states": "us",
  "united states of america": "us",
};

function normalizeCountryKey(country: string) {
  return country.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function hexChannels(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ] as const;
}

function colorDistance(a: string, b: string) {
  const [ar, ag, ab] = hexChannels(a);
  const [br, bg, bb] = hexChannels(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function nearestCrowdScheme(country: string): CrowdScheme {
  const [from, to] = colorsFor(country);
  return (Object.entries(CROWD_SCHEME_SWATCH) as Array<
    [CrowdScheme, [string, string]]
  >).reduce(
    (best, [scheme, [schemeFrom, schemeTo]]) => {
      const distance =
        colorDistance(from, schemeFrom) + colorDistance(to, schemeTo);
      if (distance < best.distance) return { scheme, distance };
      return best;
    },
    { scheme: "rw" as CrowdScheme, distance: Number.POSITIVE_INFINITY },
  ).scheme;
}

function crowdCountryCode(country: string) {
  return CROWD_COUNTRY_CODE[normalizeCountryKey(country)] ?? null;
}

function crowdSchemeFor(country: string): CrowdScheme {
  const code = crowdCountryCode(country);
  if (code && CROWD_SCHEME_BY_CODE[code]) return CROWD_SCHEME_BY_CODE[code];
  return nearestCrowdScheme(country);
}

function hashStr(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function spectatorSrc(index: number, setName: string, count: number) {
  const specIdx = ((index * 7) % count) + 1;
  return `${SPECTATOR_ASSETS}${setName}/spec-${String(specIdx).padStart(2, "0")}.png`;
}

function impactAvatarSrc(index: number) {
  const avatarIdx = ((index * 7) % 18) + 1;
  return `${CROWD_AVATAR_ASSETS}fan-${String(avatarIdx).padStart(2, "0")}.png`;
}

function crowdMotionClass(index: number) {
  return [
    "crowd-motion-bob",
    "crowd-motion-sway",
    "crowd-motion-hop",
    "crowd-motion-lean",
  ][index % 4];
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

const FLAG_GRID_MAP = FLAG_GRID as Record<string, string[][]>;
function flagCardColor(country: string, row: number, col: number) {
  const grid = FLAG_GRID_MAP[country];
  if (grid?.[row]?.[col]) return grid[row][col];
  const [from, to] = colorsFor(country);
  const third = Math.floor((col / SCOREBOARD_COLS) * 3);
  if (country === "South Korea")
    return (row + col) % 5 === 0
      ? "#111827"
      : row < SCOREBOARD_ROWS / 2
        ? "#ffffff"
        : col < SCOREBOARD_COLS / 2
          ? "#ef4444"
          : "#2563eb";
  if (country === "United States" || country === "USA")
    return row % 2 === 0 ? "#ef4444" : "#ffffff";
  if (country === "Australia")
    return row < 3 && col < 7 ? "#ffffff" : "#123a8c";
  if (country === "Brazil")
    return (row + col) % 4 === 0 ? "#facc15" : "#16a34a";
  if (country === "Mexico")
    return third === 0 ? "#16a34a" : third === 1 ? "#ffffff" : "#ef4444";
  if (country === "France")
    return third === 0 ? "#2563eb" : third === 1 ? "#ffffff" : "#ef4444";
  if (country === "Japan")
    return (row - 4.5) ** 2 + (col - 8.5) ** 2 < 14 ? "#ef4444" : "#ffffff";
  if (country === "Morocco")
    return (row + col) % 7 === 0 ? "#16a34a" : "#dc2626";
  return third === 0 ? from : third === 1 ? "#f8fafc" : to;
}

function supportTotalFor(country: string, base: number, score: number) {
  let hash = 0;
  for (const char of country)
    hash = (hash * 31 + char.charCodeAt(0)) % 90000000;
  return base * 10000 + score * 1327 + hash + 3200000;
}

function seededRivalCheer(matchId: string, country: string) {
  return hashStr(`${matchId}:${country}`) % 7;
}

function isKnownCountry(country: string) {
  return Boolean(FLAG_EMOJI[country] || TEAM_COLOR[country]);
}

function hasKnownTeams(match: CupMatch) {
  return isKnownCountry(match.team1) && isKnownCountry(match.team2);
}

function defaultMatchId(matches: CupMatch[]) {
  const now = Date.now();
  return (
    matches.find(
      (match) => matchStartAt(match).getTime() >= now && hasKnownTeams(match),
    ) ??
    matches.find((match) => matchStartAt(match).getTime() >= now) ??
    matches.find(
      (match) =>
        matchStartAt(match).getTime() <= now &&
        matchFinishedAt(match).getTime() > now,
    ) ??
    [...matches].sort(
      (a, b) => matchStartAt(b).getTime() - matchStartAt(a).getTime(),
    )[0]
  )?.id;
}

function ensureBettableDemo(matches: CupMatch[]) {
  if (matches.some((match) => canBetOnMatch(match))) return matches;
  return [demoUpcomingMatch(), ...matches];
}

function preferredMatchId(matches: CupMatch[], currentId?: string) {
  const current = currentId
    ? matches.find((match) => match.id === currentId)
    : undefined;
  if (current && canBetOnMatch(current)) return current.id;
  return defaultMatchId(matches) ?? current?.id ?? matches[0]?.id;
}

function bestMatchForCountry(matches: CupMatch[], country: string) {
  const matching = matches.filter(
    (match) => match.team1 === country || match.team2 === country,
  );
  return (
    matching.find((match) => canBetOnMatch(match) && hasKnownTeams(match)) ??
    matching.find((match) => canBetOnMatch(match)) ??
    matching.find((match) => matchPhase(match) === "live") ??
    matching[0]
  );
}

function teamForm(matches: CupMatch[], team: string) {
  const played = matches
    .filter(
      (match) =>
        outcomeFromScore(match) &&
        (match.team1 === team || match.team2 === team),
    )
    .slice(-6);
  if (played.length === 0)
    return { played: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };

  return played.reduce(
    (acc, match) => {
      const ft = match.score?.ft ?? [0, 0];
      const home = match.team1 === team;
      const goalsFor = home ? ft[0] : ft[1];
      const goalsAgainst = home ? ft[1] : ft[0];
      const points =
        goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
      return {
        played: acc.played + 1,
        points: acc.points + points,
        goalsFor: acc.goalsFor + goalsFor,
        goalsAgainst: acc.goalsAgainst + goalsAgainst,
      };
    },
    { played: 0, points: 0, goalsFor: 0, goalsAgainst: 0 },
  );
}

const DAILY_QUESTS = [
  {
    id: "tap-30",
    label: "Tap 30 times",
    reward: 50,
    progress: (daily: DailyState) => daily.taps,
    goal: 30,
  },
  {
    id: "shake-15",
    label: "Shake 15 times",
    reward: 50,
    progress: (daily: DailyState) => daily.shakes,
    goal: 15,
  },
  {
    id: "bet-1",
    label: "Place 1 bet",
    reward: 100,
    progress: (daily: DailyState) => daily.bets,
    goal: 1,
  },
  {
    id: "settle-1",
    label: "Settle 1 bet",
    reward: 100,
    progress: (daily: DailyState) => daily.settlements,
    goal: 1,
  },
];

function predictionFor(
  match: CupMatch,
  matches: CupMatch[],
  possession: number,
  totalScore: number,
) {
  const form1 = teamForm(matches, match.team1);
  const form2 = teamForm(matches, match.team2);
  const supportBoost = match.team1.includes("Korea")
    ? possession - 50
    : match.team2.includes("Korea")
      ? 50 - possession
      : 0;
  const formDelta =
    (form1.points - form2.points) * 4 +
    (form1.goalsFor -
      form1.goalsAgainst -
      (form2.goalsFor - form2.goalsAgainst)) *
      2;
  const heat = Math.min(8, Math.floor(totalScore / 250));
  const team1Raw =
    45 +
    formDelta +
    supportBoost * 0.22 +
    (match.team1.includes("Korea") ? heat : 0);
  const drawRaw = 23 + Math.max(0, 8 - Math.abs(formDelta) * 0.4);
  const team2Raw = 100 - team1Raw - drawRaw;
  const total = Math.max(1, team1Raw + drawRaw + team2Raw);

  return {
    team1: Math.max(8, Math.round((team1Raw / total) * 100)),
    draw: Math.max(8, Math.round((drawRaw / total) * 100)),
    team2: Math.max(8, Math.round((team2Raw / total) * 100)),
    form1,
    form2,
  };
}

function impactGainFor(actionGain: number) {
  return actionGain;
}

function hypeLabel(tier: number) {
  return (
    ["Warm-up", "Roaring", "Wave", "Fever", "Overtime", "Legend"][tier] ??
    "Legend"
  );
}

function sessionTitle(impactPower: number) {
  if (impactPower >= 10000000) return "10M Cheer Proof";
  if (impactPower >= 3000000) return "Stadium Takeover";
  if (impactPower >= 1000000) return "Million Roar";
  if (impactPower >= 300000) return "Stand Commander";
  if (impactPower >= 80000) return "Wrist Warmed Up";
  return "Kickoff Supporter";
}

function badgeProgress(
  badge: Badge,
  values: {
    totalScore: number;
    tapScore: number;
    shakeScore: number;
    combo: number;
    drops: Drop[];
    hypeTier: number;
    bets: BetSlip[];
  },
) {
  const wonBets = values.bets.filter((bet) => bet.status === "won").length;
  if (badge.id === "first-roar")
    return { current: Math.min(values.totalScore, 1), goal: 1 };
  if (badge.id === "tap-30")
    return { current: Math.min(values.tapScore, 30), goal: 30 };
  if (badge.id === "shake-15")
    return { current: Math.min(values.shakeScore, 15), goal: 15 };
  if (badge.id === "combo-10")
    return { current: Math.min(values.combo, 10), goal: 10 };
  if (badge.id === "first-drop")
    return { current: Math.min(values.drops.length, 1), goal: 1 };
  if (badge.id === "rare-owner")
    return {
      current: values.drops.some((drop) => drop.rarity === "rare") ? 1 : 0,
      goal: 1,
    };
  if (badge.id === "epic-owner")
    return {
      current: values.drops.some((drop) => drop.rarity === "epic") ? 1 : 0,
      goal: 1,
    };
  if (badge.id === "hype-3")
    return { current: Math.min(values.hypeTier, 3), goal: 3 };
  if (badge.id === "score-500")
    return { current: Math.min(values.totalScore, 500), goal: 500 };
  if (badge.id === "first-bet")
    return { current: Math.min(values.bets.length, 1), goal: 1 };
  if (badge.id === "first-win")
    return { current: Math.min(wonBets, 1), goal: 1 };
  return { current: 0, goal: 1 };
}

export function RoarArena({
  initialMatchId,
  source = "direct",
  embedded = false,
}: {
  initialMatchId?: string;
  source?: string;
  embedded?: boolean;
}) {
  const { user, isGuest, loading: authLoading } = useAuth();
  const [tapScore, setTapScore] = useState(0);
  const [shakeScore, setShakeScore] = useState(0);
  const [comboBonus, setComboBonus] = useState(0);
  const [combo, setCombo] = useState(1);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [comboPulse, setComboPulse] = useState(0);
  const [feverUntil, setFeverUntil] = useState(0);
  const [lastCrit, setLastCrit] = useState<{ id: number; gain: number } | null>(
    null,
  );
  const [bestComboMultiplier, setBestComboMultiplier] = useState(1);
  const [sessionCoinsEarned, setSessionCoinsEarned] = useState(0);
  const [fairCheerSent, setFairCheerSent] = useState(0);
  const [fairCheerRoundSent, setFairCheerRoundSent] = useState(0);
  const [upgrades, setUpgrades] = useState<UpgradeState>(DEFAULT_UPGRADES);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(
    null,
  );
  const [welcomeBackReward, setWelcomeBackReward] =
    useState<WelcomeBackReward | null>(null);
  const [streakSavePrompt, setStreakSavePrompt] = useState(false);
  const [roundEndsAt, setRoundEndsAt] = useState(() => Date.now() + ROUND_DURATION_MS);
  const [roundReveal, setRoundReveal] = useState<{
    id: number;
    title: string;
    body: string;
  } | null>(null);
  const [teamPulse, setTeamPulse] = useState(0);
  const [rivalPulse, setRivalPulse] = useState(0);
  const [feed, setFeed] = useState<FeedEvent[]>([
    {
      id: 1,
      tone: "clutch",
      title: "Kickoff",
      body: "Build your support proof with Tap and Shake.",
    },
  ]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [roomCode, setRoomCode] = useState("RED-0619");
  const [coinBalance, setCoinBalance] = useState(0);
  const [impactPower, setImpactPower] = useState(0);
  const [bets, setBets] = useState<BetSlip[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [daily, setDaily] = useState<DailyState>(() => freshDailyState());
  const [stake, setStake] = useState(100);
  const [matches, setMatches] = useState<CupMatch[]>(() =>
    ensureBettableDemo(FALLBACK_MATCHES),
  );
  const [selectedMatchId, setSelectedMatchId] = useState(
    () =>
      initialMatchId ??
      preferredMatchId(ensureBettableDemo(FALLBACK_MATCHES)) ??
      FALLBACK_MATCHES[0].id,
  );
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("upcoming");
  const [cupTab, setCupTab] = useState<CupTab>("play");
  const [selectedCountry, setSelectedCountry] = useState(
    FALLBACK_MATCHES[0].team1,
  );
  const [dataStatus, setDataStatus] = useState("fallback data");
  const [matchDataSyncedAt, setMatchDataSyncedAt] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [burst, setBurst] = useState(0);
  const [shakeReady, setShakeReady] = useState(false);
  const [shareText, setShareText] = useState("");
  const [floatingPops, setFloatingPops] = useState<FloatingPop[]>([]);
  const [coinPops, setCoinPops] = useState<CoinPop[]>([]);
  const [itemReveal, setItemReveal] = useState<Drop | null>(null);
  const [badgeReveal, setBadgeReveal] = useState<Badge | null>(null);
  const [rankReveal, setRankReveal] = useState<
    (typeof ROAR_RANKS)[number] | null
  >(null);
  const [betReveal, setBetReveal] = useState<BetReveal | null>(null);
  const [goalReveal, setGoalReveal] = useState<GoalReveal | null>(null);
  const [resultReveal, setResultReveal] = useState<ResultReveal | null>(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [globalCheer, setGlobalCheer] = useState<CheerAggregate[]>([]);
  const [scoreBeat, setScoreBeat] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const [aiRivalCheer, setAiRivalCheer] = useState(0);
  const [boardSide, setBoardSide] = useState<BoardSide>("ally");
  const [runnerBestProgress, setRunnerBestProgress] = useState(0);
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [onboarded, setOnboarded] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [draftPlayerName, setDraftPlayerName] = useState("");
  const [mascotPose, setMascotPose] = useState<MascotPose>("idle");
  const [comboBurst, setComboBurst] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [qaMode, setQaMode] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [boardTrophyReveal, setBoardTrophyReveal] =
    useState<BoardReveal | null>(null);
  const [authIntent, setAuthIntent] = useState<RoarAuthIntent>("save_rank");
  const [sessionLinked, setSessionLinked] = useState(false);
  const [scoreSaveStatus, setScoreSaveStatus] =
    useState<ScoreSaveStatus>("idle");
  const [savedScoreInfo, setSavedScoreInfo] = useState<SavedScoreInfo | null>(
    null,
  );
  const [leaderboardRows, setLeaderboardRows] = useState<RoarLeaderboardRow[]>(
    [],
  );

  const lastActionRef = useRef<{ type: "tap" | "shake"; at: number } | null>(
    null,
  );
  const lastComboDecayRef = useRef(0);
  const returnBankHandledRef = useRef(0);
  const cheerBufferRef = useRef<
    Record<
      string,
      {
        matchId: string;
        matchTitle: string;
        country: string;
        taps: number;
        shakes: number;
      }
    >
  >({});
  const milestoneRef = useRef(new Set<number>());
  const dropThresholdRef = useRef(new Set<number>());
  const contributionThresholdRef = useRef(new Set<number>());
  const lastRankRef = useRef<RoarRankId | null>(null);
  const lastShakeRef = useRef(0);
  const lastScoreDispatchRef = useRef(0);
  const boardTouchStartRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const sfxRef = useRef<Partial<Record<SfxName, HTMLAudioElement>>>({});
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const prefersReducedRef = useRef(false);
  const mascotTimerRef = useRef<number | null>(null);
  const trackedViewRef = useRef(new Set<string>());
  const trackedMatchSelectionRef = useRef(new Set<string>());
  const predictionGatePreviewRef = useRef(new Set<string>());
  const deviceIdRef = useRef("");
  const sourceRef = useRef(source);
  const sessionSyncRef = useRef("");
  const lastScoreboardIconCountRef = useRef(0);
  const liveScoreSnapshotRef = useRef<
    Record<string, { home: number; away: number; phase: string }>
  >({});
  const liveResultShownRef = useRef(new Set<string>());
  const livePhaseRef = useRef<Record<string, string>>({});

  const selectedMatch =
    matches.find((match) => match.id === selectedMatchId) ?? matches[0];
  const selectedMatchTitle = `${selectedMatch.team1} vs ${selectedMatch.team2}`;
  const signedIn = !!user;
  const selectedSpectatorSet =
    SPECTATOR_SETS[hashStr(selectedMatch.id) % SPECTATOR_SETS.length];
  const copy = I18N[locale] ?? I18N.en;
  const t = useCallback(
    (key: string) => copy[key] ?? I18N.en[key] ?? key,
    [copy],
  );
  const fmt = useMemo(() => new Intl.NumberFormat(localeTag(locale)), [locale]);
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag(locale), {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );
  const compactFmt = useMemo(
    () =>
      new Intl.NumberFormat(localeTag(locale), {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale],
  );
  const tf = useCallback(
    (key: string, values: Record<string, string | number>) =>
      fillCopy(t(key), values),
    [t],
  );
  const coinCopy = useCallback(
    (value: number) => coinText(value, fmt, t("coins")),
    [fmt, t],
  );
  const rankName = useCallback(
    (rank: (typeof ROAR_RANKS)[number]) => t(rankCopyKey(rank.id, "name")),
    [t],
  );
  const rankTone = useCallback(
    (rank: (typeof ROAR_RANKS)[number]) => t(rankCopyKey(rank.id, "tone")),
    [t],
  );
  const badgeName = useCallback(
    (badge: Badge) => t(badgeCopyKey(badge.id, "name") ?? badge.name),
    [t],
  );
  const badgeDescription = useCallback(
    (badge: Badge) =>
      t(badgeCopyKey(badge.id, "description") ?? badge.description),
    [t],
  );

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId || !selectedMatch.id) return;
    const syncKey = `${selectedMatch.id}::${selectedCountry}::${signedIn ? "user" : "guest"}`;
    if (sessionSyncRef.current === syncKey) return;
    sessionSyncRef.current = syncKey;

    const controller = new AbortController();
    const startRoarSession = async () => {
      try {
        const response = await fetch("/api/roar/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            matchId: selectedMatch.id,
            matchTitle: selectedMatchTitle,
            teamSelected: selectedCountry,
            source,
            deviceId,
          }),
        });
        if (!response.ok) throw new Error("ROAR session sync failed");
        setSessionLinked(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSessionLinked(false);
        }
      }
    };

    void startRoarSession();
    return () => controller.abort();
  }, [deviceId, selectedCountry, selectedMatch.id, selectedMatchTitle, signedIn, source]);

  useEffect(() => {
    if (!initialMatchId) return;
    const scopedMatch = matches.find((match) => match.id === initialMatchId);
    if (!scopedMatch) return;

    setSelectedMatchId((current) =>
      current === scopedMatch.id ? current : scopedMatch.id,
    );
    setSelectedCountry((current) => {
      const storedCountry =
        typeof window !== "undefined"
          ? window.localStorage.getItem("roar-country")
          : null;
      const preferredCountry =
        storedCountry === scopedMatch.team1 || storedCountry === scopedMatch.team2
          ? storedCountry
          : current;
      return preferredCountry === scopedMatch.team1 ||
        preferredCountry === scopedMatch.team2
        ? preferredCountry
        : scopedMatch.team1;
    });
  }, [initialMatchId, matches]);

  useEffect(() => {
    if (!initialMatchId || !storageReady) return;
    const storedCountry = window.localStorage.getItem("roar-country");
    if (
      !storedCountry ||
      (storedCountry !== selectedMatch.team1 &&
        storedCountry !== selectedMatch.team2) ||
      storedCountry === selectedCountry
    ) {
      return;
    }
    setSelectedCountry(storedCountry);
  }, [
    initialMatchId,
    selectedCountry,
    selectedMatch.team1,
    selectedMatch.team2,
    storageReady,
  ]);

  const playerDisplayName = playerName.trim() || "Roari Fan";
  const countryChoices = useMemo(
    () => [selectedMatch.team1, selectedMatch.team2],
    [selectedMatch.team1, selectedMatch.team2],
  );
  const allCountryChoices = useMemo(
    () =>
      Array.from(
        new Set(matches.flatMap((match) => [match.team1, match.team2])),
      )
        .filter(Boolean)
        .filter(isKnownCountry)
        .sort((a, b) => a.localeCompare(b)),
    [matches],
  );
  const opponentCountry =
    selectedCountry === selectedMatch.team1
      ? selectedMatch.team2
      : selectedMatch.team1;
  const realMatchScore = selectedMatch.score?.ft;
  const selectedScoreIndex = teamIndexFor(selectedMatch, selectedCountry);
  const opponentScoreIndex = selectedScoreIndex === 0 ? 1 : 0;
  const selectedRealScore = realMatchScore?.[selectedScoreIndex] ?? 0;
  const opponentRealScore = realMatchScore?.[opponentScoreIndex] ?? 0;
  const realScoreLine = realMatchScore
    ? `${realMatchScore[0]}-${realMatchScore[1]}`
    : null;
  const livePhase = matchPhase(selectedMatch);
  const displayMatchScore = realMatchScore ?? ([0, 0] as [number, number]);
  const displayScoreStatus =
    livePhase === "ended"
      ? "END"
      : livePhase === "live"
        ? "LIVE"
        : "STARTING SOON";
  const displayScoreKicker =
    livePhase === "ended"
      ? "Final score"
      : livePhase === "live"
        ? "Live score"
        : "Pre-match";
  const realScoreSyncedLabel = matchDataSyncedAt
    ? timeFmt.format(matchDataSyncedAt)
    : null;
  const goalFeed = useMemo(() => goalEventsFor(selectedMatch), [selectedMatch]);
  const totalScore = tapScore + shakeScore + comboBonus;
  const matchCheerByCountry = useMemo(() => {
    const totals = new Map<string, CheerAggregate>();
    globalCheer
      .filter((item) => item.matchId === selectedMatch.id)
      .forEach((item) => totals.set(item.country, item));
    return totals;
  }, [globalCheer, selectedMatch.id]);
  const selectedGlobalCheer =
    matchCheerByCountry.get(selectedCountry)?.total ?? 0;
  const opponentGlobalCheer =
    matchCheerByCountry.get(opponentCountry)?.total ?? 0;
  const idleMs = lastActionRef.current
    ? Math.max(0, nowMs - lastActionRef.current.at)
    : totalScore > 0
      ? 20_000
      : 0;
  const heatDecay =
    idleMs <= 20_000
      ? 1
      : Math.max(0.08, 1 - (idleMs - 20_000) / 45_000);
  const activeSupportScore = Math.round(totalScore * heatDecay);
  const realScoreMomentum = realMatchScore
    ? Math.sign(selectedRealScore - opponentRealScore)
    : 0;
  const allyScoreMomentumBoost = realScoreMomentum > 0 ? 40 : 0;
  const rivalScoreMomentumBoost = realScoreMomentum < 0 ? 40 : 0;
  const visibleAllyCheer = Math.max(
    activeSupportScore + allyScoreMomentumBoost,
    Math.min(selectedGlobalCheer, activeSupportScore) +
      allyScoreMomentumBoost,
  );
  const visibleRivalCheer = Math.max(
    opponentGlobalCheer + rivalScoreMomentumBoost,
    aiRivalCheer + rivalScoreMomentumBoost,
  );
  const fairRivalCheer = Math.min(
    FAIR_CHEER_ROUND_CAP,
    Math.max(
      Math.min(opponentGlobalCheer, FAIR_CHEER_ROUND_CAP),
      Math.round(Math.min(FAIR_CHEER_ROUND_CAP, aiRivalCheer) * 0.92),
    ),
  );
  const collectiveScore = Math.max(selectedGlobalCheer, fairCheerSent);
  const activeCheererEstimate = Math.max(
    1,
    Math.ceil(Math.max(selectedGlobalCheer, fairCheerSent) / 900),
  );
  const collectiveBoardGoals = useMemo(
    () => scaledCollectiveGoals(activeCheererEstimate),
    [activeCheererEstimate],
  );
  const collectiveContribution = Math.min(
    100,
    (fairCheerSent / Math.max(1, collectiveScore)) * 100,
  );
  const scoreboardIconCount = PERSONAL_SCOREBOARD_GOALS.filter(
    (goal) => totalScore >= goal,
  ).length;
  const scoreboardGoal =
    PERSONAL_SCOREBOARD_GOALS[
      Math.min(scoreboardIconCount, PERSONAL_SCOREBOARD_GOALS.length - 1)
    ];
  const scoreboardBase =
    scoreboardIconCount > 0
      ? PERSONAL_SCOREBOARD_GOALS[scoreboardIconCount - 1]
      : 0;
  const scoreboardFill =
    scoreboardIconCount >= PERSONAL_SCOREBOARD_GOALS.length
      ? 100
      : Math.min(
          100,
          Math.round(
            ((totalScore - scoreboardBase) /
              Math.max(1, scoreboardGoal - scoreboardBase)) *
              100,
          ),
        );
  const scoreboardLitCount = Math.min(
    SCOREBOARD_CELL_COUNT,
    Math.round((scoreboardFill / 100) * SCOREBOARD_CELL_COUNT),
  );
  const rivalCollectiveScore = visibleRivalCheer;
  const rivalScoreboardIconCount = COLLECTIVE_SCOREBOARD_GOALS.filter(
    (goal) => rivalCollectiveScore >= goal,
  ).length;
  const rivalScoreboardGoal =
    COLLECTIVE_SCOREBOARD_GOALS[
      Math.min(rivalScoreboardIconCount, COLLECTIVE_SCOREBOARD_GOALS.length - 1)
    ];
  const rivalScoreboardBase =
    rivalScoreboardIconCount > 0
      ? COLLECTIVE_SCOREBOARD_GOALS[rivalScoreboardIconCount - 1]
      : 0;
  const rivalScoreboardFill =
    rivalScoreboardIconCount >= COLLECTIVE_SCOREBOARD_GOALS.length
      ? 100
      : Math.min(
          100,
          Math.round(
            ((rivalCollectiveScore - rivalScoreboardBase) /
              Math.max(1, rivalScoreboardGoal - rivalScoreboardBase)) *
              100,
          ),
        );
  const rivalScoreboardLitCount = Math.min(
    SCOREBOARD_CELL_COUNT,
    Math.round((rivalScoreboardFill / 100) * SCOREBOARD_CELL_COUNT),
  );
  const collectiveBoardIconCount = collectiveBoardGoals.filter(
    (goal) => collectiveScore >= goal,
  ).length;
  const collectiveBoardGoal =
    collectiveBoardGoals[
      Math.min(collectiveBoardIconCount, collectiveBoardGoals.length - 1)
    ] ?? collectiveBoardGoals[0];
  const collectiveBoardBase =
    collectiveBoardIconCount > 0
      ? collectiveBoardGoals[collectiveBoardIconCount - 1]
      : 0;
  const collectiveBoardFill =
    collectiveBoardIconCount >= collectiveBoardGoals.length
      ? 100
      : Math.min(
          100,
          Math.round(
            ((collectiveScore - collectiveBoardBase) /
              Math.max(1, collectiveBoardGoal - collectiveBoardBase)) *
              100,
          ),
        );
  const boardAlmost = scoreboardFill >= 85 && scoreboardFill < 100;
  const collectiveBoardAlmost =
    collectiveBoardFill >= 85 && collectiveBoardFill < 100;
  const activeBoardCountry =
    boardSide === "ally" ? selectedCountry : opponentCountry;
  const activeBoardLitCount =
    boardSide === "ally" ? scoreboardLitCount : rivalScoreboardLitCount;
  const personalSeatCount = Math.min(
    PERSONAL_STAND_COUNT,
    Math.round((visibleAllyCheer / 120) * PERSONAL_STAND_COUNT),
  );
  const personalFanCount = Math.min(
    PERSONAL_STAND_COUNT,
    Math.max(
      0,
      Math.round(((visibleAllyCheer - 120) / 330) * PERSONAL_STAND_COUNT),
    ),
  );
  const personalReactiveCount = Math.min(
    PERSONAL_STAND_COUNT,
    Math.max(
      0,
      Math.round(((visibleAllyCheer - 450) / 2550) * PERSONAL_STAND_COUNT),
    ),
  );
  const personalStandStage =
    visibleAllyCheer >= 3000
      ? 5
      : visibleAllyCheer >= 1200
        ? 4
        : visibleAllyCheer >= 450
          ? 3
          : visibleAllyCheer >= 120
            ? 2
            : visibleAllyCheer >= 25
              ? 1
              : 0;
  const currentPersonalStage =
    PERSONAL_STAGE_STEPS[personalStandStage] ?? PERSONAL_STAGE_STEPS[0];
  const comboDecayDelay =
    BASE_COMBO_DECAY_DELAY_MS + upgrades.comboKeeper * 450;
  const tapBase = Math.max(1, 1 + personalStandStage + upgrades.tapPower);
  const critChance = Math.min(0.45, 0.1 + upgrades.critChance * 0.035);
  const feverActive = feverUntil > nowMs;
  const feverMultiplier = feverActive ? 3 : 1;
  const roundMsLeft = Math.max(0, roundEndsAt - nowMs);
  const clutchActive = roundMsLeft > 0 && roundMsLeft <= CLUTCH_DURATION_MS;
  const comebackGap = visibleRivalCheer - visibleAllyCheer;
  const comebackActive = comebackGap > 80;
  const heatMultiplier = Math.min(
    1.35,
    1 + Math.max(0, heatDecay - 0.08) * Math.min(0.35, visibleAllyCheer / 5000),
  );
  const clutchMultiplier = clutchActive ? 2 : 1;
  const comebackMultiplier = comebackActive && !clutchActive ? 1.35 : 1;
  const nextBoardGoal =
    PERSONAL_SCOREBOARD_GOALS[
      Math.min(scoreboardIconCount, PERSONAL_SCOREBOARD_GOALS.length - 1)
    ] ?? PERSONAL_SCOREBOARD_GOALS[0];
  const sessionGoalText =
    comboMultiplier < 3
      ? `Reach ×3 combo`
      : scoreboardIconCount < PERSONAL_SCOREBOARD_GOALS.length
        ? `${selectedCountry} +${fmt.format(Math.max(0, nextBoardGoal - totalScore))} to next board icon`
        : `${selectedCountry} legend run`;
  const personalCampaignProgress = campaignStageProgress(visibleAllyCheer);
  const lockedCampaignProgress = Math.max(
    runnerBestProgress,
    personalCampaignProgress,
  );
  const stageRunnerProgress = Math.max(4, Math.min(96, lockedCampaignProgress));
  const supportedIsTeam1 = selectedCountry === selectedMatch.team1;
  const allyTotal = teamPulse + visibleAllyCheer;
  const rivalTotal = rivalPulse + visibleRivalCheer;
  const possession = Math.round(
    (allyTotal / Math.max(1, allyTotal + rivalTotal)) * 100,
  );
  const energyLevel = Math.min(
    100,
    Math.round((visibleAllyCheer / 2200) * 100),
  );
  const spectacleLevel =
    visibleAllyCheer >= 3000
      ? 5
      : visibleAllyCheer >= 1200
        ? 4
        : visibleAllyCheer >= 450
          ? 3
          : visibleAllyCheer >= 120
            ? 2
            : visibleAllyCheer >= 25
              ? 1
              : 0;
  const [allyColorA, allyColorB] = colorsFor(selectedCountry);
  const [rivalColorA, rivalColorB] = colorsFor(opponentCountry);
  const allyCrowdScheme = crowdSchemeFor(selectedCountry);
  const allyCrowdHue = crowdHueFor(selectedCountry);
  const rivalCrowdHue = crowdHueFor(opponentCountry);
  const hypeTier =
    totalScore > 1000
      ? 5
      : totalScore > 650
        ? 4
        : totalScore > 350
          ? 3
          : totalScore > 160
            ? 2
            : totalScore > 50
              ? 1
              : 0;
  const predictionHome = Math.min(
    5,
    Math.max(
      0,
      Math.floor(
        ((supportedIsTeam1 ? possession : 100 - possession) - 35) / 17,
      ) + (combo >= 5 ? 1 : 0),
    ),
  );
  const predictionAway = Math.min(
    4,
    Math.max(
      0,
      Math.floor(
        ((supportedIsTeam1 ? 100 - possession : possession) - 35) / 20,
      ),
    ),
  );
  const matchPrediction = useMemo(
    () => predictionFor(selectedMatch, matches, possession, totalScore),
    [matches, possession, selectedMatch, totalScore],
  );
  const openBets = bets.filter((bet) => bet.status === "open");
  const settledBets = bets.filter((bet) => bet.status !== "open").slice(0, 4);
  const maxStake = Math.max(10, coinBalance);
  const effectiveStake = coinBalance > 0 ? Math.min(stake, coinBalance) : 0;
  const selectedCanBet = canBetOnMatch(selectedMatch);
  const currentRecord = records.find(
    (record) => record.id === `${selectedMatch.id}::${selectedCountry}`,
  );
  const topRecords = records.slice(0, 5);
  const lifetimeSupport =
    totalScore +
    records
      .filter(
        (record) => record.id !== `${selectedMatch.id}::${selectedCountry}`,
      )
      .reduce((sum, record) => sum + record.totalScore, 0);
  const currentRoarRank = rankForSupport(lifetimeSupport);
  const nextRoarRank = nextRankForSupport(lifetimeSupport);
  const currentRoarProgress = rankProgress(lifetimeSupport);
  const retentionAnalyticsProps = useCallback(
    (extra?: Record<string, unknown>) => ({
      match_id: selectedMatch.id,
      match_title: selectedMatchTitle,
      team_selected: selectedCountry,
      signed_in: signedIn,
      source,
      score: totalScore,
      rank_label: rankName(currentRoarRank),
      ...extra,
    }),
    [
      currentRoarRank,
      rankName,
      selectedCountry,
      selectedMatch.id,
      selectedMatchTitle,
      signedIn,
      source,
      totalScore,
    ],
  );
  const authReturnPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("match", selectedMatch.id);
    params.set("source", source || "direct");
    params.set("auth_intent", authIntent);
    return `/roar?${params.toString()}`;
  }, [authIntent, selectedMatch.id, source]);
  const authModalSource = `roar_${authIntent}`;

  useEffect(() => {
    if (!selectedMatch?.id || trackedViewRef.current.has(selectedMatch.id))
      return;
    trackedViewRef.current.add(selectedMatch.id);
    trackEvent(
      "roar_viewed",
      retentionAnalyticsProps({
        source:
          source ||
          (initialMatchId ? "calendar_match_cta" : "next_match_default"),
      }),
    );
  }, [initialMatchId, retentionAnalyticsProps, selectedMatch?.id, source]);

  useEffect(() => {
    if (!selectedMatch?.id || !storageReady) return;
    const key = `${selectedMatch.id}:${source || "direct"}`;
    if (trackedMatchSelectionRef.current.has(key)) return;
    trackedMatchSelectionRef.current.add(key);
    trackEvent(
      "roar_match_selected",
      retentionAnalyticsProps({
        selection_source: initialMatchId ? "deep_link" : "default_next_match",
      }),
    );
  }, [
    initialMatchId,
    retentionAnalyticsProps,
    selectedMatch?.id,
    source,
    storageReady,
  ]);

  useEffect(() => {
    if (signedIn || cupTab !== "bets") return;
    const key = `${selectedMatch.id}:bets`;
    if (predictionGatePreviewRef.current.has(key)) return;
    predictionGatePreviewRef.current.add(key);
    trackEvent(
      "roar_prediction_gate_previewed",
      retentionAnalyticsProps({
        prompt_reason: "prediction_pick",
        entry_point: "bets_tab_preview",
      }),
    );
  }, [cupTab, retentionAnalyticsProps, selectedMatch.id, signedIn]);

  const earnedBadges = BADGES.filter((badge) =>
    earnedBadgeIds.includes(badge.id),
  );
  const featuredBadges = earnedBadges.slice(-3).reverse();
  const nextDropThreshold =
    DROP_THRESHOLDS.find((score) => totalScore < score) ??
    DROP_THRESHOLDS[DROP_THRESHOLDS.length - 1];
  const nextDropProgress = Math.min(
    100,
    Math.round((totalScore / nextDropThreshold) * 100),
  );
  const nextHypeTarget = [51, 161, 351, 651, 1001][hypeTier] ?? 1001;
  const nextHypeProgress =
    hypeTier >= 5
      ? 100
      : Math.min(100, Math.round((totalScore / nextHypeTarget) * 100));
  const nextBadge = BADGES.find((badge) => !earnedBadgeIds.includes(badge.id));
  const nextBadgeProgress = nextBadge
    ? badgeProgress(nextBadge, {
        totalScore,
        tapScore,
        shakeScore,
        combo,
        drops,
        hypeTier,
        bets,
      })
    : { current: 1, goal: 1 };
  const shouldShowBoardBurst = comboBurst > 0;
  const shouldShowImpactAvatar = comboBurst > 0;
  const shouldShowCrowdAccent =
    comboBurst > 0 &&
    (comboBurst % 2 === 0 || personalStandStage >= 3);

  const cheerTotalForCountry = useCallback(
    (country: string) => {
      if (country === selectedCountry)
        return Math.min(
          FAIR_CHEER_ROUND_CAP,
          Math.max(
            fairCheerSent,
            Math.min(
              matchCheerByCountry.get(country)?.total ?? 0,
              FAIR_CHEER_ROUND_CAP,
            ),
          ),
        );
      if (country === opponentCountry) return fairRivalCheer;
      return Math.min(
        matchCheerByCountry.get(country)?.total ?? 0,
        FAIR_CHEER_ROUND_CAP,
      );
    },
    [
      fairCheerSent,
      fairRivalCheer,
      matchCheerByCountry,
      opponentCountry,
      selectedCountry,
    ],
  );
  const displayMatches = useMemo(() => {
    const today = dateKeyFrom(nowMs);
    const sorted = [...matches].sort((a, b) => {
      const aFuture = matchStartAt(a).getTime() >= nowMs ? 0 : 1;
      const bFuture = matchStartAt(b).getTime() >= nowMs ? 0 : 1;
      return (
        aFuture - bFuture ||
        matchStartAt(a).getTime() - matchStartAt(b).getTime()
      );
    });
    if (matchFilter === "today")
      return sorted.filter((match) => match.date === today);
    if (matchFilter === "upcoming")
      return sorted.filter((match) => matchStartAt(match).getTime() >= nowMs);
    return sorted;
  }, [matchFilter, matches, nowMs]);
  const personalStandMap = useMemo(
    () =>
      Array.from({ length: PERSONAL_STAND_COUNT }, (_, index) => {
        if (index >= personalSeatCount) return "empty";
        if (index < personalReactiveCount) return "reactive";
        if (index < personalFanCount) return "fan";
        return "seat";
      }),
    [personalFanCount, personalReactiveCount, personalSeatCount],
  );
  const scoreboardCells = useMemo(
    () =>
      Array.from({ length: SCOREBOARD_CELL_COUNT }, (_, index) => {
        const row = Math.floor(index / SCOREBOARD_COLS);
        const col = index % SCOREBOARD_COLS;
        const fromCenter =
          Math.abs(col - (SCOREBOARD_COLS - 1) / 2) +
          Math.abs(row - (SCOREBOARD_ROWS - 1) / 2) * 0.9;
        const order = fromCenter + row * 0.04 + col * 0.02;
        return { index, row, col, order };
      }).sort((a, b) => a.order - b.order),
    [],
  );
  const litScoreboardIndexes = useMemo(
    () =>
      new Set(
        scoreboardCells.slice(0, activeBoardLitCount).map((cell) => cell.index),
      ),
    [activeBoardLitCount, scoreboardCells],
  );

  const addFeed = useCallback(
    (tone: EventTone, title: string, body: string) => {
      setFeed((items) =>
        [{ id: Date.now() + Math.random(), tone, title, body }, ...items].slice(
          0,
          6,
        ),
      );
    },
    [],
  );

  const showBetReveal = useCallback((reveal: Omit<BetReveal, "id">) => {
    const id = Date.now() + Math.random();
    setBetReveal({ id, ...reveal });
    window.setTimeout(() => {
      setBetReveal((current) => (current?.id === id ? null : current));
    }, 1600);
  }, []);

  const badgeIsUnlocked = useCallback(
    (badge: Badge) => {
      const wonBets = bets.filter((bet) => bet.status === "won").length;
      if (badge.id === "first-roar") return totalScore >= 1;
      if (badge.id === "tap-30") return tapScore >= 30;
      if (badge.id === "shake-15") return shakeScore >= 15;
      if (badge.id === "combo-10") return combo >= 10;
      if (badge.id === "first-drop") return drops.length >= 1;
      if (badge.id === "rare-owner")
        return drops.some((drop) => drop.rarity === "rare");
      if (badge.id === "epic-owner")
        return drops.some((drop) => drop.rarity === "epic");
      if (badge.id === "hype-3") return hypeTier >= 3;
      if (badge.id === "score-500") return totalScore >= 500;
      if (badge.id === "first-bet") return bets.length >= 1;
      if (badge.id === "first-win") return wonBets >= 1;
      return false;
    },
    [bets, combo, drops, hypeTier, shakeScore, tapScore, totalScore],
  );

  useEffect(() => {
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    prefersReducedRef.current = prefersReduced;
    (Object.keys(SFX) as SfxName[]).forEach((name) => {
      const audio = new Audio(SFX[name]);
      audio.preload = "auto";
      audio.volume = name === "tap" ? 0.28 : name === "cheer" ? 0.42 : 0.36;
      sfxRef.current[name] = audio;
    });
    const bgm = new Audio(BGM_SRC);
    bgm.preload = "auto";
    bgm.loop = true;
    bgm.volume = 0;
    bgmRef.current = bgm;
    return () => {
      Object.values(sfxRef.current).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      sfxRef.current = {};
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.src = "";
        bgmRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SOUND_MUTED_KEY, soundMuted ? "1" : "0");
    if (soundMuted || prefersReducedRef.current) {
      bgmRef.current?.pause();
      return;
    }
    if (soundUnlocked) {
      void bgmRef.current?.play().catch(() => undefined);
    }
  }, [soundMuted, soundUnlocked]);

  const startBgm = useCallback((force = false) => {
    if ((!force && soundMuted) || prefersReducedRef.current) return;
    const bgm = bgmRef.current;
    if (!bgm) return;
    bgm.volume = 0;
    void bgm
      .play()
      .then(() => {
        setSoundUnlocked(true);
        const startedAt = performance.now();
        const fade = () => {
          const progress = Math.min(1, (performance.now() - startedAt) / 1200);
          bgm.volume = 0.3 * progress;
          if (progress < 1 && (force || !soundMuted)) {
            window.requestAnimationFrame(fade);
          }
        };
        fade();
      })
      .catch(() => undefined);
  }, [soundMuted]);

  const duckBgm = useCallback(
    (depth = 0.16, duration = 650) => {
      const bgm = bgmRef.current;
      if (!bgm || bgm.paused) return;
      bgm.volume = Math.min(bgm.volume, depth);
      window.setTimeout(() => {
        if (!soundMuted && !prefersReducedRef.current && bgmRef.current) {
          bgmRef.current.volume = 0.3;
        }
      }, duration);
    },
    [soundMuted],
  );

  const playSound = useCallback(
    (name: SfxName) => {
      if (soundMuted || prefersReducedRef.current) return;
      startBgm();
      if (name === "cheer" || name === "rankup" || name === "combo") {
        duckBgm(name === "rankup" ? 0.1 : 0.16);
      }
      const audio = sfxRef.current[name];
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      void audio
        .play()
        .then(() => setSoundUnlocked(true))
        .catch(() => undefined);
    },
    [duckBgm, soundMuted, startBgm],
  );

  const playBurst = useCallback(
    (level: number) => {
      setBurst((value) => value + 1);
      if (navigator.vibrate) navigator.vibrate(level > 2 ? [35, 20, 45] : 25);
      if (soundMuted || prefersReducedRef.current) return;

      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      audioRef.current ??= new AudioCtor();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(level > 2 ? 640 : 420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        level > 2 ? 980 : 680,
        ctx.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    },
    [soundMuted],
  );

  useEffect(() => {
    if (!comboBurst) return;
    const timer = window.setTimeout(() => setComboBurst(0), 1250);
    return () => window.clearTimeout(timer);
  }, [comboBurst]);

  useEffect(() => {
    if (combo <= 1) return;
    const lastAt = lastActionRef.current?.at ?? 0;
    if (!lastAt || nowMs - lastAt < comboDecayDelay) return;
    if (nowMs - lastComboDecayRef.current < comboDecayDelay) return;
    const nextCombo = decayComboCount(combo);
    if (nextCombo === combo) return;
    lastComboDecayRef.current = nowMs;
    const nextMultiplier = comboMultiplierFor(nextCombo);
    setCombo(nextCombo);
    setComboMultiplier(nextMultiplier);
    setComboPulse((value) => value + 1);
  }, [combo, comboDecayDelay, nowMs]);

  useEffect(() => {
    const lastAt = lastActionRef.current?.at ?? 0;
    const shouldWarn =
      combo > 1 &&
      lastAt > 0 &&
      nowMs - lastAt > Math.max(450, comboDecayDelay - IDLE_SAVE_PROMPT_LEAD_MS) &&
      nowMs - lastAt < comboDecayDelay + 250;
    setStreakSavePrompt(Boolean(shouldWarn));
  }, [combo, comboDecayDelay, nowMs]);

  const addFloatingPop = useCallback(
    (text: string, tone: FloatingPop["tone"]) => {
      const id = Date.now() + Math.random();
      setFloatingPops((items) =>
        [
          ...items,
          { id, text, tone, left: 18 + ((items.length * 17) % 58) },
        ].slice(-8),
      );
      window.setTimeout(() => {
        setFloatingPops((items) => items.filter((item) => item.id !== id));
      }, 900);
    },
    [],
  );

  const addCoinPop = useCallback((amount: number) => {
    const id = Date.now() + Math.random();
    setCoinPops((items) =>
      [...items, { id, amount, left: 16 + ((items.length * 19) % 62) }].slice(
        -10,
      ),
    );
    window.setTimeout(() => {
      setCoinPops((items) => items.filter((item) => item.id !== id));
    }, 1050);
  }, []);

  useEffect(() => {
    const snapshot = () => {
      window.localStorage.setItem(
        RETURN_BANK_STORAGE_KEY,
        JSON.stringify({
          at: Date.now(),
          country: selectedCountry,
          score: totalScore,
        }),
      );
    };
    const revealReturnBank = () => {
      const raw = window.localStorage.getItem(RETURN_BANK_STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { at?: number; country?: string };
        const at = Number(parsed.at ?? 0);
        const idle = Date.now() - at;
        const returnBankMinIdleMs = qaMode ? 3000 : RETURN_BANK_MIN_IDLE_MS;
        if (
          !at ||
          idle < returnBankMinIdleMs ||
          returnBankHandledRef.current === at
        )
          return;
        returnBankHandledRef.current = at;
        const amount = variableReturnReward(idle);
        const reward = {
          id: Date.now(),
          amount,
          idleMinutes: Math.max(2, Math.floor(idle / 60_000)),
          jackpot: amount >= 800,
        };
        setWelcomeBackReward(reward);
        setCoinBalance((value) => value + amount);
        setComboBonus((value) => value + amount);
        setImpactPower((value) => value + amount);
        addCoinPop(amount);
        playSound(reward.jackpot ? "rankup" : "coin");
        window.setTimeout(() => setWelcomeBackReward(null), 2600);
      } catch {
        window.localStorage.removeItem(RETURN_BANK_STORAGE_KEY);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") snapshot();
      if (document.visibilityState === "visible") revealReturnBank();
    };
    window.addEventListener("blur", snapshot);
    window.addEventListener("focus", revealReturnBank);
    document.addEventListener("visibilitychange", onVisibility);
    revealReturnBank();
    return () => {
      window.removeEventListener("blur", snapshot);
      window.removeEventListener("focus", revealReturnBank);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [addCoinPop, playSound, qaMode, selectedCountry, totalScore]);

  useEffect(() => {
    if (!qaMode) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcomeBack") === "1") {
      const amount = 77;
      const reward = {
        id: Date.now(),
        amount,
        idleMinutes: 2,
        jackpot: false,
      };
      setWelcomeBackReward(reward);
      setCoinBalance((value) => value + amount);
      setComboBonus((value) => value + amount);
      setImpactPower((value) => value + amount);
      addCoinPop(amount);
      window.setTimeout(() => setWelcomeBackReward(null), 2600);
    }
    if (params.get("cooling") === "1") {
      setStreakSavePrompt(true);
      window.setTimeout(() => setStreakSavePrompt(false), 2200);
    }
  }, [addCoinPop, qaMode]);

  const triggerMascot = useCallback(
    (pose: Exclude<MascotPose, "idle">, duration = 900) => {
      if (mascotTimerRef.current) window.clearTimeout(mascotTimerRef.current);
      setMascotPose(pose);
      mascotTimerRef.current = window.setTimeout(() => {
        setMascotPose("idle");
        mascotTimerRef.current = null;
      }, duration);
    },
    [],
  );

  useEffect(() => {
    const previous = lastScoreboardIconCountRef.current;
    if (scoreboardIconCount <= previous) return;
    lastScoreboardIconCountRef.current = scoreboardIconCount;
    const complete = scoreboardIconCount >= PERSONAL_SCOREBOARD_GOALS.length;
    setBoardTrophyReveal({
      id: Date.now(),
      title: complete ? "BOARD COMPLETE" : `BOARD ICON ×${scoreboardIconCount}`,
      body: `${flagFor(selectedCountry)} ${selectedCountry}`,
    });
    setComboBurst((value) => value + 1);
    triggerMascot(complete ? "celebrate" : "flag", complete ? 1500 : 1100);
    playSound("cheer");
    playBurst(4);
    const timer = window.setTimeout(() => setBoardTrophyReveal(null), 1900);
    return () => window.clearTimeout(timer);
  }, [
    playBurst,
    playSound,
    scoreboardIconCount,
    selectedCountry,
    triggerMascot,
  ]);

  useEffect(() => {
    if (!realMatchScore) return;

    const phase = matchPhase(selectedMatch);
    const key = selectedMatch.id;
    const nextSnapshot = {
      home: realMatchScore[0],
      away: realMatchScore[1],
      phase,
    };
    const previous = liveScoreSnapshotRef.current[key];

    if (!previous) {
      liveScoreSnapshotRef.current[key] = nextSnapshot;
      return;
    }

    const homeDelta = Math.max(0, nextSnapshot.home - previous.home);
    const awayDelta = Math.max(0, nextSnapshot.away - previous.away);
    liveScoreSnapshotRef.current[key] = nextSnapshot;

    if (homeDelta + awayDelta <= 0) return;

    const supportedDelta =
      selectedScoreIndex === 0 ? homeDelta : awayDelta;
    const opponentDelta = selectedScoreIndex === 0 ? awayDelta : homeDelta;
    const scoringCountry =
      supportedDelta > 0
        ? selectedCountry
        : opponentDelta > 0
          ? opponentCountry
          : homeDelta > 0
            ? selectedMatch.team1
            : selectedMatch.team2;
    const scoredForAlly = scoringCountry === selectedCountry;
    const goal = latestGoalFor(selectedMatch, scoringCountry);
    const minute = goal ? goalMinuteLabel(goal) : "";
    const scorer = goal?.name ? ` ${goal.name}` : "";
    const scoreLine = `${nextSnapshot.home}-${nextSnapshot.away}`;
    const id = Date.now() + Math.random();

    setGoalReveal({
      id,
      tone: scoredForAlly ? "ally" : "rival",
      country: scoringCountry,
      title: scoredForAlly
        ? `GOAL! ${flagFor(scoringCountry)}`
        : `${flagFor(scoringCountry)} Rival goal`,
      body: scoredForAlly
        ? `${minute}${scorer} · ${scoreLine} · +25 coins`
        : `${scoreLine} · Rally now. Your crowd can swing momentum back.`,
      scoreLine,
    });
    window.setTimeout(() => {
      setGoalReveal((current) => (current?.id === id ? null : current));
    }, 2100);

    if (scoredForAlly) {
      setTeamPulse((value) => value + 90);
      setComboBonus((value) => value + 25);
      setImpactPower((value) => value + 25);
      setCoinBalance((value) => value + 25);
      addCoinPop(25);
      setComboBurst((value) => value + 1);
      triggerMascot("celebrate", 1500);
      playSound("cheer");
      window.setTimeout(() => playSound("coin"), 220);
      playBurst(5);
      addFloatingPop("+25", "combo");
      addFeed(
        "milestone",
        `GOAL! ${flagFor(scoringCountry)} ${scoringCountry}`,
        `${minute}${scorer} ${scoreLine}. Your stand exploded and earned bonus coins.`,
      );
      showBetReveal({
        title: `GOAL! ${flagFor(scoringCountry)}`,
        body: `${scoreLine} · +25 coins for backing the moment.`,
        tone: "cheer",
      });
      return;
    }

    setAiRivalCheer((value) => value + 80);
    setRivalPulse((value) => value + 40);
    triggerMascot("flag", 1200);
    playSound("whistle");
    playBurst(2);
    addFeed(
      "drop",
      `${flagFor(scoringCountry)} Rival goal`,
      `${scoreLine}. Push Tap and Shake to bring the stand back.`,
    );
    showBetReveal({
      title: "Rival goal",
      body: `${scoreLine} · Rally now with Tap and Shake.`,
      tone: "blocked",
    });
  }, [
    addCoinPop,
    addFeed,
    addFloatingPop,
    opponentCountry,
    playBurst,
    playSound,
    realMatchScore,
    selectedCountry,
    selectedMatch,
    selectedScoreIndex,
    showBetReveal,
    triggerMascot,
  ]);

  useEffect(() => {
    const key = selectedMatch.id;
    const previousPhase = livePhaseRef.current[key];

    if (!previousPhase) {
      livePhaseRef.current[key] = livePhase;
      return;
    }
    if (previousPhase === livePhase) return;

    livePhaseRef.current[key] = livePhase;

    if (livePhase === "live") {
      addFeed(
        "clutch",
        "Kickoff synced",
        `${selectedMatchTitle} is live. Back ${selectedCountry} with Tap and Shake.`,
      );
      showBetReveal({
        title: "Kickoff synced",
        body: "Live cheering is open. Every action feeds the stand.",
        tone: "cheer",
      });
      triggerMascot("flag", 1300);
      playSound("whistle");
      playBurst(2);
      return;
    }

    if (livePhase === "ended") {
      addFeed(
        "milestone",
        "Full-time synced",
        realScoreLine
          ? `${selectedMatchTitle} finished ${realScoreLine}.`
          : `${selectedMatchTitle} finished.`,
      );
      playSound("whistle");
    }
  }, [
    addFeed,
    livePhase,
    playBurst,
    playSound,
    realScoreLine,
    selectedCountry,
    selectedMatch.id,
    selectedMatchTitle,
    showBetReveal,
    triggerMascot,
  ]);

  useEffect(() => {
    if (
      !onboarded ||
      totalScore <= 0 ||
      !realMatchScore ||
      livePhase !== "ended"
    )
      return;
    const actualOutcome = outcomeFromScore(selectedMatch);
    if (!actualOutcome || !realScoreLine) return;
    const supportedPick = selectedScoreIndex === 0 ? "team1" : "team2";
    const key = `${selectedMatch.id}:${selectedCountry}:${realScoreLine}`;
    if (liveResultShownRef.current.has(key)) return;
    liveResultShownRef.current.add(key);

    const won = actualOutcome === supportedPick;
    const draw = actualOutcome === "draw";
    const fanCount = fmt.format(Math.max(1, visibleAllyCheer));
    const title = won
      ? `${flagFor(selectedCountry)} won ${realScoreLine}`
      : draw
        ? `Full-time ${realScoreLine}`
        : `Full-time ${realScoreLine}`;
    const body = won
      ? `${selectedCountry} won ${realScoreLine} — you were one of ${fanCount} fans.`
      : draw
        ? `${selectedMatchTitle} finished ${realScoreLine} — your support stayed on the board.`
        : `${selectedCountry} fell ${realScoreLine} — your crowd kept the stand alive.`;

    setResultReveal({
      id: `actual-${key}`,
      tone: won ? "victory" : "defeat",
      title,
      body,
      matchLabel: selectedMatchTitle,
      scoreLine: realScoreLine,
    });
    triggerMascot(won ? "celebrate" : "flag", 1400);
    playSound(won ? "cheer" : "whistle");
    playBurst(won ? 4 : 2);
  }, [
    fmt,
    livePhase,
    onboarded,
    playBurst,
    playSound,
    realMatchScore,
    realScoreLine,
    selectedCountry,
    selectedMatch,
    selectedMatchTitle,
    selectedScoreIndex,
    totalScore,
    triggerMascot,
    visibleAllyCheer,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextBadge = BADGES.find(
        (badge) => !earnedBadgeIds.includes(badge.id) && badgeIsUnlocked(badge),
      );
      if (!nextBadge) return;
      setEarnedBadgeIds((ids) => [...ids, nextBadge.id]);
      setBadgeReveal(nextBadge);
      addFloatingPop(t("badgeEarned").toUpperCase(), "badge");
      addFeed(
        "milestone",
        tf("badgeUnlocked", { badge: badgeName(nextBadge) }),
        tf("badgeUnlockedBody", { desc: badgeDescription(nextBadge) }),
      );
      playBurst(
        nextBadge.tier === "legend" ? 5 : nextBadge.tier === "gold" ? 4 : 3,
      );
      window.setTimeout(() => setBadgeReveal(null), 1200);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    addFeed,
    addFloatingPop,
    badgeDescription,
    badgeIsUnlocked,
    badgeName,
    earnedBadgeIds,
    playBurst,
    t,
    tf,
  ]);

  useEffect(() => {
    if (!onboarded) {
      lastRankRef.current = currentRoarRank.id;
      return;
    }
    const previousRank = lastRankRef.current;
    if (!previousRank) {
      lastRankRef.current = currentRoarRank.id;
      return;
    }
    if (previousRank !== currentRoarRank.id) {
      lastRankRef.current = currentRoarRank.id;
      setRankReveal(currentRoarRank);
      trackEvent("roar_rank_up", {
        rank: currentRoarRank.id,
        lifetime_support: lifetimeSupport,
        match_id: selectedMatch.id,
        team: selectedCountry,
      });
      setComboBurst((value) => value + 1);
      addFloatingPop(rankName(currentRoarRank).toUpperCase(), "badge");
      addFeed(
        "milestone",
        tf("rankReached", { rank: rankName(currentRoarRank) }),
        rankTone(currentRoarRank),
      );
      showBetReveal({
        title: `${rankName(currentRoarRank)}!`,
        body: t("rankClimbed"),
        tone: "cheer",
      });
      playSound("rankup");
      playBurst(currentRoarRank.id === "legend" ? 5 : 4);
      const hideTimer = window.setTimeout(() => setRankReveal(null), 1400);
      return () => window.clearTimeout(hideTimer);
    }
  }, [
    addFeed,
    addFloatingPop,
    currentRoarRank,
    lifetimeSupport,
    onboarded,
    playBurst,
    playSound,
    rankName,
    rankTone,
    selectedCountry,
    selectedMatch.id,
    showBetReveal,
    t,
    tf,
  ]);

  const maybeMilestone = useCallback(
    (nextScore: number) => {
      const reached = MILESTONES.find(
        (item) =>
          nextScore >= item.score && !milestoneRef.current.has(item.score),
      );
      if (!reached) return;
      milestoneRef.current.add(reached.score);
      playSound(reached.score >= 450 ? "combo" : "coin");
      playBurst(reached.score > 600 ? 3 : 2);
      setComboBurst((value) => value + 1);
      triggerMascot(reached.score > 600 ? "celebrate" : "jump", 1100);
      addFeed(
        "milestone",
        t(reached.titleKey ?? "seatsLit"),
        t(reached.bodyKey ?? "seatsLitBody"),
      );
    },
    [addFeed, playBurst, playSound, t, triggerMascot],
  );

  const maybeDrop = useCallback(
    (nextScore: number) => {
      const reached = DROP_THRESHOLDS.find(
        (score) => nextScore >= score && !dropThresholdRef.current.has(score),
      );
      if (!reached) return;
      dropThresholdRef.current.add(reached);
      const item = DROPS[Math.floor(Math.random() * DROPS.length)];
      const drop = { id: Date.now(), ...item };
      setDrops((current) => {
        if (current.some((owned) => owned.name === item.name)) return current;
        return [drop, ...current].slice(0, 5);
      });
      setCombo((value) =>
        Math.min(
          80,
          value + (item.rarity === "epic" ? 3 : item.rarity === "rare" ? 2 : 1),
        ),
      );
      setTeamPulse((value) => value + item.reward);
      setItemReveal(drop);
      addFloatingPop(t("itemDrop").toUpperCase(), "drop");
      addFeed(
        "drop",
        `${item.name} ${t("itemDrop")}`,
        `${item.power}. Stadium effects boosted.`,
      );
      playSound("coin");
      playBurst(item.rarity === "epic" ? 5 : item.rarity === "rare" ? 4 : 3);
      setComboBurst((value) => value + 1);
      triggerMascot(item.rarity === "epic" ? "celebrate" : "jump", 1200);
      window.setTimeout(() => setItemReveal(null), 1200);
    },
    [addFeed, addFloatingPop, playBurst, playSound, t, triggerMascot],
  );

  const scoreAction = useCallback(
    (type: "tap" | "shake") => {
      const now = Date.now();
      if (now - lastScoreDispatchRef.current < 180) return;
      lastScoreDispatchRef.current = now;
      const last = lastActionRef.current;
      const paired = last && last.type !== type && now - last.at < 700;
      const comboGain = paired ? 2 : 1;
      const nextCombo =
        now - (last?.at ?? 0) < comboDecayDelay
          ? Math.min(80, combo + comboGain)
          : 1;
      const nextMultiplier = comboMultiplierFor(nextCombo);
      const feverTriggered = (scoreBeat + 1) % 24 === 0;
      const isFeverActive = feverTriggered || feverUntil > now;
      const crit = Math.random() < critChance;
      const fairBase = paired ? FAIR_CHEER_PAIR_BONUS : 1;
      const fairRemaining = Math.max(0, FAIR_CHEER_ROUND_CAP - fairCheerRoundSent);
      const fairContribution = Math.min(fairBase, fairRemaining);
      const actionGain = Math.max(
        1,
        Math.round(
          tapBase *
            nextMultiplier *
            (crit ? 6 : 1) *
            (isFeverActive ? 3 : 1) *
            heatMultiplier *
            clutchMultiplier *
            comebackMultiplier,
        ),
      );
      playSound("tap");

      if (type === "tap") setTapScore((value) => value + actionGain);
      if (type === "shake") setShakeScore((value) => value + actionGain);
      setDaily((value) => ({
        ...value,
        taps: value.taps + (type === "tap" ? 1 : 0),
        shakes: value.shakes + (type === "shake" ? 1 : 0),
      }));
      const impactGain = impactGainFor(actionGain);
      const cheerKey = `${selectedMatch.id}::${selectedCountry}`;
      const pending = cheerBufferRef.current[cheerKey] ?? {
        matchId: selectedMatch.id,
        matchTitle: selectedMatchTitle,
        country: selectedCountry,
        taps: 0,
        shakes: 0,
      };
      cheerBufferRef.current[cheerKey] = {
        ...pending,
        taps: pending.taps + (type === "tap" ? fairContribution : 0),
        shakes: pending.shakes + (type === "shake" ? fairContribution : 0),
      };
      if (fairContribution > 0) {
        setFairCheerSent((value) => value + fairContribution);
        setFairCheerRoundSent((value) =>
          Math.min(FAIR_CHEER_ROUND_CAP, value + fairContribution),
        );
      }
      setCoinBalance((value) => value + actionGain);
      setSessionCoinsEarned((value) => value + actionGain);
      setImpactPower((value) => value + impactGain);
      setScoreBeat((value) => value + 1);
      if (crit) {
        setLastCrit({ id: now, gain: actionGain });
        addFloatingPop(`CRIT +${fmt.format(impactGain)}`, "drop");
        playBurst(4);
      } else if (isFeverActive) {
        addFloatingPop(`FEVER +${fmt.format(impactGain)}`, "combo");
      } else {
        addFloatingPop(`+${fmt.format(impactGain)}`, paired ? "combo" : type);
      }
      addCoinPop(actionGain);
      setCombo(nextCombo);
      setComboMultiplier(nextMultiplier);
      setBestComboMultiplier((value) => Math.max(value, nextMultiplier));
      if (nextMultiplier !== comboMultiplier) {
        setComboPulse((value) => value + 1);
      }
      if (feverTriggered) {
        setFeverUntil(now + FEVER_DURATION_MS);
        addFeed("milestone", "FEVER ×3", "All support actions triple for 5 seconds.");
      }
      if (clutchActive && nextCombo % 6 === 0) {
        addFeed("clutch", "CLUTCH TIME ×2", "Last 10 seconds. Every roar hits harder.");
      }
      if (comebackActive && nextCombo % 5 === 0) {
        showBetReveal({
          title: "COMEBACK RALLY",
          body: "The gap is closing. Your next burst matters.",
          tone: "cheer",
        });
      }
      const nextScore = totalScore + actionGain;
      const shouldBurst =
        nextCombo === 6 ||
        nextCombo === 10 ||
        nextCombo === 20 ||
        nextCombo === 40 ||
        nextCombo === 60 ||
        crit ||
        feverTriggered ||
        nextScore % 24 === 0 ||
        (paired && nextCombo >= 4 && nextScore % 12 === 0);
      if (shouldBurst) {
        playSound("combo");
        triggerMascot(crit || feverTriggered ? "celebrate" : "jump", 1050);
        setComboBurst((value) => value + 1);
      } else if (nextCombo >= 5) {
        triggerMascot("jump", 900);
      } else {
        triggerMascot("cheer", 650);
      }
      lastActionRef.current = { type, at: now };

      const nextContribution = Math.min(
        100,
        (nextScore / Math.max(1, Math.max(selectedGlobalCheer, nextScore))) *
          100,
      );
      [1, 10].forEach((threshold) => {
        if (
          nextContribution >= threshold &&
          !contributionThresholdRef.current.has(threshold)
        ) {
          contributionThresholdRef.current.add(threshold);
          showBetReveal({
            title: `${t("contributionToast")} ${threshold}%`,
            body: t("scoreboard"),
            tone: "cheer",
          });
        }
      });
      const nextRunnerProgress = campaignStageProgress(nextScore);
      setRunnerBestProgress((value) => Math.max(value, nextRunnerProgress));
      setTeamPulse((value) => value + actionGain + Math.floor(nextCombo / 4));
      maybeMilestone(nextScore);
      maybeDrop(nextScore);
      if (paired) {
        addFeed(
          "clutch",
          `${t("tap")} + ${t("shake")} ${t("combo")}`,
          t("coinHint"),
        );
      }
    },
    [
      addCoinPop,
      addFeed,
      addFloatingPop,
      combo,
      comboDecayDelay,
      comboMultiplier,
      critChance,
      clutchActive,
      clutchMultiplier,
      comebackActive,
      comebackMultiplier,
      fairCheerRoundSent,
      feverUntil,
      heatMultiplier,
      maybeDrop,
      maybeMilestone,
      playBurst,
      playSound,
      scoreBeat,
      selectedCountry,
      selectedGlobalCheer,
      selectedMatch.id,
      selectedMatchTitle,
      showBetReveal,
      fmt,
      t,
      tapBase,
      totalScore,
      triggerMascot,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const scoreVersion = window.localStorage.getItem(
        "roar-score-version",
      );
      setRoomCode(window.localStorage.getItem("roar-room") ?? "RED-0619");
      setQaMode(new URLSearchParams(window.location.search).get("qa") === "1");
      setSelectedCountry(
        window.localStorage.getItem("roar-country") ?? "South Korea",
      );
      const storedPlayerName =
        window.localStorage.getItem(PLAYER_NAME_KEY) ?? "";
      setPlayerName(storedPlayerName);
      setDraftPlayerName(storedPlayerName);
      const storedLocale = window.localStorage.getItem(
        "roar-locale",
      ) as LocaleCode | null;
      if (
        storedLocale &&
        LANGUAGE_OPTIONS.some((item) => item.code === storedLocale)
      )
        setLocale(storedLocale);
      setOnboarded(window.localStorage.getItem("roar-onboarded") === "1");
      const storedDeviceId =
        window.localStorage.getItem("roar-device-id") ?? createDeviceId();
      window.localStorage.setItem("roar-device-id", storedDeviceId);
      setDeviceId(storedDeviceId);
      if (scoreVersion === SCORE_VERSION) {
        let nextCoins = Number(
          window.localStorage.getItem("roar-coins") ?? 0,
        );
        if (window.localStorage.getItem(WELCOME_COIN_KEY) !== "1") {
          nextCoins += WELCOME_COINS;
          window.localStorage.setItem(WELCOME_COIN_KEY, "1");
          window.localStorage.setItem("roar-coins", String(nextCoins));
          addFeed(
            "milestone",
            "Welcome coins",
            `${coinText(WELCOME_COINS)} added so you can try your first prediction.`,
          );
          addCoinPop(WELCOME_COINS);
        }
        setCoinBalance(nextCoins);
        setImpactPower(
          Number(window.localStorage.getItem("roar-impact") ?? 0),
        );
        try {
          setUpgrades({
            ...DEFAULT_UPGRADES,
            ...JSON.parse(
              window.localStorage.getItem(UPGRADE_STORAGE_KEY) ?? "{}",
            ),
          });
        } catch {
          setUpgrades(DEFAULT_UPGRADES);
        }
      } else {
        window.localStorage.setItem("roar-score-version", SCORE_VERSION);
        window.localStorage.setItem(WELCOME_COIN_KEY, "1");
        window.localStorage.setItem("roar-coins", String(WELCOME_COINS));
        window.localStorage.setItem("roar-impact", "0");
        window.localStorage.setItem(
          UPGRADE_STORAGE_KEY,
          JSON.stringify(DEFAULT_UPGRADES),
        );
        setCoinBalance(WELCOME_COINS);
        setImpactPower(0);
        setUpgrades(DEFAULT_UPGRADES);
        addFeed(
          "milestone",
          "Welcome coins",
          `${coinText(WELCOME_COINS)} added so you can try your first prediction.`,
        );
        addCoinPop(WELCOME_COINS);
      }
      setDaily(loadDailyState());
      try {
        setEarnedBadgeIds(
          JSON.parse(
            window.localStorage.getItem("roar-badges") ?? "[]",
          ) as string[],
        );
      } catch {
        setEarnedBadgeIds([]);
      }
      try {
        setBets(
          JSON.parse(
            window.localStorage.getItem("roar-bets") ?? "[]",
          ) as BetSlip[],
        );
      } catch {
        setBets([]);
      }
      try {
        setRecords(
          JSON.parse(
            window.localStorage.getItem("roar-records") ?? "[]",
          ) as PersonalRecord[],
        );
      } catch {
        setRecords([]);
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [addCoinPop, addFeed]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-room", roomCode);
  }, [roomCode, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-country", selectedCountry);
  }, [selectedCountry, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-locale", locale);
  }, [locale, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-onboarded", onboarded ? "1" : "0");
  }, [onboarded, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }, [playerName, storageReady]);

  useEffect(
    () => () => {
      if (mascotTimerRef.current) window.clearTimeout(mascotTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-coins", String(coinBalance));
  }, [coinBalance, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-impact", String(impactPower));
  }, [impactPower, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(UPGRADE_STORAGE_KEY, JSON.stringify(upgrades));
  }, [storageReady, upgrades]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-bets", JSON.stringify(bets));
  }, [bets, storageReady]);

  useEffect(() => {
    if (!deviceId) return;

    const controller = new AbortController();
    const loadServerBets = async () => {
      try {
        const response = await fetch(
          `${BETS_DATA_URL}?deviceId=${encodeURIComponent(deviceId)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { bets?: BetSlip[] };
        if (!Array.isArray(payload.bets)) return;
        setBets((current) => {
          const byId = new Map<string, BetSlip>();
          [...current, ...payload.bets!].forEach((bet) =>
            byId.set(bet.id, bet),
          );
          return Array.from(byId.values())
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
            .slice(0, 50);
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.warn("ROAR bet sync failed", error);
        }
      }
    };

    void loadServerBets();
    return () => controller.abort();
  }, [deviceId]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(
      "roar-badges",
      JSON.stringify(earnedBadgeIds),
    );
  }, [earnedBadgeIds, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-daily", JSON.stringify(daily));
  }, [daily, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("roar-records", JSON.stringify(records));
  }, [records, storageReady]);

  useEffect(() => {
    if (countryChoices.includes(selectedCountry)) return;
    const timer = window.setTimeout(() => {
      if (initialMatchId) {
        setSelectedCountry(selectedMatch.team1);
        return;
      }
      const nextMatch = bestMatchForCountry(matches, selectedCountry);
      if (nextMatch) {
        setSelectedMatchId(nextMatch.id);
        return;
      }
      setSelectedCountry(selectedMatch.team1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    countryChoices,
    initialMatchId,
    matches,
    selectedCountry,
    selectedMatch.team1,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAiRivalCheer(0);
      setRivalPulse(0);
      setBoardSide("ally");
      lastScoreboardIconCountRef.current = 0;
      setBoardTrophyReveal(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [opponentCountry, selectedMatch.id]);

  useEffect(() => {
    if (impactPower <= 0 && totalScore <= 0) return;
    const timer = window.setTimeout(() => {
      const id = `${selectedMatch.id}::${selectedCountry}`;
      const matchLabel = `${selectedMatch.team1} vs ${selectedMatch.team2}`;
      setRecords((items) => {
        const existing = items.find((item) => item.id === id);
        const next: PersonalRecord = {
          id,
          matchId: selectedMatch.id,
          matchLabel,
          country: selectedCountry,
          impactPower: Math.max(existing?.impactPower ?? 0, impactPower),
          totalScore: Math.max(existing?.totalScore ?? 0, totalScore),
          taps: Math.max(existing?.taps ?? 0, tapScore),
          shakes: Math.max(existing?.shakes ?? 0, shakeScore),
          comboBonus: Math.max(existing?.comboBonus ?? 0, comboBonus),
          badges: Math.max(existing?.badges ?? 0, earnedBadgeIds.length),
          updatedAt: new Date().toISOString(),
        };
        if (
          existing &&
          existing.impactPower === next.impactPower &&
          existing.totalScore === next.totalScore &&
          existing.taps === next.taps &&
          existing.shakes === next.shakes &&
          existing.comboBonus === next.comboBonus &&
          existing.badges === next.badges
        ) {
          return items;
        }
        return [next, ...items.filter((item) => item.id !== id)].slice(0, 24);
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    comboBonus,
    earnedBadgeIds.length,
    impactPower,
    selectedCountry,
    selectedMatch.id,
    selectedMatch.team1,
    selectedMatch.team2,
    shakeScore,
    tapScore,
    totalScore,
  ]);

  const loadOpenData = useCallback(
    async (force = false, quiet = false) => {
      const cacheKey = `roar-summer-cup-cache-v3-${initialMatchId ?? "next"}`;
      setLoadingData(true);
      try {
        const cached = window.localStorage.getItem(cacheKey);
        if (!force && cached) {
          const parsed = JSON.parse(cached) as {
            date?: string;
            fetchedAt?: number;
            matches: CupMatch[];
          };
          const freshEnough = parsed.fetchedAt
            ? Date.now() - parsed.fetchedAt < DATA_CACHE_MS
            : parsed.date === todayKey();
          if (freshEnough && parsed.matches.length) {
            const nextMatches = ensureBettableDemo(parsed.matches);
            setMatches(nextMatches);
            setSelectedMatchId((current) => initialMatchId && nextMatches.some((match) => match.id === initialMatchId) ? initialMatchId : preferredMatchId(nextMatches, current));
            setMatchDataSyncedAt(parsed.fetchedAt ?? Date.now());
            setDataStatus(
              `open data cache ${new Date(parsed.fetchedAt ?? Date.now()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
            );
            return;
          }
        }

        const response = await fetch(
          `${OPEN_DATA_URL}?limit=200${initialMatchId ? `&matchId=${encodeURIComponent(initialMatchId)}` : ""}&v=${Date.now()}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          fetchedAt?: string;
          matches?: CupMatch[];
          realtime?: boolean;
          source?: string;
          counts?: { upcoming?: number; live?: number; ended?: number };
        };
        const syncedAt = payload.fetchedAt
          ? Date.parse(payload.fetchedAt)
          : Date.now();
        const data = ensureBettableDemo(
          Array.isArray(payload.matches)
            ? payload.matches
            : parseOpenFootball(payload),
        );
        window.localStorage.setItem(
          cacheKey,
          JSON.stringify({
            date: todayKey(),
            fetchedAt: Date.now(),
            source: OPEN_DATA_URL,
            matches: data,
          }),
        );
        setMatches(data);
        setSelectedMatchId((current) => initialMatchId && data.some((match) => match.id === initialMatchId) ? initialMatchId : preferredMatchId(data, current));
        setMatchDataSyncedAt(Number.isFinite(syncedAt) ? syncedAt : Date.now());
        setDataStatus(
          `${payload.realtime ? "realtime" : (payload.source ?? "open data")} · ${payload.counts?.upcoming ?? data.filter((match) => matchStartAt(match).getTime() >= Date.now()).length} upcoming · sync ${new Date(payload.fetchedAt ?? Date.now()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
        );
        if (!quiet) {
          addFeed(
            "clutch",
            "Open data synced",
            force
              ? "Latest match data checked again."
              : "Summer Cup 2026 schedule and result data loaded.",
          );
        }
      } catch {
        const data = ensureBettableDemo(FALLBACK_MATCHES);
        setMatches(data);
        setSelectedMatchId((current) => initialMatchId && data.some((match) => match.id === initialMatchId) ? initialMatchId : preferredMatchId(data, current));
        setMatchDataSyncedAt(null);
        setDataStatus("fallback data");
        if (!quiet) {
          addFeed(
            "drop",
            "Open data failed",
            "Built-in sample matches keep the game playable.",
          );
        }
      } finally {
        setLoadingData(false);
      }
    },
    [addFeed, initialMatchId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOpenData(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOpenData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadOpenData(true, true);
    }, MATCH_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadOpenData]);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
      setTeamPulse((value) =>
        totalScore > 0 ? value + (Math.random() > 0.55 ? 1 : 0) : value,
      );
      setRivalPulse((value) =>
        totalScore > 0 ? value + (Math.random() > 0.7 ? 1 : 0) : value,
      );
    }, 2000);
    return () => window.clearInterval(timer);
  }, [totalScore]);

  useEffect(() => {
    if (!nowMs || roundMsLeft > 0) return;
    const won = visibleAllyCheer >= visibleRivalCheer;
    setRoundReveal({
      id: Date.now(),
      title: won ? "ROUND WON" : "RALLY AGAIN",
      body: won
        ? "You owned the whistle. Start the next push."
        : "Near miss. The comeback window is open.",
    });
    playSound("whistle");
    setRoundEndsAt(Date.now() + ROUND_DURATION_MS);
    setFairCheerRoundSent(0);
    const timer = window.setTimeout(() => setRoundReveal(null), 1800);
    return () => window.clearTimeout(timer);
  }, [nowMs, playSound, roundMsLeft, visibleAllyCheer, visibleRivalCheer]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAiRivalCheer((value) => {
        const seed = seededRivalCheer(selectedMatch.id, opponentCountry);
        const tempo = Date.now() / 3600 + seed;
        const leadSwing = Math.round(Math.sin(tempo) * 18);
        const recentlyActive =
          lastActionRef.current && Date.now() - lastActionRef.current.at < 2200;
        const userLead = activeSupportScore - value;
        const comebackWindow = value > activeSupportScore + 80;
        const blowoutWindow = userLead > 240 && Math.sin(tempo / 2) > -0.25;
        const pressureBoost = recentlyActive
          ? comebackWindow
            ? -10
            : blowoutWindow
              ? -6
              : 5 + Math.min(14, combo)
          : -Math.min(10, Math.floor(idleMs / 7000));
        const target =
          activeSupportScore <= 0 && opponentGlobalCheer <= 0
            ? seed
            : Math.max(
                0,
                Math.max(
                  activeSupportScore + leadSwing + pressureBoost,
                  Math.min(opponentGlobalCheer, activeSupportScore + 18),
                ),
              );
        const delta = target - value;
        if (Math.abs(delta) <= 1)
          return Math.max(0, value + (Math.random() > 0.55 ? 1 : -1));
        const step =
          delta > 0
            ? Math.min(12, Math.max(2, Math.ceil(delta * 0.34)))
            : -Math.min(9, Math.max(1, Math.ceil(Math.abs(delta) * 0.24)));
        return Math.max(0, value + step);
      });
    }, 1050);
    return () => window.clearInterval(timer);
  }, [
    activeSupportScore,
    combo,
    idleMs,
    opponentCountry,
    opponentGlobalCheer,
    selectedMatch.id,
  ]);

  useEffect(() => {
    const flushCheer = async () => {
      const pendingEntries = Object.entries(cheerBufferRef.current).filter(
        ([, value]) => value.taps > 0 || value.shakes > 0,
      );
      if (!pendingEntries.length) return;

      pendingEntries.forEach(([key]) => {
        delete cheerBufferRef.current[key];
      });

      for (const [key, pending] of pendingEntries) {
        try {
          const response = await fetch(CHEER_DATA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...pending,
              team: pending.country,
              deviceId: deviceIdRef.current,
              source: sourceRef.current,
            }),
          });
          if (!response.ok) throw new Error("Cheer sync failed");
          const payload = (await response.json()) as {
            totals?: CheerAggregate[];
          };
          if (Array.isArray(payload.totals)) setGlobalCheer(payload.totals);
          trackEvent("roar_cheer_submitted", {
            match_id: pending.matchId,
            match_title: pending.matchTitle,
            team_selected: pending.country,
            signed_in: signedIn,
            source: sourceRef.current,
            score: pending.taps + pending.shakes,
            rank_label: rankName(currentRoarRank),
            taps: pending.taps,
            shakes: pending.shakes,
            total: pending.taps + pending.shakes,
          });
        } catch {
          const current = cheerBufferRef.current[key] ?? {
            matchId: pending.matchId,
            matchTitle: pending.matchTitle,
            country: pending.country,
            taps: 0,
            shakes: 0,
          };
          cheerBufferRef.current[key] = {
            ...current,
            taps: current.taps + pending.taps,
            shakes: current.shakes + pending.shakes,
          };
        }
      }
    };

    const timer = window.setInterval(() => {
      void flushCheer();
    }, 1600);
    return () => window.clearInterval(timer);
  }, [currentRoarRank, rankName, signedIn]);

  useEffect(() => {
    const loadCheer = async () => {
      try {
        const response = await fetch(
          `${CHEER_DATA_URL}?matchId=${encodeURIComponent(selectedMatch.id)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Cheer load failed");
        const payload = (await response.json()) as {
          totals?: CheerAggregate[];
        };
        if (Array.isArray(payload.totals)) setGlobalCheer(payload.totals);
      } catch {
        // Local play still works when the lightweight aggregate endpoint is unavailable.
      }
    };

    void loadCheer();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadCheer();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedMatch.id]);

  useEffect(() => {
    const controller = new AbortController();
    const loadLeaderboard = async () => {
      try {
        const response = await fetch(
          `/api/roar/score?matchId=${encodeURIComponent(selectedMatch.id)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw new Error("Leaderboard load failed");
        const payload = (await response.json()) as {
          rows?: RoarLeaderboardRow[];
        };
        setLeaderboardRows(Array.isArray(payload.rows) ? payload.rows : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLeaderboardRows([]);
      }
    };

    void loadLeaderboard();
    return () => controller.abort();
  }, [selectedMatch.id]);

  useEffect(() => {
    if (!shakeReady) return;
    const onMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const power =
        Math.abs(acc.x ?? 0) + Math.abs(acc.y ?? 0) + Math.abs(acc.z ?? 0);
      const now = Date.now();
      if (power > 32 && now - lastShakeRef.current > 650) {
        lastShakeRef.current = now;
        scoreAction("shake");
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [scoreAction, shakeReady]);

  const enableShake = async () => {
    const deviceMotion = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (deviceMotion.requestPermission) {
      const result = await deviceMotion.requestPermission();
      setShakeReady(result === "granted");
      if (result === "granted")
        addFeed(
          "clutch",
          "Motion shake ON",
          "Each real shake adds 1 point. Alternating with tap powers up combo effects.",
        );
      if (result !== "granted")
        addFeed(
          "drop",
          "Motion shake blocked",
          "Use the Shake button for manual points, or enable motion in browser settings.",
        );
      return result === "granted";
    }
    setShakeReady(true);
    addFeed(
      "clutch",
      "Motion shake ON",
      "Supported devices count each real shake as 1 point.",
    );
    return true;
  };

  const handleShakePress = async () => {
    if (!shakeReady) {
      await enableShake();
      return;
    }
    scoreAction("shake");
  };

  const pressEmotion = (label: string) => {
    setCombo((value) => Math.min(12, value + 1));
    setTeamPulse((value) => value + 7);
    addFeed("emotion", label, `Emotion cheer posted to room ${roomCode}.`);
    playBurst(1);
  };

  const placeBet = (pick: Pick) => {
    if (!signedIn) {
      promptRoarSignIn("prediction_pick", {
        pick,
        stake: effectiveStake,
        entry_point: "prediction_pick_button",
      });
      return;
    }
    if (!canBetOnMatch(selectedMatch)) {
      addFeed("drop", t("betClosedTitle"), t("betClosedBody"));
      showBetReveal({
        title: t("betClosedTitle"),
        body: t("betClosedBody"),
        tone: "blocked",
      });
      return;
    }

    const cleanStake = Math.floor(effectiveStake);
    if (cleanStake <= 0) {
      addFeed("drop", t("notEnoughCoinsTitle"), t("notEnoughCoinsBody"));
      showBetReveal({
        title: t("needCoins"),
        body: t("notEnoughCoinsBody"),
        tone: "blocked",
      });
      return;
    }

    const label = pickLabel(selectedMatch, pick);
    const bet: BetSlip = {
      id: `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      matchId: selectedMatch.id,
      pick,
      pickLabel: label,
      stake: cleanStake,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    setCoinBalance((value) => value - cleanStake);
    setDaily((value) => ({ ...value, bets: value.bets + 1 }));
    setBets((items) => [bet, ...items]);
    trackEvent(
      "roar_prediction_pick",
      retentionAnalyticsProps({
        pick,
        pick_label: label,
        stake: cleanStake,
      }),
    );
    trackEvent(
      "roar_prediction_locked",
      retentionAnalyticsProps({
        pick,
        pick_label: label,
        stake: cleanStake,
      }),
    );
    if (deviceId) {
      void fetch(BETS_DATA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bet,
          deviceId,
          matchLabel: `${selectedMatch.team1} vs ${selectedMatch.team2}`,
          country: selectedCountry,
        }),
      }).catch((error) => console.warn("ROAR bet persist failed", error));
    }
    addFeed(
      "clutch",
      t("betLockedTitle"),
      `${label} · ${t("potentialReturn")} ${coinCopy(cleanStake * 2)}`,
    );
    showBetReveal({
      title: t("betLockedTitle"),
      body: `${label} · ${t("potentialReturn")} ${coinCopy(cleanStake * 2)}`,
      tone: "placed",
    });
    playSound("whistle");
    playBurst(2);
  };

  const revealBetResult = (input: {
    id: string;
    won: boolean;
    pickLabel: string;
    stake: number;
    payout: number;
    match: CupMatch;
    claimed?: boolean;
    demo?: boolean;
  }) => {
    const scoreLine = `${input.match.score?.ft?.[0] ?? (input.won ? predictionHome : predictionAway)} - ${input.match.score?.ft?.[1] ?? (input.won ? predictionAway : predictionHome)}`;
    if (input.won) {
      addFeed(
        "milestone",
        t("predictionHit"),
        tf("claimFromChest", { amount: coinCopy(input.payout) }),
      );
      showBetReveal({
        title: t("predictionHit"),
        body: tf("claimFromChestShort", { amount: coinCopy(input.payout) }),
        tone: "won",
      });
      playSound("cheer");
      window.setTimeout(() => playSound("coin"), 180);
      setComboBurst((value) => value + 1);
      triggerMascot("celebrate", 1400);
      setResultReveal({
        id: `${input.id}-won`,
        tone: "victory",
        title: t("predictionHit"),
        body: tf("tapClaimPayout", { pick: input.pickLabel }),
        matchLabel: `${input.match.team1} vs ${input.match.team2}`,
        scoreLine,
        payout: input.payout,
        slipId: input.demo ? undefined : input.id,
        claimed: input.claimed,
      });
      playBurst(4);
    } else {
      addFeed(
        "drop",
        t("predictionMissed"),
        tf("stakeGone", { pick: input.pickLabel }),
      );
      showBetReveal({
        title: t("predictionMissed"),
        body: tf("stakeBurned", { amount: coinCopy(input.stake) }),
        tone: "lost",
      });
      playSound("whistle");
      triggerMascot("flag", 1200);
      setResultReveal({
        id: `${input.id}-lost`,
        tone: "defeat",
        title: t("predictionMissed"),
        body: tf("tryAgainBody", { pick: input.pickLabel }),
        matchLabel: `${input.match.team1} vs ${input.match.team2}`,
        scoreLine,
      });
      playBurst(1);
    }
  };

  const settleBet = (bet: BetSlip) => {
    if (!signedIn) {
      promptRoarSignIn("prediction_settle", {
        slip_id: bet.id,
        match_id: bet.matchId,
        entry_point: "prediction_settle_button",
      });
      return;
    }
    const match =
      matches.find((item) => item.id === bet.matchId) ?? selectedMatch;
    const realOutcome = outcomeFromScore(match);
    if (!canSettleMatch(match)) {
      addFeed("drop", t("settlementLocked"), t("settlementLockedBody"));
      showBetReveal({
        title: t("notReadyYet"),
        body: t("notReadyYetBody"),
        tone: "blocked",
      });
      return;
    }

    if (!realOutcome) {
      addFeed("drop", t("resultPending"), t("resultPendingBody"));
      showBetReveal({
        title: t("resultPending"),
        body: t("resultPendingBody"),
        tone: "blocked",
      });
      return;
    }

    const won = realOutcome === bet.pick;
    const payout = won ? bet.stake * 2 : 0;

    setDaily((value) => ({ ...value, settlements: value.settlements + 1 }));
    trackEvent(
      "roar_prediction_settled",
      retentionAnalyticsProps({
        match_id: match.id,
        match_title: `${match.team1} vs ${match.team2}`,
        pick: bet.pick,
        pick_label: bet.pickLabel,
        stake: bet.stake,
        status: won ? "won" : "lost",
        payout,
      }),
    );
    setBets((items) =>
      items.map((item) =>
        item.id === bet.id
          ? {
              ...item,
              status: won ? "won" : "lost",
              payout,
              claimed: !won,
              settledAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    if (deviceId) {
      void fetch(BETS_DATA_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bet.id,
          deviceId,
          status: won ? "won" : "lost",
          payout,
        }),
      }).catch((error) =>
        console.warn("ROAR bet settlement persist failed", error),
      );
    }
    revealBetResult({
      id: bet.id,
      won,
      pickLabel: bet.pickLabel,
      stake: bet.stake,
      payout,
      match,
      claimed: !won,
    });
  };

  const claimBetPayout = (slipId?: string, payout?: number) => {
    if (!signedIn) {
      promptRoarSignIn("prediction_claim", {
        slip_id: slipId,
        payout,
        entry_point: "prediction_claim_button",
      });
      return;
    }
    const target = slipId ? bets.find((bet) => bet.id === slipId) : undefined;
    const amount = payout ?? target?.payout ?? 0;
    if (amount <= 0 || target?.claimed) return;
    setCoinBalance((value) => value + amount);
    addCoinPop(amount);
    trackEvent(
      "roar_prediction_claimed",
      retentionAnalyticsProps({
        slip_id: slipId,
        payout: amount,
        match_id: target?.matchId ?? selectedMatch.id,
      }),
    );
    showBetReveal({
      title: t("payoutClaimedTitle"),
      body: tf("payoutClaimedBody", { amount: `+${coinCopy(amount)}` }),
      tone: "won",
    });
    playSound("coin");
    playBurst(4);
    if (slipId) {
      setBets((items) =>
        items.map((item) =>
          item.id === slipId ? { ...item, claimed: true } : item,
        ),
      );
      if (deviceId) {
        void fetch(BETS_DATA_URL, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: slipId,
            deviceId,
            claimed: true,
          }),
        }).catch((error) =>
          console.warn("ROAR bet claim persist failed", error),
        );
      }
    }
    setResultReveal((current) =>
      current ? { ...current, claimed: true } : current,
    );
  };

  const demoSettleBet = (won: boolean) => {
    const label = won ? selectedCountry : opponentCountry;
    const stakeAmount = Math.max(10, effectiveStake || 50);
    setDaily((value) => ({ ...value, settlements: value.settlements + 1 }));
    revealBetResult({
      id: `demo-${won ? "win" : "loss"}`,
      won,
      pickLabel: label,
      stake: stakeAmount,
      payout: won ? stakeAmount * 2 : 0,
      match: selectedMatch,
      demo: true,
    });
  };

  const demoRevealBadge = (badgeId: string) => {
    const badge = BADGES.find((item) => item.id === badgeId);
    if (!badge) return;
    setBadgeReveal(badge);
    addFeed(
      "milestone",
      tf("badgeUnlocked", { badge: badgeName(badge) }),
      badgeDescription(badge),
    );
    playBurst(badge.tier === "legend" ? 5 : badge.tier === "gold" ? 4 : 3);
    window.setTimeout(() => setBadgeReveal(null), 1400);
  };

  const claimDailyCheckIn = () => {
    if (daily.claimedCheckIn) return;
    setDaily((value) => ({ ...value, claimedCheckIn: true }));
    setCoinBalance((value) => value + 100);
    addFeed("milestone", t("dailyCheckIn"), t("dailyCheckInBody"));
    playBurst(3);
  };

  const claimQuest = (questId: string, reward: number) => {
    setDaily((value) => ({
      ...value,
      questClaims: { ...value.questClaims, [questId]: true },
    }));
    setCoinBalance((value) => value + reward);
    addFeed(
      "milestone",
      t("dailyQuestComplete"),
      tf("rewardClaimed", { amount: coinCopy(reward) }),
    );
    playBurst(3);
  };

  const promptRoarSignIn = (
    intent: RoarAuthIntent,
    extra?: Record<string, unknown>,
  ) => {
    setAuthIntent(intent);
    trackEvent(
      "roar_auth_gate_hit",
      retentionAnalyticsProps({
        auth_intent: intent,
        guest_mode: isGuest,
        ...extra,
      }),
    );
    trackEvent(
      "roar_signin_prompt_viewed",
      retentionAnalyticsProps({
        prompt_reason: intent,
        guest_mode: isGuest,
        ...extra,
      }),
    );
    setAuthOpen(true);
  };

  const saveRoarScore = async () => {
    if (authLoading || scoreSaveStatus === "saving") return;
    if (!signedIn) {
      promptRoarSignIn("save_rank", {
        score: lifetimeSupport,
        rank_label: rankName(currentRoarRank),
      });
      return;
    }

    setScoreSaveStatus("saving");
    setSavedScoreInfo(null);
    try {
      const response = await fetch("/api/roar/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          matchTitle: selectedMatchTitle,
          team: selectedCountry,
          score: lifetimeSupport,
          rankLabel: rankName(currentRoarRank),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        authRequired?: boolean;
        awardedGp?: number;
        rows?: RoarLeaderboardRow[];
      };
      if (!response.ok) {
        if (payload.authRequired) {
          promptRoarSignIn("save_rank", {
            score: lifetimeSupport,
            rank_label: rankName(currentRoarRank),
            response_gate: "api_auth_required",
          });
          setScoreSaveStatus("idle");
          return;
        }
        throw new Error(payload.error ?? "Could not save ROAR score");
      }

      const leaderboardRank = payload.rows?.find(
        (row) => row.userId === user?.id,
      )?.rank;
      setSavedScoreInfo({
        awardedGp: payload.awardedGp ?? 0,
        leaderboardRank,
      });
      if (Array.isArray(payload.rows)) setLeaderboardRows(payload.rows);
      setScoreSaveStatus("saved");
      trackEvent(
        "roar_score_saved",
        retentionAnalyticsProps({
          score: lifetimeSupport,
          awarded_gp: payload.awardedGp ?? 0,
          leaderboard_rank: leaderboardRank,
        }),
      );
      addFeed(
        "milestone",
        "Rank saved",
        `Your ${rankName(currentRoarRank)} rank is saved to GamerClock.`,
      );
    } catch (error) {
      setScoreSaveStatus("error");
      setSavedScoreInfo({
        message:
          error instanceof Error ? error.message : "Could not save ROAR score",
      });
    }
  };

  const trackRetentionClick = (
    event:
      | "roar_calendar_return_clicked"
      | "roar_world_cup_feed_clicked"
      | "roar_other_games_clicked",
  ) => {
    trackEvent(event, retentionAnalyticsProps());
  };

  const resetParticipationRun = () => {
    setTapScore(0);
    setShakeScore(0);
    setComboBonus(0);
    setCombo(1);
    setComboMultiplier(1);
    setComboPulse((value) => value + 1);
    setFeverUntil(0);
    setLastCrit(null);
    setBestComboMultiplier(1);
    setSessionCoinsEarned(0);
    setFairCheerSent(0);
    setFairCheerRoundSent(0);
    setWelcomeBackReward(null);
    setStreakSavePrompt(false);
    setRoundReveal(null);
    setRoundEndsAt(Date.now() + ROUND_DURATION_MS);
    setImpactPower(0);
    setDrops([]);
    setShareText("");
    setRunnerBestProgress(0);
    setScoreSaveStatus("idle");
    setSavedScoreInfo(null);
    lastScoreboardIconCountRef.current = 0;
    setBoardTrophyReveal(null);
    milestoneRef.current.clear();
    dropThresholdRef.current.clear();
    contributionThresholdRef.current.clear();
  };

  const chooseCountry = (country: string) => {
    const nextMatch = bestMatchForCountry(matches, country);
    if (nextMatch && nextMatch.id !== selectedMatchId) {
      resetParticipationRun();
      setSelectedMatchId(nextMatch.id);
      trackEvent(
        "roar_match_selected",
        retentionAnalyticsProps({
          match_id: nextMatch.id,
          match_title: `${nextMatch.team1} vs ${nextMatch.team2}`,
          team_selected: country,
        }),
      );
    }
    setSelectedCountry(country);
  };

  const resetSession = () => {
    setTapScore(0);
    setShakeScore(0);
    setComboBonus(0);
    setCombo(1);
    setComboMultiplier(1);
    setComboPulse((value) => value + 1);
    setFeverUntil(0);
    setLastCrit(null);
    setBestComboMultiplier(1);
    setSessionCoinsEarned(0);
    setFairCheerSent(0);
    setFairCheerRoundSent(0);
    setWelcomeBackReward(null);
    setStreakSavePrompt(false);
    setRoundReveal(null);
    setRoundEndsAt(Date.now() + ROUND_DURATION_MS);
    setCoinBalance(0);
    setImpactPower(0);
    setUpgrades(DEFAULT_UPGRADES);
    setSessionSummary(null);
    setBets([]);
    setDrops([]);
    setEarnedBadgeIds([]);
    setBadgeReveal(null);
    setBetReveal(null);
    setResultReveal(null);
    setMascotPose("idle");
    setComboBurst(0);
    setShareText("");
    setDaily(freshDailyState());
    milestoneRef.current.clear();
    dropThresholdRef.current.clear();
    contributionThresholdRef.current.clear();
    addFeed(
      "drop",
      "Session reset",
      "Local test state cleared for today. Saved match records were kept.",
    );
  };

  const buyUpgrade = (kind: UpgradeKey) => {
    const level = upgrades[kind];
    const cost = upgradeCost(kind, level);
    if (coinBalance < cost) {
      showBetReveal({
        title: "Need coins",
        body: `${UPGRADE_DEFS[kind].label} costs ${fmt.format(cost)} coins.`,
        tone: "blocked",
      });
      return;
    }
    setCoinBalance((value) => Math.max(0, value - cost));
    setUpgrades((value) => ({ ...value, [kind]: value[kind] + 1 }));
    addFeed(
      "milestone",
      `${UPGRADE_DEFS[kind].label} Lv.${level + 1}`,
      UPGRADE_DEFS[kind].body,
    );
    showBetReveal({
      title: `${UPGRADE_DEFS[kind].label} upgraded`,
      body: UPGRADE_DEFS[kind].body,
      tone: "cheer",
    });
    addFloatingPop(`POWER +1`, "drop");
    playSound("coin");
  };

  const finishSession = () => {
    setSessionSummary({
      id: Date.now(),
      country: selectedCountry,
      roar: totalScore,
      bestMultiplier: bestComboMultiplier,
      coinsEarned: sessionCoinsEarned,
      boardIcons: scoreboardIconCount,
    });
    playSound("combo");
  };

  const generateShare = async () => {
    trackEvent(
      "roar_share_clicked",
      retentionAnalyticsProps({ lifetime_support: lifetimeSupport }),
    );
    const resultCopy = realScoreLine
      ? ` Actual score ${realScoreLine}.`
      : "";
    const text = `${playerDisplayName} joined ROAR for ${selectedCountry} in ${selectedMatch.team1} vs ${selectedMatch.team2}:${resultCopy} ${currentRoarRank.name} rank, ${fmt.format(lifetimeSupport)} lifetime support points, ${coinText(coinBalance)}, ${fmt.format(tapScore)} taps, ${fmt.format(shakeScore)} shakes, ${possession}% support share. Prediction ${predictionHome}-${predictionAway}.`;
    setShareText(text);
    let shareFile: File | undefined;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const [bg, emblem, rankArt] = await Promise.all([
          loadCanvasImage("/mini-cup/assets/share/share-card-bg.webp"),
          loadCanvasImage(`${BRAND_ASSETS}roar-emblem.png`),
          loadCanvasImage(
            currentRoarRank.id === "legend"
              ? `${MASCOT_ASSETS}roari-legend.png`
              : currentRoarRank.image,
          ),
        ]);
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "rgba(4,10,35,.18)");
        gradient.addColorStop(0.62, "rgba(4,10,35,.34)");
        gradient.addColorStop(1, "rgba(4,10,35,.74)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(emblem, 72, 72, 132, 132);
        ctx.fillStyle = "#f6c343";
        ctx.font = "900 96px Arial, sans-serif";
        ctx.fillText("ROAR", 228, 170);
        ctx.fillStyle = "rgba(255,255,255,.72)";
        ctx.font = "800 34px Arial, sans-serif";
        ctx.fillText("Crowd Battle Support Proof", 76, 255);
        ctx.drawImage(rankArt, 250, 360, 580, 580);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 82px Arial, sans-serif";
        ctx.fillText(playerDisplayName.slice(0, 18), 76, 1060);
        ctx.fillStyle = "#fde047";
        ctx.font = "900 58px Arial, sans-serif";
        ctx.fillText(
          `${flagFor(selectedCountry)} ${selectedCountry} · ${currentRoarRank.name}`,
          76,
          1140,
        );
        const stats = [
          ["Coins", fmt.format(coinBalance)],
          ["Taps", fmt.format(tapScore)],
          ["Shakes", fmt.format(shakeScore)],
          ["Matches", fmt.format(Math.max(1, records.length))],
          [
            "Board icons",
            `×${Math.min(scoreboardIconCount, PERSONAL_SCOREBOARD_GOALS.length)}`,
          ],
          ["Streak", fmt.format(daily.claimedCheckIn ? 1 : 0)],
        ];
        ctx.font = "900 32px Arial, sans-serif";
        stats.forEach(([label, value], index) => {
          const x = 76 + (index % 2) * 468;
          const y = 1265 + Math.floor(index / 2) * 160;
          ctx.fillStyle = "rgba(5,12,42,.74)";
          roundRect(ctx, x, y, 410, 118, 28);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.62)";
          ctx.fillText(label, x + 30, y + 42);
          ctx.fillStyle = "#fff7bf";
          ctx.font = "900 46px Arial, sans-serif";
          ctx.fillText(value, x + 30, y + 92);
          ctx.font = "900 32px Arial, sans-serif";
        });
        ctx.fillStyle = "rgba(255,255,255,.74)";
        ctx.font = "900 34px Arial, sans-serif";
        ctx.fillText("gamerclock.com/roar", 76, 1818);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 0.95),
        );
        if (blob)
          shareFile = new File([blob], "roar-support-proof.png", {
            type: "image/png",
          });
      }
    } catch {
      // Text sharing remains available if the canvas asset path is unavailable.
    }
    if (navigator.share) {
      const payload =
        shareFile && navigator.canShare?.({ files: [shareFile] })
          ? { title: "ROAR Support Proof", text, files: [shareFile] }
          : { title: "ROAR Support Proof", text };
      await navigator.share(payload).catch(() => undefined);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => undefined);
    }
    addFeed(
      "drop",
      "Share proof ready",
      "Your support proof is ready in the share sheet or clipboard.",
    );
  };

  const nextMatchForCalendar =
    matches
      .filter(
        (match) =>
          match.id !== selectedMatch.id &&
          matchStartAt(match).getTime() >= nowMs,
      )
      .sort(
        (a, b) => matchStartAt(a).getTime() - matchStartAt(b).getTime(),
      )[0] ?? selectedMatch;
  const hasPlayed = totalScore > 0 || impactPower > 0;
  const calendarReturnHref = "/?game=world-cup";
  const feedHref = "/api/feed/world-cup";
  const otherGamesHref = signedIn ? "/settings" : "/";
  const nextMatchLabel =
    nextMatchForCalendar.id === selectedMatch.id
      ? "the next Summer Cup match"
      : `${nextMatchForCalendar.team1} vs ${nextMatchForCalendar.team2}`;

  const retentionPanel = (
    <section className="roar-retention-panel" aria-label="GamerClock loop">
      <div className="roar-retention-kicker">
        <CalendarDays className="h-4 w-4" />
        GamerClock match loop
      </div>
      <h3>
        {hasPlayed
          ? `You backed ${selectedCountry}. Follow their next match on GamerClock.`
          : `Pick your side for ${selectedMatchTitle}.`}
      </h3>
      <p>
        {hasPlayed
          ? `Score ${fmt.format(totalScore)} · ${rankName(currentRoarRank)} · ${selectedMatchTitle}`
          : "Back this side, fill the crowd, then return to the calendar before the next kickoff."}
      </p>
      <div className="roar-retention-context">
        <span>{flagFor(selectedCountry)} Supported team</span>
        <b>{selectedCountry}</b>
      </div>
      <div className="roar-retention-context">
        <span>Next on GamerClock</span>
        <b>{nextMatchLabel}</b>
      </div>
      <div className="roar-save-card">
        {signedIn ? (
          <>
            <div>
              <strong>
                {scoreSaveStatus === "saved"
                  ? "Your ROAR rank is saved to your GamerClock profile."
                  : "Progress saves to GamerClock."}
              </strong>
              <span>
                {scoreSaveStatus === "saved"
                  ? [
                      savedScoreInfo?.awardedGp
                        ? `+${savedScoreInfo.awardedGp} GP awarded`
                        : "GP checked",
                      savedScoreInfo?.leaderboardRank
                        ? `Leaderboard #${savedScoreInfo.leaderboardRank}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Save this run to keep your rank and match history."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void saveRoarScore()}
              disabled={scoreSaveStatus === "saving"}
            >
              {scoreSaveStatus === "saving"
                ? "Saving..."
                : scoreSaveStatus === "saved"
                  ? "Saved"
                  : "Save rank"}
            </button>
          </>
        ) : (
          <>
            <div>
              <strong>Play now, sign in to save your rank.</strong>
              <span>Keep playing as guest. Save when the moment feels worth it.</span>
            </div>
            <button
              type="button"
              onClick={() =>
                promptRoarSignIn("save_rank", {
                  entry_point: "retention_panel",
                  score: lifetimeSupport,
                })
              }
            >
              Sign in to save
            </button>
            <button
              type="button"
              className="roar-guest-continue"
              onClick={() =>
                addFeed(
                  "clutch",
                  "Guest mode",
                  "Keep cheering now. You can save the rank later.",
                )
              }
            >
              Keep playing as guest
            </button>
          </>
        )}
      </div>
      {scoreSaveStatus === "error" && savedScoreInfo?.message && (
        <div className="roar-save-error">{savedScoreInfo.message}</div>
      )}
      {leaderboardRows.length > 0 && (
        <div className="roar-mini-leaderboard">
          <span>Match leaderboard</span>
          {leaderboardRows.slice(0, 3).map((row) => (
            <div key={`${row.userId ?? row.team}-${row.rank}`}>
              <b>#{row.rank}</b>
              <em>{row.team}</em>
              <strong>{fmt.format(row.score)}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="roar-retention-actions">
        <a
          href={calendarReturnHref}
          onClick={() => trackRetentionClick("roar_calendar_return_clicked")}
        >
          Follow next match
        </a>
        <a
          href={feedHref}
          onClick={() => trackRetentionClick("roar_world_cup_feed_clicked")}
        >
          Add Summer Cup calendar
        </a>
        <a
          href={otherGamesHref}
          onClick={() => trackRetentionClick("roar_other_games_clicked")}
        >
          Track my other games
        </a>
      </div>
    </section>
  );

  const segments = useMemo(
    () =>
      Array.from(
        { length: 48 },
        (_, index) => index < Math.round((possession / 100) * 48),
      ),
    [possession],
  );

  return (
    <div
      className={`mini-cup cup-shell hype-${hypeTier} overflow-hidden text-white ${embedded ? "min-h-[78vh] rounded-2xl" : "min-h-screen"}`}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className={`relative isolate px-4 py-5 sm:px-6 lg:px-8 ${embedded ? "min-h-[78vh]" : "min-h-screen"}`}>
        <div className="cup-orbit" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,20,15,.2),rgba(16,20,15,.92)),url('/mini-cup/stadium-energy.png')] bg-cover bg-center" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_10%,rgba(254,202,87,0.22),transparent_26%),linear-gradient(135deg,rgba(7,16,12,.74)_0%,rgba(24,32,22,.82)_42%,rgba(66,24,24,.78)_100%)]" />
        <div className="hype-lights pointer-events-none absolute inset-0 -z-10" />
        <div className="hype-scan pointer-events-none absolute inset-0 z-10" />
        {burst > 0 && <Burst key={burst} />}
        {itemReveal && <ItemReveal item={itemReveal} />}
        {badgeReveal && (
          <BadgeReveal
            badge={badgeReveal}
            t={t}
            badgeName={badgeName}
            badgeDescription={badgeDescription}
          />
        )}
        {rankReveal && <RankReveal rank={rankReveal} t={t} />}
        {betReveal && <BetRevealToast reveal={betReveal} t={t} />}
        {welcomeBackReward && (
          <div className="welcome-back-reveal" key={welcomeBackReward.id}>
            <span>WELCOME BACK</span>
            <strong>
              +{fmt.format(welcomeBackReward.amount)} fan bank
            </strong>
            <em>
              {welcomeBackReward.jackpot ? "JACKPOT" : "Fans kept cheering"} ·{" "}
              {welcomeBackReward.idleMinutes}m away
            </em>
          </div>
        )}
        {streakSavePrompt && (
          <div className="streak-save-prompt">
            Crowd cooling. Tap to save the streak.
          </div>
        )}
        {clutchActive && (
          <div className="clutch-time-banner">CLUTCH TIME ×2</div>
        )}
        {roundReveal && (
          <div className="round-reveal" key={roundReveal.id}>
            <strong>{roundReveal.title}</strong>
            <span>{roundReveal.body}</span>
          </div>
        )}
        {goalReveal && <GoalRevealBanner reveal={goalReveal} />}
        {resultReveal && (
          <ResultRevealOverlay
            reveal={resultReveal}
            t={t}
            onShare={() => void generateShare()}
            onClaim={() =>
              claimBetPayout(resultReveal.slipId, resultReveal.payout)
            }
            onReplay={() => {
              setResultReveal(null);
              resetParticipationRun();
              setCupTab("play");
            }}
            onClose={() => setResultReveal(null)}
          />
        )}
        {sessionSummary && (
          <SessionSummaryOverlay
            summary={sessionSummary}
            fmt={fmt}
            onClose={() => setSessionSummary(null)}
            onShare={() => void generateShare()}
          />
        )}
        {boardTrophyReveal && (
          <div
            key={boardTrophyReveal.id}
            className="board-trophy-reveal"
            aria-hidden="true"
          >
            <div>
              <strong>{boardTrophyReveal.title}</strong>
              <span>{boardTrophyReveal.body}</span>
            </div>
          </div>
        )}
        <AuthModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          nextPath={authReturnPath}
          source={authModalSource}
          sourceMeta={retentionAnalyticsProps({ auth_intent: authIntent })}
          title={
            authIntent === "save_rank"
              ? "Sign in free to save your ROAR rank."
              : "Sign in free to unlock predictions."
          }
          description={
            authIntent === "save_rank"
              ? "You can keep cheering as a guest. Sign in when you want this ROAR run saved to GamerClock."
              : "Your first cheer run stays open to guests. Sign in to lock picks, settle results, and keep your prediction history."
          }
          bullets={
            authIntent === "save_rank"
              ? [
                  "Save this match rank and your ROAR history to GamerClock.",
                  "See your progress again when the next Summer Cup match starts.",
                  "Keep your support proof tied to your GamerClock profile.",
                ]
              : [
                  "Lock prediction picks before kickoff.",
                  "Settle results and claim rewards after the match.",
                  "Keep prediction history and ROAR progress in one account.",
                ]
          }
        />
        {!onboarded && (
          <div className="onboarding-scrim">
            <div className="onboarding-card">
              <div className="onboarding-hero" aria-hidden="true">
                <Image
                  src="/mini-cup/assets/onboarding/welcome-hero.webp"
                  alt=""
                  fill
                  sizes="min(100vw, 640px)"
                  className="object-cover"
                  priority
                />
                <Image
                  src={`${BRAND_ASSETS}roar-logo-stacked.png`}
                  alt=""
                  width={156}
                  height={112}
                  className="onboarding-roar-stacked"
                  priority
                />
              </div>
              <div className="onboarding-content">
                <h2>{t("welcome")}</h2>
                <p>{t("welcomeBody")}</p>
              </div>

              <div className="onboarding-section">
                <div className="onboarding-label onboarding-label-icon">
                  <Image
                    src="/mini-cup/assets/onboarding/globe-icon.png"
                    alt=""
                    width={28}
                    height={28}
                  />
                  <span>{t("language")}</span>
                </div>
                <div className="language-grid">
                  {LANGUAGE_OPTIONS.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLocale(item.code)}
                      className={
                        locale === item.code
                          ? "language-chip language-chip-active"
                          : "language-chip"
                      }
                    >
                      <Image
                        src={`/mini-cup/assets/onboarding/lang/${item.code}.png`}
                        alt=""
                        width={36}
                        height={24}
                      />
                      <span>
                        <strong>{item.native}</strong>
                        <small>{item.label}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="onboarding-section">
                <div className="onboarding-label">{t("nickname")}</div>
                <input
                  value={draftPlayerName}
                  onChange={(event) =>
                    setDraftPlayerName(event.target.value.slice(0, 18))
                  }
                  className="onboarding-name-input"
                  placeholder={t("nicknamePlaceholder")}
                  aria-label={t("nickname")}
                  maxLength={18}
                />
                <div className="onboarding-match-hint">{t("nicknameHint")}</div>
              </div>

              <div className="onboarding-section">
                <div className="onboarding-label">{t("chooseTeam")}</div>
                <div className="onboarding-team-select">
                  <div className="onboarding-selected-flag">
                    <FlagMark country={selectedCountry} />
                  </div>
                  <select
                    value={selectedCountry}
                    onChange={(event) => chooseCountry(event.target.value)}
                  >
                    {allCountryChoices.map((country) => (
                      <option key={country} value={country}>
                        {flagFor(country)} {country}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="onboarding-match-hint">
                  {selectedMatch.team1} vs {selectedMatch.team2} ·{" "}
                  {matchPhaseLabel(selectedMatch)}
                </div>
                <div className="roar-onboarding-save-hint">
                  {signedIn
                    ? "Progress saves to GamerClock."
                    : "Play now, sign in to save your rank."}
                </div>
              </div>

              <button
                type="button"
                className="onboarding-start"
                onClick={() => {
                  setPlayerName(draftPlayerName.trim() || "Roari Fan");
                  setOnboarded(true);
                  setCupTab("play");
                  playSound("whistle");
                }}
              >
                {t("startPlaying")}
              </button>
            </div>
          </div>
        )}
        <div className="pointer-events-none fixed inset-x-0 top-[42%] z-30">
          {floatingPops.map((pop) => (
            <span
              key={pop.id}
              className={`floating-pop floating-${pop.tone}`}
              style={{ left: `${pop.left}%` }}
            >
              {pop.text}
            </span>
          ))}
        </div>

        <div className="cup-mobile-shell mx-auto max-w-[520px] overflow-visible rounded-[30px] border border-white/12 bg-[#10236b] shadow-[0_32px_120px_rgba(0,0,0,.55)]">
          <div
            className={`crowd-arena cheer-stage-${spectacleLevel} relative overflow-hidden`}
            style={
              {
                "--ally-from": allyColorA,
                "--ally-to": allyColorB,
                "--rival-from": rivalColorA,
                "--rival-to": rivalColorB,
                "--crowd-hue": allyCrowdHue,
                "--rival-crowd-hue": rivalCrowdHue,
              } as CSSProperties
            }
          >
            <div className="arena-sky" aria-hidden="true" />
            <div className="arena-header">
              <div className="arena-matchline">
                <div className="arena-kicker">
                  <RoarBrand compact /> <span>{t("crowdBattle")}</span>
                </div>
                <div key={scoreBeat} className="arena-title arena-scoreline">
                  <span className="score-team">
                    <span className="score-flag">
                      {flagFor(selectedMatch.team1)}
                    </span>
                    <span className="score-name">{selectedMatch.team1}</span>
                    <b className="score-num">
                      {compactFmt.format(cheerTotalForCountry(selectedMatch.team1))}
                    </b>
                  </span>
                  <em className="score-vs">VS</em>
                  <span className="score-team score-team-right">
                    <b className="score-num">
                      {compactFmt.format(cheerTotalForCountry(selectedMatch.team2))}
                    </b>
                    <span className="score-name">{selectedMatch.team2}</span>
                    <span className="score-flag">
                      {flagFor(selectedMatch.team2)}
                    </span>
                  </span>
                </div>
                <div className="possession-bar" aria-hidden="true">
                  {(() => {
                    const a = cheerTotalForCountry(selectedMatch.team1);
                    const b = cheerTotalForCountry(selectedMatch.team2);
                    const ap = Math.round((a / Math.max(1, a + b)) * 100);
                    const [c1] = colorsFor(selectedMatch.team1);
                    const [c2] = colorsFor(selectedMatch.team2);
                    return (
                      <>
                        <i
                          style={
                            { width: `${ap}%`, background: c1 } as CSSProperties
                          }
                        />
                        <i
                          style={
                            {
                              width: `${100 - ap}%`,
                              background: c2,
                            } as CSSProperties
                          }
                        />
                      </>
                    );
                  })()}
                </div>
                <div className="arena-subtitle">
                  {selectedMatch.date} · {selectedMatch.time ?? "TBD"} ·{" "}
                  {matchPhaseLabel(selectedMatch)}
                </div>
              </div>
              <button
                type="button"
                className={`sound-toggle ${soundMuted ? "sound-toggle-muted" : ""}`}
                onClick={() => {
                  setSoundMuted((value) => {
                    const next = !value;
                    if (!next) window.setTimeout(() => startBgm(true), 0);
                    return next;
                  });
                }}
                aria-label={soundMuted ? t("on") : t("off")}
                title={
                  soundMuted ? t("off") : soundUnlocked ? t("on") : t("ready")
                }
              >
                {soundMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                <span>
                  {soundMuted ? t("off") : soundUnlocked ? t("on") : t("ready")}
                </span>
              </button>
            </div>

            <section className="rival-cheer-strip actual-score-strip" aria-label="Actual match score">
              <div className="rival-live-scoreboard">
                <span>
                  {displayScoreKicker}
                  {realScoreSyncedLabel ? ` · ${realScoreSyncedLabel}` : ""}
                </span>
                <strong>
                  <em>
                    {flagFor(selectedMatch.team1)} {selectedMatch.team1}
                  </em>
                  <b>
                    {displayMatchScore[0]}-{displayMatchScore[1]}
                  </b>
                  <em>
                    {selectedMatch.team2} {flagFor(selectedMatch.team2)}
                  </em>
                </strong>
                <small>{displayScoreStatus}</small>
                {goalFeed.length > 0 && (
                  <div className="rival-goal-feed" aria-label="Goal feed">
                    {goalFeed.slice(-3).map((goal) => (
                      <i key={goal.id}>
                        ⚽ {goalMinuteLabel(goal)} {goal.name ?? goal.team}
                      </i>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section
              className={`collective-board board-side-${boardSide}`}
              aria-label={`${activeBoardCountry} collective scoreboard`}
              onTouchStart={(event) => {
                boardTouchStartRef.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const start = boardTouchStartRef.current;
                const end = event.changedTouches[0]?.clientX;
                boardTouchStartRef.current = null;
                if (start == null || end == null || Math.abs(start - end) < 36)
                  return;
                setBoardSide(start > end ? "rival" : "ally");
              }}
            >
              <div className="board-switcher" aria-label={t("scoreboard")}>
                <button
                  type="button"
                  className={boardSide === "ally" ? "board-switch-active" : ""}
                  onClick={() => setBoardSide("ally")}
                >
                  <span>
                    {flagFor(selectedCountry)} {t("myTeam")}
                  </span>
                  <b>
                    ×
                    {Math.min(
                      scoreboardIconCount,
                      PERSONAL_SCOREBOARD_GOALS.length,
                    )}{" "}
                    🪧
                  </b>
                </button>
                <button
                  type="button"
                  className={boardSide === "rival" ? "board-switch-active" : ""}
                  onClick={() => setBoardSide("rival")}
                >
                  <span>
                    {flagFor(opponentCountry)} {t("rivalTeam")}
                  </span>
                  <b>
                    ×
                    {Math.min(
                      rivalScoreboardIconCount,
                      COLLECTIVE_SCOREBOARD_GOALS.length,
                    )}{" "}
                    🪧
                  </b>
                </button>
              </div>
              <div className="board-track-duo">
                <span>
                  Personal board ×
                  {Math.min(scoreboardIconCount, PERSONAL_SCOREBOARD_GOALS.length)}
                  {boardAlmost ? " · ALMOST!" : ""}
                </span>
                <span>
                  Country board ×
                  {Math.min(
                    collectiveBoardIconCount,
                    COLLECTIVE_SCOREBOARD_GOALS.length,
                  )}{" "}
                  · {collectiveContribution.toFixed(1)}% yours
                  {collectiveBoardAlmost ? " · ALMOST!" : ""}
                </span>
              </div>
              <div className="cheer-integrity-card">
                <span>
                  Personal roar <b>{compactFmt.format(totalScore)}</b>
                </span>
                <span>
                  Global sent{" "}
                  <b>
                    {compactFmt.format(fairCheerSent)} /{" "}
                    {compactFmt.format(FAIR_CHEER_ROUND_CAP)} round cap
                  </b>
                </span>
                <span>
                  Rival fair <b>{compactFmt.format(fairRivalCheer)}</b>
                </span>
              </div>
              <div className="scoreboard-frame">
                <div className="scoreboard-grid" aria-hidden="true">
                  {Array.from({ length: SCOREBOARD_CELL_COUNT }, (_, index) => {
                    const row = Math.floor(index / SCOREBOARD_COLS);
                    const col = index % SCOREBOARD_COLS;
                    const lit = litScoreboardIndexes.has(index);
                    return (
                      <span
                        key={index}
                        className={
                          lit
                            ? "scoreboard-pixel scoreboard-pixel-on"
                            : "scoreboard-pixel"
                        }
                        style={
                          {
                            "--pixel-color": flagCardColor(
                              activeBoardCountry,
                              row,
                              col,
                            ),
                            "--i": index,
                          } as CSSProperties
                        }
                      />
                    );
                  })}
                </div>
              </div>
              <div className="energy-transfer" aria-hidden="true">
                {Array.from(
                  { length: Math.max(2, spectacleLevel * 3) },
                  (_, index) => (
                    <span
                      key={index}
                      style={{ "--i": index } as CSSProperties}
                    />
                  ),
                )}
              </div>
              {shouldShowBoardBurst && (
                <div
                  key={`confetti-${comboBurst}`}
                  className="crowd-confetti-burst"
                  aria-hidden="true"
                />
              )}
              {shouldShowBoardBurst && (
                <div
                  key={`combo-burst-${comboBurst}`}
                  className="combo-burst-overlay"
                  aria-hidden="true"
                />
              )}
              {shouldShowCrowdAccent && (
                <div
                  key={`tifo-${comboBurst}`}
                  className="crowd-tifo-takeover"
                  aria-hidden="true"
                />
              )}
              {shouldShowCrowdAccent && (
                <div
                  key={`scarf-${comboBurst}`}
                  className="crowd-scarf-wall"
                  aria-hidden="true"
                  style={{
                    backgroundImage: `url('/mini-cup/assets/crowd/recolor/scarf-wall-${allyCrowdScheme}.webp')`,
                  }}
                />
              )}
              {shouldShowCrowdAccent && (
                <div
                  key={`giant-flag-${comboBurst}-${scoreBeat}`}
                  className="crowd-giant-flag"
                  aria-hidden="true"
                  style={{
                    backgroundImage: `url('/mini-cup/assets/crowd/recolor/giant-flag-${allyCrowdScheme}.webp')`,
                  }}
                />
              )}
              {shouldShowImpactAvatar &&
                Array.from(
                  { length: 2 + (comboBurst % 2) },
                  (_, index) => (
                    <Image
                      key={`impact-avatar-${comboBurst}-${index}`}
                      className="combo-impact-avatar"
                      src={impactAvatarSrc(scoreBeat + index)}
                      alt=""
                      width={128}
                      height={128}
                      style={{ "--i": index } as CSSProperties}
                    />
                  ),
                )}
            </section>

            <section
              className="personal-stand-panel"
              aria-label={`${selectedCountry} personal stand`}
            >
              <div
                className={`personal-stand personal-stage-${personalStandStage}`}
                aria-hidden="true"
              >
                {personalStandMap.map((state, index) => (
                  <span
                    key={index}
                    className={`personal-seat spectator-seat personal-seat-${state} ${state !== "empty" ? crowdMotionClass(index) : ""} ${index % PERSONAL_STAND_COLS === scoreBeat % PERSONAL_STAND_COLS ? "crowd-wave-seat" : ""} ${state !== "empty" && Math.abs((index % PERSONAL_STAND_COLS) - (scoreBeat % PERSONAL_STAND_COLS)) <= 1 ? "crowd-tap-pop" : ""}`}
                    style={
                      {
                        "--i": index,
                        "--col": index % PERSONAL_STAND_COLS,
                      } as CSSProperties
                    }
                  >
                    {state !== "empty" && (
                      <Image
                        className="spectator-img spectator-img-home"
                        src={spectatorSrc(
                          index,
                          selectedSpectatorSet[0],
                          selectedSpectatorSet[1],
                        )}
                        alt=""
                        width={102}
                        height={110}
                      />
                    )}
                    {shouldShowCrowdAccent &&
                      state !== "empty" &&
                      index % 29 === scoreBeat % 29 && (
                        <i
                          className="crowd-prop"
                          style={
                            {
                              "--i": index,
                              backgroundImage: `url('/mini-cup/assets/crowd/prop-${String((index % 9) + 1).padStart(2, "0")}.png')`,
                            } as CSSProperties
                          }
                        />
                      )}
                  </span>
                ))}
                {shouldShowCrowdAccent &&
                  Array.from(
                    { length: Math.min(3, 1 + Math.floor(combo / 5)) },
                    (_, index) => (
                      <span
                        key={`emote-${scoreBeat}-${index}`}
                        className="crowd-emote"
                        style={
                          {
                            left: `${12 + ((index * 19 + scoreBeat * 7) % 72)}%`,
                            top: `${8 + ((index * 13 + scoreBeat * 5) % 48)}%`,
                            backgroundImage: `url('/mini-cup/assets/crowd/${index % 2 === 0 ? "bubble" : "emote"}-${String(((index + scoreBeat) % 9) + 1).padStart(2, "0")}.png')`,
                            animationDelay: `${index * 80}ms`,
                          } as CSSProperties
                        }
                      />
                    ),
                  )}
              </div>
            </section>
          </div>

          <div className="top-action-bar relative grid grid-cols-2 gap-3 bg-[#10236b] px-4 py-4">
            <button
              type="button"
              onClick={() => scoreAction("tap")}
              className="hero-action hero-action-tap"
              aria-label={t("tap")}
            >
              <Zap className="h-6 w-6" />
              <span>{t("tap")}</span>
              <b>{fmt.format(tapScore)}</b>
            </button>
            <button
              type="button"
              onClick={() => void handleShakePress()}
              className="hero-action hero-action-shake"
              aria-label={t("shake")}
            >
              <Vibrate className="h-6 w-6" />
              <span>{t("shake")}</span>
              <b>{fmt.format(shakeScore)}</b>
            </button>
            <div className="action-stage-row">
              <div className="stage-title-row">
                <span>
                  {t("stage")} {personalStandStage}
                </span>
                <b>{t(currentPersonalStage.key)}</b>
              </div>
              <div
                className={`combo-multiplier-pill ${comboPulse ? "combo-multiplier-pulse" : ""}`}
                key={`combo-${comboPulse}-${comboMultiplier}`}
                aria-label={`Combo multiplier ${comboMultiplier}`}
              >
                <span>COMBO</span>
                <b>×{comboMultiplier.toFixed(1)}</b>
                {feverActive ? <em>FEVER ×3</em> : <em>Base {tapBase}</em>}
              </div>
              <div
                className="stage-runner-track"
                aria-label={`${t("stage")} ${lockedCampaignProgress}%`}
              >
                <i style={{ width: `${lockedCampaignProgress}%` }} />
                <span
                  className="stage-runner"
                  style={{ left: `${stageRunnerProgress}%` } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className="stage-runner-placeholder" />
                </span>
              </div>
              <div className="action-coin-pill" key={coinBalance}>
                <CoinIcon size={22} />
                <b>{fmt.format(coinBalance)}</b>
              </div>
              {lastCrit && (
                <div className="crit-chip" key={lastCrit.id}>
                  CRIT +{fmt.format(lastCrit.gain)}
                </div>
              )}
            </div>
            <MiniMascot
              pose={
                spectacleLevel >= 4 && mascotPose === "idle"
                  ? "flag"
                  : mascotPose
              }
            />
          </div>

          <div className="team-status-strip bg-[#10236b] px-4 pb-3">
            <div className="hero-selected-team w-full">
              <div className="flex items-center gap-3">
                <FlagMark country={selectedCountry} />
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-lg font-black">
                    {selectedCountry}
                  </div>
                  <div className="text-xs font-black text-white/60">
                    {t("coinHint")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                    {t("myScore")}
                  </div>
                  <div
                    key={scoreBeat}
                    className="score-beat text-4xl font-black text-white"
                  >
                    {fmt.format(impactPower)}
                  </div>
                </div>
              </div>
              <div className="coin-pop-layer" aria-hidden="true">
                {coinPops.map((coin) => (
                  <span
                    key={coin.id}
                    className="coin-pop"
                    style={{ left: `${coin.left}%` }}
                  >
                    +{coin.amount}
                  </span>
                ))}
              </div>
            </div>
            <div className="session-goal-card">
              <div>
                <span>SESSION GOAL</span>
                <b>{sessionGoalText}</b>
                <em>
                  Round {Math.ceil(roundMsLeft / 1000)}s
                  {comebackActive ? " · COMEBACK" : ""}
                  {clutchActive ? " · CLUTCH ×2" : ""}
                </em>
              </div>
              <button type="button" onClick={finishSession}>
                End run
              </button>
            </div>
          </div>

          <div className="mini-tabs grid grid-cols-5 bg-[#263b86] text-white/68">
            {(
              [
                ["trophies", t("trophies")],
                ["play", t("play")],
                ["power", "Power"],
                ["matches", t("matches")],
                ["bets", t("bets")],
              ] as Array<[CupTab, string]>
            ).map(([tab, label]) => (
              <button
                key={tab}
                aria-label={`ROAR ${label} tab`}
                onClick={() => setCupTab(tab)}
                className={`relative py-4 text-sm font-black sm:text-base ${cupTab === tab ? "text-white" : ""}`}
              >
                {label}
                {cupTab === tab && (
                  <span className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-sky-200" />
                )}
              </button>
            ))}
          </div>

          <div className="min-h-[620px] bg-[#10236b] p-4 text-white sm:p-6">
            <div className={cupTab === "play" ? "block" : "hidden"}>
              <div className="play-focus-panel">
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-yellow-100/70">
                    Now cheering
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {flagFor(selectedCountry)} {selectedCountry}
                  </div>
                  <div className="mt-1 text-sm font-black text-white/54">
                    {selectedMatch.team1} vs {selectedMatch.team2} ·{" "}
                    {t("cheeringOpen")}
                  </div>
                </div>
                <select
                  value={selectedCountry}
                  onChange={(event) => {
                    if (event.target.value !== selectedCountry)
                      resetParticipationRun();
                    setSelectedCountry(event.target.value);
                  }}
                  className="play-team-select"
                  aria-label={t("chooseTeam")}
                >
                  {countryChoices.map((country) => (
                    <option key={country} value={country}>
                      {flagFor(country)} {country}
                    </option>
                  ))}
                </select>
                <div className="play-focus-stats">
                  <MiniMetric label={t("myScore")} value={impactPower} />
                  <MiniMetric label={t("combo")} value={combo} />
                  <MiniMetric label={t("coins")} value={coinBalance} />
                </div>
                <button onClick={enableShake} className="motion-enable-button">
                  {t("motionShake")} {shakeReady ? t("on") : t("enable")}
                </button>
              </div>
              {retentionPanel}
            </div>

            <div className={cupTab === "power" ? "block" : "hidden"}>
              <div className="upgrade-panel upgrade-panel-standalone">
                <div className="upgrade-panel-head">
                  <div>
                    <span>POWER LOOP</span>
                    <b>Spend coins to make every roar louder.</b>
                  </div>
                  <CoinAmount value={coinBalance} />
                </div>
                <div className="power-balance-note">
                  <span>Current tap base</span>
                  <b>
                    {tapBase} × combo × heat × fever
                  </b>
                </div>
                <div className="upgrade-grid">
                  {(Object.keys(UPGRADE_DEFS) as UpgradeKey[]).map((kind) => {
                    const level = upgrades[kind];
                    const cost = upgradeCost(kind, level);
                    return (
                      <button
                        key={kind}
                        type="button"
                        className="upgrade-card"
                        onClick={() => buyUpgrade(kind)}
                        disabled={coinBalance < cost}
                      >
                        <span>{UPGRADE_DEFS[kind].stat}</span>
                        <b>{UPGRADE_DEFS[kind].label}</b>
                        <em>Lv.{level}</em>
                        <small>{UPGRADE_DEFS[kind].body}</small>
                        <strong>
                          <CoinIcon size={15} /> {fmt.format(cost)}
                        </strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={cupTab === "matches" ? "block" : "hidden"}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black">{t("playMatch")}</div>
                  <div className="text-sm text-white/55">{dataStatus}</div>
                </div>
                <select
                  value={matchFilter}
                  onChange={(event) =>
                    setMatchFilter(event.target.value as MatchFilter)
                  }
                  className="rounded-full bg-black/22 px-3 py-2 text-sm font-black outline-none"
                >
                  <option value="upcoming">{t("upcoming")}</option>
                  <option value="today">{t("today")}</option>
                  <option value="all">{t("all")}</option>
                </select>
              </div>
              <div className="space-y-4">
                {displayMatches.slice(0, 30).map((match) => (
                  <MiniMatchCard
                    key={match.id}
                    match={match}
                    active={match.id === selectedMatchId}
                    t={t}
                    scoreA={supportTotalFor(
                      match.team1,
                      match.team1 === selectedCountry ? teamPulse : rivalPulse,
                      cheerTotalForCountry(match.team1),
                    )}
                    scoreB={supportTotalFor(
                      match.team2,
                      match.team2 === selectedCountry ? teamPulse : rivalPulse,
                      cheerTotalForCountry(match.team2),
                    )}
                    onClick={() => {
                      if (match.id !== selectedMatchId) resetParticipationRun();
                      setSelectedMatchId(match.id);
                      trackEvent(
                        "roar_match_selected",
                        retentionAnalyticsProps({
                          match_id: match.id,
                          match_title: `${match.team1} vs ${match.team2}`,
                          team_selected:
                            selectedCountry === match.team1 ||
                            selectedCountry === match.team2
                              ? selectedCountry
                              : match.team1,
                        }),
                      );
                      if (
                        selectedCountry !== match.team1 &&
                        selectedCountry !== match.team2
                      )
                        setSelectedCountry(match.team1);
                      setCupTab("play");
                    }}
                  />
                ))}
              </div>
            </div>

            <div className={cupTab === "bets" ? "block" : "hidden"}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-black">
                    {t("predictionBets")}
                  </div>
                  <div className="mt-1 text-sm font-black text-white/54">
                    {t("predictionBetsHint")}
                  </div>
                </div>
                <div className="bet-wallet">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em]">
                    {t("coins")}
                  </div>
                  <CoinAmount value={coinBalance} className="mt-1 text-xl" />
                </div>
              </div>

              {!signedIn && (
                <div className="roar-auth-gate-card roar-bets-auth-gate mb-4">
                  <div>
                    <strong>Predictions unlock after sign in.</strong>
                    <span>
                      Your first cheer run stays open to guests. Sign in to lock picks, settle results, and claim rewards.
                    </span>
                  </div>
                  <div className="roar-auth-gate-actions">
                    <button
                      type="button"
                      onClick={() =>
                        promptRoarSignIn("prediction_pick", {
                          entry_point: "bets_tab_gate_mobile",
                        })
                      }
                    >
                      Sign in to predict
                    </button>
                    <button
                      type="button"
                      className="roar-auth-gate-secondary"
                      onClick={() => setCupTab("play")}
                    >
                      Keep cheering
                    </button>
                  </div>
                </div>
              )}

              {realMatchScore && (
                <div className="prediction-live-state">
                  <span>
                    {livePhase === "live"
                      ? "Live score"
                      : livePhase === "ended"
                        ? "Final score"
                        : "Synced score"}
                  </span>
                  <b>
                    {selectedMatch.team1} {realMatchScore[0]}-
                    {realMatchScore[1]} {selectedMatch.team2}
                  </b>
                  <em>
                    {realScoreSyncedLabel
                      ? `Checked ${realScoreSyncedLabel}`
                      : "Checked from match data"}
                  </em>
                </div>
              )}

              <div className="betting-console">
                <div className="bet-match-ticket">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-yellow-100/70">
                        {selectedMatch.round}
                      </div>
                      <div className="bet-match-title">
                        <span>
                          {flagFor(selectedMatch.team1)} {selectedMatch.team1}
                        </span>
                        <em>VS</em>
                        <span>
                          {selectedMatch.team2} {flagFor(selectedMatch.team2)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-black text-white/52">
                        {selectedMatch.date} · {selectedMatch.time ?? "TBD"}
                      </div>
                    </div>
                    <button
                      onClick={() => setCupTab("matches")}
                      className="bet-change-button"
                    >
                      {t("changeMatch")}
                    </button>
                  </div>
                  <div className="bet-odds-list">
                    <BetButton
                      label={selectedMatch.team1}
                      chance={matchPrediction.team1}
                      country={selectedMatch.team1}
                      disabled={!signedIn || !selectedCanBet || coinBalance <= 0}
                      disabledReason={
                        !signedIn
                          ? "auth"
                          : !selectedCanBet
                          ? "closed"
                          : coinBalance <= 0
                            ? "coins"
                            : undefined
                      }
                      onClick={() => placeBet("team1")}
                      t={t}
                    />
                    <BetButton
                      label={t("draw")}
                      chance={matchPrediction.draw}
                      disabled={!signedIn || !selectedCanBet || coinBalance <= 0}
                      disabledReason={
                        !signedIn
                          ? "auth"
                          : !selectedCanBet
                          ? "closed"
                          : coinBalance <= 0
                            ? "coins"
                            : undefined
                      }
                      onClick={() => placeBet("draw")}
                      t={t}
                    />
                    <BetButton
                      label={selectedMatch.team2}
                      chance={matchPrediction.team2}
                      country={selectedMatch.team2}
                      disabled={!signedIn || !selectedCanBet || coinBalance <= 0}
                      disabledReason={
                        !signedIn
                          ? "auth"
                          : !selectedCanBet
                          ? "closed"
                          : coinBalance <= 0
                            ? "coins"
                            : undefined
                      }
                      onClick={() => placeBet("team2")}
                      t={t}
                    />
                  </div>
                </div>

                <div className="bet-slip-card">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-white/58">
                        {t("stake")}
                      </div>
                      <CoinAmount
                        value={effectiveStake}
                        className="text-3xl text-yellow-100"
                      />
                    </div>
                    <div
                      className={`bet-status-pill ${selectedCanBet ? "bet-status-open" : "bet-status-closed"}`}
                    >
                      {selectedCanBet
                        ? `${countdownText(selectedMatch, nowMs, t)} ${t("toKickoff")}`
                        : t("closedAfterKickoff")}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={maxStake}
                    step={10}
                    disabled={!signedIn || !selectedCanBet || coinBalance <= 0}
                    value={Math.min(stake, maxStake)}
                    onChange={(event) => setStake(Number(event.target.value))}
                    className="w-full accent-yellow-300 disabled:opacity-35"
                  />
                  <div className="locked-ticket-preview" aria-hidden="true">
                    <span>
                      {selectedCanBet ? t("lockPick") : t("closedAfterKickoff")}
                    </span>
                    <b>
                      {selectedCanBet
                        ? `${selectedCountry} · ${coinCopy(effectiveStake)}`
                        : selectedMatchTitle}
                    </b>
                    <em>
                      {!signedIn
                        ? "Sign in to unlock picks"
                        : selectedCanBet
                        ? `${t("potentialReturn")} ${coinCopy(effectiveStake * 2)}`
                        : t("settlesAfterKickoff")}
                    </em>
                  </div>
                  <div className="mt-3 text-xs leading-relaxed text-white/56">
                    {signedIn
                      ? t("supportCoinRule")
                      : "Guest mode covers cheering only. Predictions and reward claims start after sign in."}
                  </div>
                </div>
              </div>

              {qaMode && (
                <div className="qa-result-panel">
                  <div>
                    <span>{t("qaResultTrigger")}</span>
                    <b>
                      Preview settlement spectacle without waiting for a real
                      final score.
                    </b>
                  </div>
                  <div className="qa-result-actions">
                    <button type="button" onClick={() => demoSettleBet(true)}>
                      Demo win
                    </button>
                    <button type="button" onClick={() => demoSettleBet(false)}>
                      Demo loss
                    </button>
                    <button
                      type="button"
                      onClick={() => demoRevealBadge("first-roar")}
                    >
                      First badge
                    </button>
                    <button
                      type="button"
                      onClick={() => demoRevealBadge("first-bet")}
                    >
                      Bet badge
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 bet-list-panel">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xl font-black">{t("openSlips")}</div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/58">
                    {openBets.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {openBets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/58">
                      {t("noOpenSlips")}
                    </div>
                  ) : (
                    openBets.map((bet) => {
                      const betMatch =
                        matches.find((match) => match.id === bet.matchId) ??
                        selectedMatch;
                      const realOutcome = outcomeFromScore(betMatch);
                      const betCanSettle =
                        canSettleMatch(betMatch) && Boolean(realOutcome);
                      return (
                        <div
                          key={bet.id}
                          className="rounded-2xl border border-white/10 bg-black/25 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-black">{bet.pickLabel}</div>
                              <div className="text-xs text-white/55">
                                {flagFor(betMatch.team1)} {betMatch.team1} vs{" "}
                                {betMatch.team2} {flagFor(betMatch.team2)}
                              </div>
                              <div className="text-xs text-white/55">
                                {betMatch.date} · {betMatch.time ?? "TBD"} ·
                                {t("settlesAfterKickoff")} ·{" "}
                                {countdownText(betMatch, nowMs, t)}
                              </div>
                              <div className="inline-flex flex-wrap items-center gap-1 text-xs text-white/55">
                                <CoinAmount value={bet.stake} />{" "}
                                <span>
                                  · 2x ·{" "}
                                  {betCanSettle
                                    ? t("resultReady")
                                    : canSettleMatch(betMatch)
                                      ? t("waitingForResult")
                                      : t("openSlip")}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => settleBet(bet)}
                              disabled={!betCanSettle}
                              className="rounded-md bg-white px-3 py-2 text-xs font-black text-stone-950 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
                            >
                              {betCanSettle ? t("settle") : t("wait")}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-5 bet-list-panel">
                <div className="mb-3 text-xl font-black">{t("settled")}</div>
                <div className="space-y-2">
                  {settledBets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/58">
                      {t("noSettledBets")}
                    </div>
                  ) : (
                    settledBets.map((bet) => (
                      <div key={bet.id} className="settled-slip-row">
                        <span>
                          {bet.pickLabel} · <CoinAmount value={bet.stake} />{" "}
                          {bet.status === "won" && (bet.payout ?? 0) > 0 ? (
                            <>
                              · {t("payout")}{" "}
                              <CoinAmount value={bet.payout ?? 0} />
                            </>
                          ) : (
                            ""
                          )}
                        </span>
                        {bet.status === "won" &&
                        !bet.claimed &&
                        (bet.payout ?? 0) > 0 ? (
                          <button
                            type="button"
                            onClick={() => claimBetPayout(bet.id, bet.payout)}
                          >
                            {t("claim")}
                          </button>
                        ) : (
                          <b
                            className={
                              bet.status === "won"
                                ? "text-yellow-200"
                                : "text-red-200"
                            }
                          >
                            {bet.status === "won"
                              ? bet.claimed
                                ? t("claimed")
                                : t("won")
                              : t("lost")}
                          </b>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={cupTab === "trophies" ? "block" : "hidden"}>
              <div className="history-rank-card">
                <div className="history-rank-copy">
                  <div className="history-eyebrow">{t("roarRank")}</div>
                  <div className="history-player-name">{playerDisplayName}</div>
                  <h2>{rankName(currentRoarRank)}</h2>
                  <p>{rankTone(currentRoarRank)}</p>
                  <div className="rank-progress-row">
                    <span>
                      {fmt.format(lifetimeSupport)} {t("supportPoints")}
                    </span>
                    <b>
                      {nextRoarRank
                        ? `${fmt.format(Math.max(0, nextRoarRank.threshold - lifetimeSupport))} ${t("toNextRank")} ${rankName(nextRoarRank)}`
                        : t("maxRank")}
                    </b>
                  </div>
                  <div
                    className="rank-progress-bar"
                    aria-label={`ROAR rank progress ${currentRoarProgress}%`}
                  >
                    <i style={{ width: `${currentRoarProgress}%` }} />
                  </div>
                </div>
                <div className="history-rank-art">
                  <Image
                    src={
                      currentRoarRank.id === "legend"
                        ? `${MASCOT_ASSETS}roari-legend.png`
                        : currentRoarRank.image
                    }
                    alt={`${rankName(currentRoarRank)} Roari`}
                    width={220}
                    height={220}
                    priority
                  />
                </div>
              </div>
              {retentionPanel}
              <div className="history-tablet-grid">
                <MiniMetricCard
                  label={t("taps")}
                  value={fmt.format(tapScore)}
                />
                <MiniMetricCard
                  label={t("shakes")}
                  value={fmt.format(shakeScore)}
                />
                <MiniMetricCard
                  label={t("supportPoints")}
                  value={fmt.format(lifetimeSupport)}
                />
                <MiniMetricCard
                  label={t("boardIcons")}
                  value={`×${Math.min(scoreboardIconCount, PERSONAL_SCOREBOARD_GOALS.length)}`}
                />
                <div className="history-coin-card">
                  <CoinAmount value={coinBalance} className="text-3xl" />
                  <div className="mt-2 text-sm font-black text-white/58">
                    {t("coins")}
                  </div>
                </div>
                <MiniMetricCard
                  label="Open picks"
                  value={fmt.format(openBets.length)}
                />
                <MiniMetricCard
                  label="Settled wins"
                  value={fmt.format(
                    bets.filter((bet) => bet.status === "won").length,
                  )}
                />
              </div>
              <div className="mt-5 rounded-[22px] bg-[#1c327c] p-4">
                <div className="mb-3 text-lg font-black">
                  {t("recentMatchRecords")}
                </div>
                <div className="space-y-2">
                  {topRecords.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/50">
                      {t("noSavedRecords")}
                    </div>
                  ) : (
                    topRecords.map((record) => (
                      <div
                        key={record.id}
                        className="rounded-2xl bg-black/20 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-black">
                              {record.country}
                            </div>
                            <div className="truncate text-xs text-white/54">
                              {record.matchLabel}
                            </div>
                          </div>
                          <div className="text-lg font-black text-sky-200">
                            {compactFmt.format(record.impactPower)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <aside className="mt-5 hidden space-y-4 lg:block">
              {retentionPanel}
              <div className="rounded-[24px] bg-[#1c327c] p-4">
                <div className="text-lg font-black">{t("supportProof")}</div>
                <div className="mt-3 proof-card rounded-[22px] p-4 text-[#160b08]">
                  <div className="text-xs font-black uppercase tracking-[0.18em]">
                    support proof
                  </div>
                  <div className="proof-rank-art">
                    <Image
                      src={currentRoarRank.image}
                      alt=""
                      width={94}
                      height={94}
                    />
                  </div>
                  <div className="mt-5 text-4xl font-black">
                    {compactFmt.format(impactPower)} power
                  </div>
                  <div className="mt-1 text-sm font-black">
                    {playerDisplayName} · {selectedCountry} ·{" "}
                    {currentRoarRank.name} Roari
                  </div>
                </div>
                <button
                  onClick={generateShare}
                  className="mt-3 w-full rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-stone-950"
                >
                  Create share text
                </button>
              </div>
              <div className="rounded-[24px] bg-[#1c327c] p-4">
                <div className="text-lg font-black">{t("liveBursts")}</div>
                <div className="mt-3 space-y-2">
                  {feed.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className={`feed-item feed-${item.tone}`}
                    >
                      <div className="font-black">{item.title}</div>
                      <div className="mt-1 text-xs leading-relaxed text-white/62">
                        {item.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="hidden">
          <header className="broadcast-hud mx-auto mb-4 flex max-w-[600px] flex-col gap-4 p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb5f49,#38bdf8)] text-stone-950 shadow-[0_18px_42px_rgba(250,204,21,.22)]">
                <Trophy className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-100">
                  <span className="live-dot" /> ROAR Live Room
                  <span className="rounded-full border border-white/12 px-2 py-1 text-white/58">
                    {selectedMatch.round}
                  </span>
                </div>
                <h1 className="mt-1 truncate text-3xl font-black tracking-normal sm:text-5xl">
                  Support Proof Stadium
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="broadcast-chip text-yellow-100">
                <CoinIcon size={18} /> {fmt.format(coinBalance)}
              </div>
              <input
                value={roomCode}
                onChange={(event) =>
                  setRoomCode(event.target.value.toUpperCase().slice(0, 12))
                }
                className="h-11 w-36 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-black text-white outline-none"
                aria-label="room code"
              />
              <button
                onClick={generateShare}
                className="score-ribbon inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black transition hover:brightness-110"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={resetSession}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-black text-white/80 transition hover:bg-white/15"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </header>

          <main className="mx-auto grid max-w-[600px] gap-4">
            <section className="space-y-4">
              <div className="grid gap-4">
                <div className="game-card relative p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
                        stadium control
                      </div>
                      <div className="mt-1 text-xl font-black">
                        {selectedCountry} support share {possession}%
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-right shadow-inner">
                      <div className="text-xs text-white/55">
                        Predicted score
                      </div>
                      <div className="text-2xl font-black text-yellow-200">
                        {predictionHome} - {predictionAway}
                      </div>
                    </div>
                  </div>

                  <div className="stadium-grid">
                    {segments.map((active, index) => (
                      <div
                        key={index}
                        className={`stadium-seat ${active ? "stadium-seat-on" : "stadium-seat-off"}`}
                        style={{ animationDelay: `${(index % 12) * 35}ms` }}
                      />
                    ))}
                    <div className="stadium-field">
                      <div className="h-full rounded-[50%] border border-white/25 bg-[linear-gradient(90deg,rgba(34,197,94,.34),rgba(255,255,255,.08),rgba(239,68,68,.28))] p-4">
                        <div className="flex h-full items-center justify-center rounded-[50%] border border-white/20 text-center">
                          <div>
                            <div
                              key={scoreBeat}
                              className="score-beat mega-number text-5xl font-black text-white"
                            >
                              {compactFmt.format(impactPower)}
                            </div>
                            <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
                              cheer impact
                            </div>
                            <div className="mt-2 text-sm font-black text-white/70">
                              {fmt.format(impactPower)} power
                            </div>
                            <div className="mt-3 inline-flex rounded-full bg-yellow-300/20 px-3 py-1 text-xs font-black text-yellow-100">
                              HYPE LV.{hypeTier + 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Meter label="My heat" value={energyLevel} icon={Flame} />
                    <Meter
                      label={`${selectedCountry} support`}
                      value={Math.min(
                        100,
                        Math.round((allyTotal / 4800) * 100),
                      )}
                      icon={Users}
                    />
                    <Meter
                      label={`${opponentCountry} pressure`}
                      value={Math.min(
                        100,
                        Math.round((rivalTotal / 4800) * 100),
                      )}
                      icon={Shield}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="impact-card rounded-[18px] border border-yellow-300/30 p-4">
                    <div className="text-sm font-black text-yellow-100">
                      Total support power
                    </div>
                    <div className="mt-2 text-4xl font-black text-white">
                      {compactFmt.format(impactPower)}
                    </div>
                    <div className="mt-1 text-xs font-black text-yellow-100/70">
                      {fmt.format(impactPower)} power
                    </div>
                  </div>
                  <ScoreCard label="Taps" value={tapScore} tone="red" />
                  <ScoreCard label="Shakes" value={shakeScore} tone="green" />
                  <ScoreCard
                    label="Combo bonus"
                    value={comboBonus}
                    tone="yellow"
                  />
                  <div className="rounded-xl border border-yellow-300/30 bg-yellow-300/12 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-yellow-100">
                        Current combo
                      </span>
                      <span className="text-3xl font-black text-yellow-200">
                        x{combo}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-yellow-300 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (combo / 15) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-white/65">
                      Tap and shake are 1 point and 1 coin per action.
                      Alternating within 0.7s only boosts the visual combo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="game-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-black uppercase tracking-[0.14em] text-white/60">
                      action deck
                    </div>
                    <div className="rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white/80">
                      {selectedMatch.round}
                    </div>
                  </div>
                  <div className="mb-3 rounded-[18px] border border-yellow-300/20 bg-[linear-gradient(135deg,rgba(250,204,21,.16),rgba(56,189,248,.08))] p-3">
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-100/70">
                      choose your side
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {countryChoices.map((country) => (
                        <button
                          key={country}
                          onClick={() => {
                            if (country !== selectedCountry)
                              resetParticipationRun();
                            setSelectedCountry(country);
                          }}
                          className={`team-ticket px-3 py-3 text-left transition ${selectedCountry === country ? "team-ticket-active" : "text-white hover:border-white/30"}`}
                        >
                          <div className="text-sm font-black">{country}</div>
                          <div className="mt-1 text-xs opacity-70">
                            {selectedCountry === country
                              ? "Joined"
                              : "Join this team"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => scoreAction("tap")}
                      className="tap-button action-card tap-action p-5 text-left"
                    >
                      <Zap className="mb-8 h-8 w-8" />
                      <div className="text-3xl font-black">Tap support</div>
                      <div className="mt-2 text-sm font-bold text-red-50/80">
                        +1 point and +1 coin per tap. Combos boost effects only.
                      </div>
                    </button>
                    <button
                      onClick={() => void handleShakePress()}
                      className="tap-button action-card shake-action p-5 text-left"
                    >
                      <Vibrate className="mb-8 h-8 w-8" />
                      <div className="text-3xl font-black">Shake</div>
                      <div className="mt-2 text-sm font-bold text-emerald-50/80">
                        Tap once to enable motion on mobile.
                      </div>
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void enableShake()}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-black text-stone-950"
                    >
                      Motion shake {shakeReady ? "ON" : "Enable"}
                    </button>
                    {EMOTIONS.map((item) => (
                      <button
                        key={item}
                        onClick={() => pressEmotion(item)}
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-black hover:bg-white/15"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="game-card proof-stage p-4">
                  <div className="relative z-[1] mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white/80">
                    <Trophy className="h-4 w-4" /> Proof card
                  </div>
                  <div className="proof-card rounded-xl p-4 text-[#160b08]">
                    <div className="text-xs font-black uppercase tracking-[0.18em]">
                      support proof
                    </div>
                    <div className="proof-rank-art">
                      <Image
                        src={currentRoarRank.image}
                        alt=""
                        width={94}
                        height={94}
                      />
                    </div>
                    <div className="mt-5 text-4xl font-black">
                      {compactFmt.format(impactPower)} power
                    </div>
                    <div className="mt-1 text-sm font-black">
                      {playerDisplayName} · {selectedCountry} ·{" "}
                      {currentRoarRank.name} Roari · real score{" "}
                      {fmt.format(totalScore)} · {coinText(coinBalance)}
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-black">
                      <span className="rounded-md bg-white/50 p-2">
                        Tap
                        <br />
                        {fmt.format(tapScore)}
                      </span>
                      <span className="rounded-md bg-white/50 p-2">
                        Shake
                        <br />
                        {fmt.format(shakeScore)}
                      </span>
                      <span className="rounded-md bg-white/50 p-2">
                        Combo
                        <br />
                        {fmt.format(comboBonus)}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {featuredBadges.length === 0 ? (
                        <span className="rounded-md bg-white/45 px-3 py-2 text-xs font-black">
                          Badge pending
                        </span>
                      ) : (
                        featuredBadges.map((badge) => (
                          <span
                            key={badge.id}
                            className={`proof-badge proof-${badge.tier}`}
                          >
                            <BadgeArt badge={badge} size={26} />
                          </span>
                        ))
                      )}
                    </div>
                    <div className="mt-4 rounded-md bg-black/75 p-3 text-sm font-black text-yellow-100">
                      Saving {selectedCountry} support record · room {roomCode}
                    </div>
                  </div>
                  {shareText && (
                    <p className="mt-3 text-xs leading-relaxed text-white/58">
                      {shareText}
                    </p>
                  )}
                </div>
              </div>

              <section className="grid gap-4">
                <div className="game-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white/60">
                      <Database className="h-4 w-4" /> open data prediction
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/62">
                        {dataStatus}
                      </span>
                      <button
                        onClick={() => void loadOpenData(true)}
                        disabled={loadingData}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-black text-stone-950 disabled:cursor-wait disabled:bg-white/30"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`}
                        />{" "}
                        Refresh results
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["upcoming", "Upcoming"],
                        ["today", "Today"],
                        ["all", "All"],
                      ] as Array<[MatchFilter, string]>
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setMatchFilter(value)}
                        className={`rounded-full px-3 py-2 text-xs font-black transition ${matchFilter === value ? "score-ribbon" : "border border-white/12 bg-white/[0.08] text-white/70 hover:bg-white/12"}`}
                      >
                        {label}
                      </button>
                    ))}
                    <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-black text-white/42">
                      {displayMatches.length} matches
                    </span>
                  </div>
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                        {displayMatches.slice(0, 24).map((match) => (
                          <button
                            key={match.id}
                            onClick={() => {
                              if (match.id !== selectedMatchId)
                                resetParticipationRun();
                              setSelectedMatchId(match.id);
                              trackEvent(
                                "roar_match_selected",
                                retentionAnalyticsProps({
                                  match_id: match.id,
                                  match_title: `${match.team1} vs ${match.team2}`,
                                  team_selected:
                                    selectedCountry === match.team1 ||
                                    selectedCountry === match.team2
                                      ? selectedCountry
                                      : match.team1,
                                }),
                              );
                              if (
                                selectedCountry !== match.team1 &&
                                selectedCountry !== match.team2
                              )
                                setSelectedCountry(match.team1);
                            }}
                            className={`team-ticket w-full p-3 text-left transition ${selectedMatchId === match.id ? "team-ticket-active" : "text-white hover:border-white/30"}`}
                          >
                            <div
                              className={`mb-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${matchPhase(match) === "live" ? "bg-red-400 text-white" : matchPhase(match) === "upcoming" ? "bg-emerald-300 text-emerald-950" : "bg-white/14 text-white/70"}`}
                            >
                              {matchPhaseLabel(match)}
                            </div>
                            <div className="text-xs font-black opacity-65">
                              {match.date} · {match.time ?? "TBD"} ·{" "}
                              {match.round}
                            </div>
                            <div className="mt-1 text-sm font-black">
                              {match.team1} vs {match.team2}
                            </div>
                            <div className="mt-1 text-[11px] font-black opacity-70">
                              Tap/shake always open ·{" "}
                              {canBetOnMatch(match)
                                ? "Betting open"
                                : "Betting closed"}
                            </div>
                          </button>
                        ))}
                        {displayMatches.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/52">
                            No matches for this filter.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/25 p-4 shadow-inner">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.15em] text-yellow-200">
                            {selectedMatch.group ?? selectedMatch.round}
                          </div>
                          <h2 className="mt-2 text-2xl font-black">
                            {selectedMatch.team1} vs {selectedMatch.team2}
                          </h2>
                          <p className="mt-1 text-sm text-white/58">
                            {selectedMatch.date} {selectedMatch.time ?? ""} ·{" "}
                            {selectedMatch.ground ?? "TBD"}
                          </p>
                          <p className="mt-2 text-xs font-black text-emerald-100/80">
                            Cheering is always open · predictions close at kickoff.
                          </p>
                        </div>
                        <div className="rounded-lg bg-black/25 p-3 text-center">
                          <CalendarDays className="mx-auto h-5 w-5 text-yellow-200" />
                          <div className="mt-1 text-xs font-black">
                            {matchPhaseLabel(selectedMatch)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <PredictionBar
                          label={selectedMatch.team1}
                          value={matchPrediction.team1}
                        />
                        <PredictionBar
                          label={t("draw")}
                          value={matchPrediction.draw}
                        />
                        <PredictionBar
                          label={selectedMatch.team2}
                          value={matchPrediction.team2}
                        />
                      </div>

                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        <MiniStat
                          label={`${selectedMatch.team1} recent form`}
                          value={`${matchPrediction.form1.points} pts / ${matchPrediction.form1.played} matches`}
                        />
                        <MiniStat
                          label={`${selectedMatch.team2} recent form`}
                          value={`${matchPrediction.form2.points} pts / ${matchPrediction.form2.played} matches`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="game-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-yellow-100">
                    <Target className="h-4 w-4" /> prediction picks
                  </div>
                  {!signedIn && (
                    <div className="roar-auth-gate-card mb-3">
                      <div>
                        <strong>Predictions unlock after sign in.</strong>
                        <span>
                          You can finish your first cheer run as a guest, then sign in to lock picks and keep results.
                        </span>
                      </div>
                      <div className="roar-auth-gate-actions">
                        <button
                          type="button"
                          onClick={() =>
                            promptRoarSignIn("prediction_pick", {
                              entry_point: "bets_tab_gate_desktop",
                            })
                          }
                        >
                          Sign in to predict
                        </button>
                        <button
                          type="button"
                          className="roar-auth-gate-secondary"
                          onClick={() => setCupTab("play")}
                        >
                          Keep cheering
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-black">Stake</span>
                      <span className="text-yellow-100">
                        {coinText(effectiveStake)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={maxStake}
                      step={10}
                      disabled={!signedIn || !selectedCanBet}
                      value={Math.min(stake, maxStake)}
                      onChange={(event) => setStake(Number(event.target.value))}
                      className="w-full accent-yellow-300 disabled:opacity-40"
                    />
                    <div className="mt-1 text-xs text-white/56">
                      {!signedIn
                        ? "Guest mode covers cheering only. Sign in to lock prediction picks and claim rewards."
                        : selectedCanBet
                        ? "1 support point earns 1 coin. Betting closes at kickoff. Correct picks pay 2x."
                        : "This match has started, so new bets are closed."}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <BetButton
                      label={selectedMatch.team1}
                      chance={matchPrediction.team1}
                      disabled={!signedIn || !selectedCanBet || coinBalance <= 0}
                      disabledReason={
                        !signedIn
                          ? "auth"
                          : !selectedCanBet
                          ? "closed"
                          : coinBalance <= 0
                            ? "coins"
                            : undefined
                      }
                      onClick={() => placeBet("team1")}
                      t={t}
                    />
                    <BetButton
                      label={t("draw")}
                      chance={matchPrediction.draw}
                      disabled={!signedIn || !selectedCanBet || coinBalance <= 0}
                      disabledReason={
                        !signedIn
                          ? "auth"
                          : !selectedCanBet
                          ? "closed"
                          : coinBalance <= 0
                            ? "coins"
                            : undefined
                      }
                      onClick={() => placeBet("draw")}
                      t={t}
                    />
                    <BetButton
                      label={selectedMatch.team2}
                      chance={matchPrediction.team2}
                      disabled={!signedIn || !selectedCanBet || coinBalance <= 0}
                      disabledReason={
                        !signedIn
                          ? "auth"
                          : !selectedCanBet
                          ? "closed"
                          : coinBalance <= 0
                            ? "coins"
                            : undefined
                      }
                      onClick={() => placeBet("team2")}
                      t={t}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {openBets.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/20 p-3 text-sm text-white/58">
                        No open bets yet.
                      </div>
                    ) : (
                      openBets.map((bet) => {
                        const betMatch =
                          matches.find((match) => match.id === bet.matchId) ??
                          selectedMatch;
                        const realOutcome = outcomeFromScore(betMatch);
                        const betCanSettle =
                          canSettleMatch(betMatch) && Boolean(realOutcome);
                        return (
                          <div
                            key={bet.id}
                            className="rounded-2xl border border-white/10 bg-black/25 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-black">
                                  {bet.pickLabel}
                                </div>
                                <div className="text-xs text-white/55">
                                  {coinText(bet.stake)} · 2x ·{" "}
                                  {betCanSettle
                                    ? "Result found"
                                    : canSettleMatch(betMatch)
                                      ? "Waiting for result"
                                      : "Pre-match / live"}
                                </div>
                              </div>
                              <button
                                onClick={() => settleBet(bet)}
                                disabled={!betCanSettle}
                                className="rounded-md bg-white px-3 py-2 text-xs font-black text-stone-950 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
                              >
                                {betCanSettle ? "Settle" : "Wait"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {settledBets.map((bet) => (
                      <div
                        key={bet.id}
                        className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-xs"
                      >
                        <span>
                          {bet.pickLabel} · {coinText(bet.stake)}
                        </span>
                        <span
                          className={
                            bet.status === "won"
                              ? "font-black text-yellow-200"
                              : "font-black text-red-200"
                          }
                        >
                          {bet.status === "won" ? "Won" : "Lost"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </section>

            <aside className="space-y-4">
              <div className="director-panel rounded-[18px] border border-yellow-300/25 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-yellow-100/70">
                      session rank
                    </div>
                    <div className="mt-1 text-xl font-black text-white">
                      {sessionTitle(impactPower)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-yellow-300 px-3 py-2 text-center text-stone-950">
                    <div className="text-[10px] font-black uppercase">hype</div>
                    <div className="text-lg font-black">LV.{hypeTier + 1}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <ProgressQuest
                    label="Next item"
                    value={nextDropProgress}
                    detail={`${fmt.format(totalScore)} / ${fmt.format(nextDropThreshold)} pts`}
                  />
                  <ProgressQuest
                    label={
                      hypeTier >= 5
                        ? "HYPE maxed"
                        : `Next HYPE: ${hypeLabel(hypeTier + 1)}`
                    }
                    value={nextHypeProgress}
                    detail={
                      hypeTier >= 5
                        ? "Keeping the stadium hot"
                        : `${fmt.format(totalScore)} / ${fmt.format(nextHypeTarget)} pts`
                    }
                  />
                  <ProgressQuest
                    label={
                      nextBadge
                        ? `Next badge: ${nextBadge.name}`
                        : "All badges complete"
                    }
                    value={Math.min(
                      100,
                      Math.round(
                        (nextBadgeProgress.current / nextBadgeProgress.goal) *
                          100,
                      ),
                    )}
                    detail={
                      nextBadge
                        ? `${nextBadgeProgress.current} / ${nextBadgeProgress.goal} · proof badge`
                        : "Proof complete"
                    }
                  />
                </div>
              </div>

              <div className="game-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white/60">
                    <Medal className="h-4 w-4" /> match records
                  </div>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-black text-white/62">
                    local
                  </span>
                </div>
                <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3">
                  <div className="text-xs font-black text-yellow-100/70">
                    Current team
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {selectedMatch.team1} vs {selectedMatch.team2}
                  </div>
                  <div className="mt-1 text-xs text-white/62">
                    {selectedCountry} · best{" "}
                    {currentRecord
                      ? compactFmt.format(currentRecord.impactPower)
                      : "record pending"}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {topRecords.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/15 p-3 text-sm text-white/48">
                      {t("noSavedRecords")}
                    </div>
                  ) : (
                    topRecords.map((record) => (
                      <div key={record.id} className="team-ticket px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-black">
                            {record.country}
                          </span>
                          <span className="text-xs font-black text-yellow-100">
                            {compactFmt.format(record.impactPower)}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-[11px] text-white/52">
                          {record.matchLabel} · taps {fmt.format(record.taps)} ·
                          shakes {fmt.format(record.shakes)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="game-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-yellow-100">
                    <Trophy className="h-4 w-4" /> badge vault
                  </div>
                  <span className="rounded-md bg-yellow-300/15 px-2 py-1 text-xs font-black text-yellow-100">
                    {earnedBadges.length}/{BADGES.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BADGES.map((badge) => {
                    const earned = earnedBadgeIds.includes(badge.id);
                    return (
                      <div
                        key={badge.id}
                        className={`badge-card badge-${badge.tier} ${earned ? "badge-earned" : "badge-locked"}`}
                      >
                        <div className="badge-medal">
                          {earned ? <BadgeArt badge={badge} size={40} /> : "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black">
                            {badge.name}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-tight text-white/58">
                            {badge.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="game-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-yellow-100">
                  <Gift className="h-4 w-4" /> daily loop
                </div>
                <button
                  onClick={claimDailyCheckIn}
                  disabled={daily.claimedCheckIn}
                  className="mb-3 w-full rounded-lg bg-yellow-300 px-3 py-3 text-sm font-black text-stone-950 transition enabled:hover:bg-yellow-200 disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/42"
                >
                  {daily.claimedCheckIn
                    ? "Daily check-in claimed"
                    : "Claim daily 100 coins"}
                </button>
                <div className="space-y-2">
                  {DAILY_QUESTS.map((quest) => {
                    const progress = quest.progress(daily);
                    const complete = progress >= quest.goal;
                    const claimed = daily.questClaims[quest.id];
                    return (
                      <div
                        key={quest.id}
                        className="rounded-2xl border border-white/10 bg-black/25 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                          <span className="font-black">{quest.label}</span>
                          <span className="text-xs text-yellow-100">
                            {Math.min(progress, quest.goal)} / {quest.goal}
                          </span>
                        </div>
                        <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-yellow-300 transition-all"
                            style={{
                              width: `${Math.min(100, Math.round((progress / quest.goal) * 100))}%`,
                            }}
                          />
                        </div>
                        <button
                          onClick={() => claimQuest(quest.id, quest.reward)}
                          disabled={!complete || claimed}
                          className="w-full rounded-md bg-white px-2 py-2 text-xs font-black text-stone-950 transition enabled:hover:bg-yellow-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/38"
                        >
                          {claimed
                            ? "Claimed"
                            : complete
                              ? `Claim ${coinText(quest.reward)}`
                              : `${coinText(quest.reward)} pending`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="game-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white/60">
                  <Gauge className="h-4 w-4" /> rivalry board
                </div>
                <Versus
                  label={selectedCountry}
                  value={allyTotal}
                  percent={possession}
                  color="bg-red-400"
                />
                <Versus
                  label={opponentCountry}
                  value={rivalTotal}
                  percent={100 - possession}
                  color="bg-sky-400"
                />
                <div className="mt-4 rounded-lg bg-black/25 p-3 text-sm text-white/70">
                  Your selected country owns the support share, and every action
                  is saved into that match record.
                </div>
              </div>

              <div className="game-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white/60">
                  <Medal className="h-4 w-4" /> Random drops
                </div>
                <div className="space-y-2">
                  {drops.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/20 p-4 text-sm text-white/52">
                      Titles start dropping after 120 points.
                    </div>
                  ) : (
                    drops.map((drop) => (
                      <div
                        key={drop.id}
                        className={`drop-chip drop-${drop.rarity}`}
                      >
                        <div>
                          <div className="font-black">{drop.name}</div>
                          <div className="text-[11px] text-white/58">
                            {drop.power}
                          </div>
                        </div>
                        <span className="text-xs font-black uppercase text-yellow-200">
                          +{drop.reward}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="game-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white/60">
                  <Activity className="h-4 w-4" /> live bursts
                </div>
                <div className="space-y-2">
                  {feed.map((item) => (
                    <div
                      key={item.id}
                      className={`feed-item feed-${item.tone}`}
                    >
                      <div className="font-black">{item.title}</div>
                      <div className="mt-1 text-xs leading-relaxed text-white/62">
                        {item.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}

function RoarBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "roar-brand roar-brand-compact" : "roar-brand"}>
      <Image
        src={`${BRAND_ASSETS}roar-emblem.png`}
        alt=""
        width={compact ? 26 : 42}
        height={compact ? 26 : 42}
      />
      <span>ROAR</span>
    </span>
  );
}

function CoinIcon({ size = 20 }: { size?: number }) {
  return (
    <Image
      src={`${BETTING_ASSETS}coin-icon.png`}
      alt=""
      width={size}
      height={size}
      className="coin-icon-img"
    />
  );
}

function CoinAmount({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={`coin-amount ${className}`}>
      <CoinIcon size={22} />
      <b>{formatter.format(Math.max(0, Math.floor(value)))}</b>
    </span>
  );
}

function FlagMark({
  country,
  large = false,
}: {
  country: string;
  large?: boolean;
}) {
  const [from, to] = colorsFor(country);
  return (
    <span
      className={`flag-mark ${large ? "flag-mark-large" : ""}`}
      style={{ "--flag-from": from, "--flag-to": to } as CSSProperties}
      aria-label={`${country} flag`}
    >
      <span>{flagFor(country)}</span>
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-black/22 px-3 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white/48">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-white">
        {formatter.format(value)}
      </div>
    </div>
  );
}

function MiniMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#2c438e] p-4">
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-2 text-sm font-black text-white/58">{label}</div>
    </div>
  );
}

function MiniMatchCard({
  match,
  active,
  scoreA,
  scoreB,
  onClick,
  t = (key: string) => I18N.en[key] ?? key,
}: {
  match: CupMatch;
  active: boolean;
  scoreA: number;
  scoreB: number;
  onClick: () => void;
  t?: Translator;
}) {
  const [leftFrom, leftTo] = colorsFor(match.team1);
  const [rightFrom, rightTo] = colorsFor(match.team2);
  const phase = matchPhaseLabel(match);
  const isLive = matchPhase(match) === "live";
  return (
    <button
      onClick={onClick}
      className={`mini-match-card ${active ? "mini-match-active" : ""}`}
    >
      <div
        className="mini-match-banner"
        style={
          {
            "--left-from": leftFrom,
            "--left-to": leftTo,
            "--right-from": rightFrom,
            "--right-to": rightTo,
          } as CSSProperties
        }
      >
        <FlagMark country={match.team1} />
        <span className="mini-play-pill">
          {active ? t("playing") : t("play")}
        </span>
        <FlagMark country={match.team2} />
      </div>
      <div className="mini-match-body">
        <div className="mini-match-team min-w-0 text-left">
          <div className="mini-match-team-name">{match.team1}</div>
          <div className="mini-match-score">{bigNumber.format(scoreA)}</div>
        </div>
        <div className="mini-match-vs">VS</div>
        <div className="mini-match-team min-w-0 text-right">
          <div className="mini-match-team-name">{match.team2}</div>
          <div className="mini-match-score">{bigNumber.format(scoreB)}</div>
        </div>
      </div>
      <div className="mini-match-meta">
        <span
          className={`mini-match-phase ${isLive ? "mini-match-phase-live" : ""}`}
        >
          {phase}
        </span>
        <span>
          {match.date} · {match.time ?? "TBD"}
        </span>
        <span>
          {canBetOnMatch(match) ? t("bettingOpen") : t("bettingClosed")}
        </span>
      </div>
    </button>
  );
}

function ScoreCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "green" | "yellow";
}) {
  const toneClass = {
    red: "border-red-300/30 bg-red-400/12 text-red-100",
    green: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
    yellow: "border-yellow-300/30 bg-yellow-300/12 text-yellow-100",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-sm font-black">{label}</div>
      <div className="mt-2 text-3xl font-black">{formatter.format(value)}</div>
    </div>
  );
}

function Meter({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Flame;
}) {
  return (
    <div className="rounded-lg bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-black text-white/62">
        <span className="inline-flex items-center gap-1">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-yellow-300 transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Versus({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  color: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-black">{label}</span>
        <span className="text-white/70">
          {formatter.format(value)} / {percent}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PredictionBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-black">{label}</span>
        <span className="text-yellow-100">{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-yellow-300 transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/24 p-3">
      <div className="text-xs font-black text-white/48">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

function ProgressQuest({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-lg bg-black/24 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-black text-white">{label}</span>
        <span className="text-xs font-black text-yellow-100">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-yellow-300 transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-white/54">{detail}</div>
    </div>
  );
}

function BetButton({
  label,
  chance,
  country,
  disabled,
  disabledReason,
  onClick,
  t = (key: string) => I18N.en[key] ?? key,
}: {
  label: string;
  chance: number;
  country?: string;
  disabled?: boolean;
  disabledReason?: "auth" | "closed" | "coins";
  onClick: () => void;
  t?: Translator;
}) {
  const statusText =
    disabledReason === "auth"
      ? "Sign in"
      : disabledReason === "closed"
      ? t("closed")
      : disabledReason === "coins"
        ? t("needCoins")
        : t("pick");
  return (
    <button onClick={onClick} disabled={disabled} className="bet-pick-button">
      <span className="bet-pick-label">
        {country && <FlagMark country={country} />}
        <span className="bet-pick-name">{label}</span>
      </span>
      <span className="bet-pick-meta">
        <b>{chance}%</b>
        <small>{t("prob")}</small>
      </span>
      <span className="bet-pick-meta">
        <b>2x</b>
        <small>{t("returnRate")}</small>
      </span>
      <span className="bet-pick-cta">{statusText}</span>
    </button>
  );
}

function ItemReveal({ item }: { item: Drop }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-5">
      <div className={`item-reveal item-${item.rarity}`}>
        <div className="text-xs font-black uppercase tracking-[0.24em] text-white/70">
          item drop
        </div>
        <div className="mt-3 text-3xl font-black sm:text-5xl">{item.name}</div>
        <div className="mt-2 text-sm font-black text-yellow-100">
          {item.power}
        </div>
        <div className="mt-5 inline-flex rounded-full bg-black/35 px-5 py-2 text-xl font-black text-yellow-200">
          BOOST
        </div>
      </div>
    </div>
  );
}

function MiniMascot({ pose }: { pose: MascotPose }) {
  return (
    <div
      className={`mini-mascot-avatar mini-mascot-${pose}`}
      aria-hidden="true"
    >
      <Image
        src={`/mini-cup/assets/mascot/mascot-${pose}.png`}
        alt=""
        width={86}
        height={86}
        className="mini-mascot-sprite"
      />
    </div>
  );
}

function ResultRevealOverlay({
  reveal,
  onShare,
  onReplay,
  onClose,
  onClaim,
  t = (key: string) => I18N.en[key] ?? key,
}: {
  reveal: ResultReveal;
  onShare: () => void;
  onReplay: () => void;
  onClose: () => void;
  onClaim: () => void;
  t?: Translator;
}) {
  const hero =
    reveal.tone === "victory" ? "victory-hero.webp" : "defeat-hero.webp";
  const canClaim =
    reveal.tone === "victory" && (reveal.payout ?? 0) > 0 && !reveal.claimed;
  return (
    <div className="result-reveal-overlay">
      <div className={`result-reveal-card result-${reveal.tone}`}>
        <Image
          src={`/mini-cup/assets/result/${hero}`}
          alt=""
          fill
          sizes="min(100vw, 560px)"
          className="object-cover"
          priority
        />
        <div className="result-reveal-shade" />
        <button
          type="button"
          className="result-close"
          onClick={onClose}
          aria-label={t("closed")}
        >
          ×
        </button>
        <div className="result-reveal-content">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-white/68">
            {reveal.matchLabel}
          </div>
          <div className="mt-2 text-6xl font-black text-white">
            {reveal.scoreLine}
          </div>
          <h2>{reveal.title}</h2>
          <p>{reveal.body}</p>
          {reveal.tone === "victory" && (
            <button
              type="button"
              className={`result-claim ${canClaim ? "" : "result-claim-done"}`}
              onClick={onClaim}
              disabled={!canClaim}
            >
              <span className="result-claim-chest" aria-hidden="true" />
              {canClaim ? (
                <span className="result-claim-label">
                  {t("claim")} <CoinAmount value={reveal.payout ?? 0} />
                </span>
              ) : (
                t("payoutClaimed")
              )}
            </button>
          )}
          <div className="result-actions">
            <button type="button" onClick={onShare}>
              {t("shareProof")}
            </button>
            <button type="button" onClick={onReplay}>
              {t("playAgain")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BetRevealToast({
  reveal,
  t = (key: string) => I18N.en[key] ?? key,
}: {
  reveal: BetReveal;
  t?: Translator;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-5">
      <div className={`bet-reveal bet-reveal-${reveal.tone}`}>
        {(reveal.tone === "placed" || reveal.tone === "blocked") && (
          <span className="bet-ticket-art" aria-hidden="true" />
        )}
        {reveal.tone === "won" && (
          <>
            <span className="bet-payout-chest" aria-hidden="true" />
            <span className="bet-coin-shower" aria-hidden="true" />
          </>
        )}
        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/68">
          {reveal.tone === "won"
            ? t("payout")
            : reveal.tone === "lost"
              ? t("settled")
              : reveal.tone === "cheer"
                ? t("contributionToast")
                : t("prediction")}
        </div>
        <div className="mt-1 text-2xl font-black">{reveal.title}</div>
        <div className="mt-1 text-sm font-black text-white/72">
          {reveal.body}
        </div>
      </div>
    </div>
  );
}

function SessionSummaryOverlay({
  summary,
  fmt,
  onClose,
  onShare,
}: {
  summary: SessionSummary;
  fmt: Intl.NumberFormat;
  onClose: () => void;
  onShare: () => void;
}) {
  return (
    <div className="session-summary-overlay">
      <div className="session-summary-card">
        <div className="session-summary-eyebrow">RUN COMPLETE</div>
        <h2>{summary.country} got louder.</h2>
        <p>
          Loudness #{Math.max(1, summary.boardIcons + 1)} · +
          {fmt.format(summary.roar)} roar · best combo ×
          {summary.bestMultiplier.toFixed(1)} · coins +
          {fmt.format(summary.coinsEarned)}
        </p>
        <div className="session-summary-stats">
          <span>
            <b>{fmt.format(summary.roar)}</b>
            <em>roar</em>
          </span>
          <span>
            <b>×{summary.bestMultiplier.toFixed(1)}</b>
            <em>best combo</em>
          </span>
          <span>
            <b>{fmt.format(summary.coinsEarned)}</b>
            <em>coins earned</em>
          </span>
          <span>
            <b>×{summary.boardIcons}</b>
            <em>board icons</em>
          </span>
        </div>
        <div className="session-summary-actions">
          <button type="button" onClick={onShare}>
            Share proof
          </button>
          <button type="button" onClick={onClose}>
            Keep playing
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalRevealBanner({ reveal }: { reveal: GoalReveal }) {
  return (
    <div className={`goal-reveal-banner goal-reveal-${reveal.tone}`}>
      <div className="goal-reveal-card">
        <span>{flagFor(reveal.country)}</span>
        <strong>{reveal.title}</strong>
        <em>{reveal.scoreLine}</em>
        <p>{reveal.body}</p>
      </div>
    </div>
  );
}

function BadgeArt({ badge, size }: { badge: Badge; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="badge-art"
      style={{ width: size, height: size } as CSSProperties}
    >
      <span className="badge-art-fallback">{badge.icon}</span>
      {badge.image && !failed && (
        <Image
          src={badge.image}
          alt={badge.name}
          width={size}
          height={size}
          unoptimized
          className="badge-art-img"
          style={{ width: size, height: size }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function BadgeReveal({
  badge,
  t = (key: string) => I18N.en[key] ?? key,
  badgeName = (item: Badge) => item.name,
  badgeDescription = (item: Badge) => item.description,
}: {
  badge: Badge;
  t?: Translator;
  badgeName?: (badge: Badge) => string;
  badgeDescription?: (badge: Badge) => string;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-5">
      <div className={`badge-reveal reveal-${badge.tier}`}>
        <div className="badge-reveal-medal">
          <BadgeArt badge={badge} size={76} />
        </div>
        <div className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-white/70">
          {t("badgeEarned")}
        </div>
        <div className="mt-2 text-3xl font-black sm:text-5xl">
          {badgeName(badge)}
        </div>
        <div className="mt-2 text-sm font-black text-yellow-100">
          {badgeDescription(badge)}
        </div>
        <div className="mt-5 inline-flex rounded-full bg-black/35 px-5 py-2 text-xl font-black text-yellow-200">
          {t("saved")}
        </div>
      </div>
    </div>
  );
}

function RankReveal({
  rank,
  t = (key: string) => I18N.en[key] ?? key,
}: {
  rank: (typeof ROAR_RANKS)[number];
  t?: Translator;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-5">
      <div className={`rank-reveal rank-reveal-${rank.id}`}>
        <Image
          src={
            rank.id === "legend"
              ? `${MASCOT_ASSETS}roari-legend.png`
              : rank.image
          }
          alt=""
          width={150}
          height={150}
          className="rank-reveal-art"
        />
        <div className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-yellow-100/80">
          {t("rankUp")}
        </div>
        <div className="mt-1 text-4xl font-black sm:text-6xl">
          {t(rankCopyKey(rank.id, "name"))}
        </div>
        <div className="mt-2 text-sm font-black text-white/76">
          {t(rankCopyKey(rank.id, "tone"))}
        </div>
      </div>
    </div>
  );
}

function Burst() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          className="confetti"
          style={{
            left: `${8 + ((index * 23) % 84)}%`,
            animationDelay: `${((index * 37) % 25) / 100}s`,
            background: ["#facc15", "#ef4444", "#22c55e", "#ffffff"][index % 4],
          }}
        />
      ))}
    </div>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
