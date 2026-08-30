/* 영어 번역표 — 키는 한국어 원문. 숫자는 %1,%2… 자리표로 정규화된다.
   ⚠ 표에 없으면 원문 그대로 나간다. 비어 있어도 게임은 안 깨진다.
   ⚠ 사람 이름은 번역하지 않는다 — 영어판은 NAME_EN 풀만 쓴다(30_athlete.js).
      "출전: A, B" 처럼 뒤가 데이터인 문장은 I18N_PREFIX 로 앞머리만 바꾼다. */
'use strict';

/* 앞머리만 바꾸는 것들 (뒤는 선수 이름·목록) */
const I18N_PREFIX = {
  '출전: ' : 'Entered: ',
  '%1위 '  : '#%1 ',
};

const I18N_EN = {
  /* ── 타이틀 · 공통 ── */
  '육상부 감독이 되어 선수를 키운다': 'Coach a track club and raise your athletes',
  '이어하기': 'Continue', '저장된 클럽으로 계속': 'Resume your saved club',
  '새 클럽 시작': 'New Club', '신인 %1명으로 처음부터': 'Start fresh with %1 rookies',
  '직접 뛰기': 'Play Yourself', '아케이드 모드 — 내가 조작한다': 'Arcade mode — you run it',
  '▲▼ 이동 · 확인 선택   |   조작 방식은 P 에서 바꿉니다':
    '▲▼ Move · Confirm to select   |   Press P to change controls',
  '종목 선택': 'Choose Event',
  '← → 로 고르고 SPACE 로 시작': '← → to choose, SPACE to start',
  '아직 준비 중인 종목입니다': 'This event is not ready yet',
  '준비 중': 'Coming soon',
  '기록 없음': 'No record', '아직 없음': 'None yet', '없음': 'None',
  '확인 선택   취소 돌아가기': 'Confirm select   Cancel back',
  '확인/취소 돌아가기': 'Confirm/Cancel to go back',
  '취소 돌아가기': 'Cancel to go back',
  '▲▼ 이동   확인 선택': '▲▼ Move   Confirm select',
  '▲▼ 이동   확인 선택   취소 돌아가기': '▲▼ Move   Confirm select   Cancel back',
  '확인 자세히   취소 돌아가기': 'Confirm details   Cancel back',
  '확인 상세   취소 돌아가기': 'Confirm details   Cancel back',
  '확인 지정   취소 돌아가기': 'Confirm assign   Cancel back',
  '확인 지도 지정   취소 돌아가기': 'Confirm coaching   Cancel back',
  '확인 파견   취소 돌아가기': 'Confirm dispatch   Cancel back',
  '확인 방출   취소 돌아가기': 'Confirm release   Cancel back',
  '확인 건너뛰기': 'Confirm skip', '확인 계속': 'Confirm continue',

  /* ── 종목 이름 ── */
  '%1m 달리기': '%1m Sprint', '%1m 허들': '%1m Hurdles', '%1km 경보': '%1km Race Walk',
  '%1×%2m 계주': '%1×%2m Relay',
  '멀리뛰기': 'Long Jump', '세단뛰기': 'Triple Jump', '높이뛰기': 'High Jump',
  '장대높이뛰기': 'Pole Vault', '포환던지기': 'Shot Put', '원반던지기': 'Discus',
  '창던지기': 'Javelin', '해머던지기': 'Hammer Throw',
  '자유형 %1m': '%1m Freestyle', '배영 %1m': '%1m Backstroke',
  '평영 %1m': '%1m Breast', '접영 %1m': '%1m Butterfly',
  '자유형': 'Freestyle', '배영': 'Backstroke', '평영': 'Breaststroke', '접영': 'Butterfly',

  /* ── 경기 중 ── */
  '제자리에': 'On your marks', '총성을 기다리세요': 'Wait for the gun',
  '부정출발': 'False start', '파울': 'Foul', '실패': 'Failed',
  '다음': 'Next', '오른발 ▶': 'Right foot ▶', '왼발 ◀': '◀ Left foot',
  '빠름': 'Early', '늦음': 'Late', '폼': 'Form', '힘': 'Power',
  '기준 %1초': 'Target %1s', '기준 %1m': 'Target %1m', '%1초': '%1s',
  '%1차': 'Attempt %1', '%1차 -': 'Attempt %1 -', '시기': 'Attempt',
  '회전': 'Spin', '주자': 'Runner', '연타 금지': 'No mashing',
  '좌·우를 번갈아 두드려 회전을 올리세요': 'Alternate left/right to build spin',
  '각도 — 초록에서 액션': 'Angle — act on green',
  '각도 %1° — 초록에서 놓기': 'Angle %1° — release on green',
  '초록 구간에서 액션': 'Act in the green zone',
  '구름판까지 %1m': '%1m to the board', '파울선까지 %1m': '%1m to the foul line',
  '박스까지 %1m': '%1m to the box', '바 높이': 'Bar height',
  '기록은 구름판부터 잽니다 — 일찍 뛰면 손해': 'Measured from the board — jumping early costs you',
  '조주 중…': 'Approaching…', '속도가 곧 높이입니다': 'Speed becomes height',
  '좌·우로 몸을 비틀고, 액션을 쥐었다 놓으세요': 'Twist left/right, then hold and release action',

  /* ── 스탯 · 상태 ── */
  '스피드': 'Speed', '가속': 'Acceleration', '지구력': 'Stamina',
  '기술': 'Technique', '파워': 'Power', '리듬': 'Rhythm',
  '컨디션': 'Condition', '피로': 'Fatigue', '사기': 'Morale', '특성': 'Traits',
  '개인 최고': 'Personal best', '좋음': 'Good', '보통': 'Average',
  '컨디션 좋음': 'Condition good', '컨디션 보통': 'Condition average',
  '단거리': 'Sprint', '허들': 'Hurdles', '중거리': 'Middle', '장거리': 'Distance',
  '도약': 'Jumps', '투척': 'Throws', '수영': 'Swim',
  '(부상)': '(injured)', '부상': 'Injuries', '회복 %1': 'Recovery %1',
  'OVR %1 / 잠재 %2': 'OVR %1 / POT %2', '/ 잠재 %1': '/ POT %1',
  'OVR %1 / 잠재 %2 · 주급 %3': 'OVR %1 / POT %2 · Wage %3',
  '피로 %1': 'Fatigue %1', '부하 %1': 'Load %1', '부하 +%1': 'Load +%1',
  '단거리 · OVR %1 · 피로 %2': 'Sprint · OVR %1 · Fatigue %2',
  '허들 · OVR %1 · 피로 %2': 'Hurdles · OVR %1 · Fatigue %2',
  '투척 · OVR %1 · 피로 %2': 'Throws · OVR %1 · Fatigue %2',
  '주 종목 %1M': 'Main event %1m', '주 종목 %1MH': 'Main event %1mH',

  /* ── 성장 · 등급 · 특성 ── */
  '표준': 'Standard', '조숙': 'Early bloomer', '대기만성': 'Late bloomer',
  '%1세 · 표준': 'Age %1 · Standard', '%1세 · 조숙': 'Age %1 · Early bloomer',
  '%1세 · 대기만성': 'Age %1 · Late bloomer',
  '★☆☆☆☆ 흔함': '★☆☆☆☆ Common', '★★☆☆☆ 우수': '★★☆☆☆ Fine',
  '★★★☆☆ 정예': '★★★☆☆ Elite', '★★★★☆ 걸출': '★★★★☆ Superb',
  '★★★★★ 전설': '★★★★★ Legendary',
  '특성 없음': 'No traits',
  '메트로놈': 'Metronome', '리듬이 흔들리지 않는다': 'Their rhythm never wavers',
  '새가슴': 'Nervy', '큰 경기에서 약하다': 'Falters in big meets',
  '대포팔': 'Cannon arm', '던지기가 강하다': 'A powerful thrower',
  '출발 특화': 'Quick starter', '반응이 빠르다': 'Reacts fast',
  '뒷심': 'Strong finisher', '영리하게 페이스를 나눈다': 'Paces the race cleverly',
  '허들 감각': 'Hurdle sense', '튀어오르듯 넘는다': 'Skims over the barriers',
  '지치지 않음': 'Tireless', '하루 종일 달릴 수 있다': 'Could run all day',
  '바닥나지 않는다': 'Never runs dry',
  '가볍고 우아하다': 'Light and graceful',

  /* ── 감독 사무소 ── */
  '선수 사무소': 'Club Office', '서울 트랙 클럽': 'Seoul Track Club',
  '%1년차 · %2 / %3주': 'Year %1 · Week %2 / %3',
  '%1년차 · %2주': 'Year %1 · Week %2', '%1년차': 'Year %1', '%1주차': 'Week %1',
  '■ 대회 주': '■ Meet week', '승점': 'Points', '메달': 'Medals',
  '획득 승점': 'Points earned', '자금': 'Funds', '자금 %1': 'Funds %1',
  '%1명': '%1 athletes', '%1명 · 부상 %2명': '%1 athletes · %2 injured',
  '다음 주로': 'Next week', '%1주차 대회까지 %2주': '%1 weeks to the Week %2 meet',
  '훈련 지시': 'Training', '선수단': 'Squad', '팀 프로그램': 'Team Program',
  '이번 주 직접 지도 %1 / %2': 'Hands-on coaching %1 / %2 this week',
  '직접 지도 %1 / %2': 'Hands-on %1 / %2',
  '감독 노트': "Coach's notes",
  '매주 %1명까지 직접 지도할 수 있습니다. 나머지는 팀 프로그램대로 훈련합니다.':
    'You may coach up to %1 athletes each week. The rest follow the team program.',
  '피로가 쌓이면 성장이 멈추고 부상이 급증합니다 — 대회 직전엔 쉬게 하세요.':
    'Fatigue stalls growth and invites injury — rest them before a meet.',
  '지도하지 않은 선수는 팀 프로그램대로 훈련합니다':
    'Athletes you do not coach follow the team program',
  '기록실': 'Records', '클럽 기록과 대회 이력': 'Club bests and meet history',
  '클럽 기록': 'Club records', '대회 이력': 'Meet history',
  '출전표를 짜고 경기를 본다': 'Set your entries and watch the meet',

  /* ── 훈련 프로그램 ── */
  '균형': 'Balanced', '모든 스탯을 고르게': 'Every stat, evenly',
  '균형 — 모든 스탯을 고르게': 'Balanced — every stat, evenly',
  '팀 프로그램: 균형': 'Team program: Balanced',
  '스피드·가속': 'Speed · Acceleration', '스피드·가속 집중': 'Focus on speed and acceleration',
  '지구력·리듬': 'Stamina · Rhythm', '지구력·리듬. 피로가 적다': 'Stamina and rhythm. Less fatigue',
  '기술·리듬': 'Technique · Rhythm', '기술·리듬. 성장은 느리다': 'Technique and rhythm. Slower growth',
  '파워·가속': 'Power · Acceleration', '파워 집중. 피로가 크다': 'Focus on power. Heavy fatigue',
  '시즌 내내 적용': 'Applies all season',
  '부하가 높으면 빨리 크지만 피로·부상이 늘어납니다':
    'Higher load grows them faster but brings fatigue and injury',
  '휴식': 'Rest', '피로를 크게 회복한다': 'Recovers a lot of fatigue',
  '치료·관리': 'Treatment', '부상 회복이 %1배 빨라진다': 'Injury recovery is %1× faster',

  /* ── 이적 시장 ── */
  '자금 %1 · 스카우트·영입·이적': 'Funds %1 · Scout, sign, transfer',
  '스카우트 파견': 'Send Scouts', '영입 후보': 'Prospects',
  '이적 제안': 'Transfer offers', '선수 방출': 'Release',
  '주간 수입': 'Weekly income', '주급 지출': 'Wage bill', '수지': 'Balance', '명성': 'Reputation',
  '파견 중 %1 / %2': 'Out scouting %1 / %2',
  '동시에 %1명까지 · 지금 %2명 파견 중': 'Up to %1 at once · %2 out now',
  '스카우트를 보내야 후보가 생깁니다': 'Send a scout to find prospects',
  '받은 제안 없음': 'No offers received',
  '국내': 'Domestic', '아시아': 'Asia', '세계': 'Worldwide',
  '유소년': 'Youth', '최고 등급 가능': 'Top grades possible',
  '%1주 소요 · 즉시 전력 위주': 'Takes %1 weeks · ready-now athletes',
  '%1주 소요 · 어린 선수 위주 (잠재력 편차 큼)':
    'Takes %1 weeks · young athletes (wide potential spread)',
  '멀리 보낼수록 좋은 선수를 찾지만 오래 걸리고 비쌉니다.':
    'Scouting farther finds better athletes, but costs more and takes longer.',
  '정보 ●●● 가 채워질수록 실제 능력에 가깝습니다. 기다릴수록 드러나지만 뺏길 수도 있습니다.':
    'The more ●●● you have, the truer the numbers. Wait longer and they sharpen — but a rival may sign them.',
  '자금 %1 · 선수단 %2/%3': 'Funds %1 · Squad %2/%3',
  '주축을 팔면 자금이 생기지만 남은 선수들의 사기가 떨어집니다.':
    'Selling a key athlete raises funds but lowers the squad’s morale.',
  '선수단 %1 (최소 %2)': 'Squad %1 (min %2)',
  '선수단을 정리한다 (몸값의 %1%만 회수)': 'Trim the squad (recover only %1% of value)',
  '방출하면 주급이 줄지만 몸값의 %1%만 회수됩니다. 되돌릴 수 없습니다.':
    'Releasing cuts wages but recovers only %1% of value. This cannot be undone.',
  '수지가 마이너스면 자금이 계속 줄어듭니다. 선수단이 클수록 주급이 큽니다.':
    'A negative balance drains your funds. A bigger squad means a bigger wage bill.',

  /* ── 대회 ── */
  '지역 대회': 'Regional Meet', '초청 경기': 'Invitational', '시즌 챔피언십': 'Season Championship',
  '지역 대회 결과': 'Regional Meet — Results',
  '초청 경기 결과': 'Invitational — Results',
  '시즌 챔피언십 결과': 'Season Championship — Results',
  '지역 대회 · %1/%2': 'Regional Meet · %1/%2',
  '초청 경기 · %1/%2': 'Invitational · %1/%2',
  '시즌 챔피언십 · %1/%2': 'Season Championship · %1/%2',
  '▶ 지역 대회 출전': '▶ Enter the Regional Meet',
  '▶ 초청 경기 출전': '▶ Enter the Invitational',
  '▶ 시즌 챔피언십 출전': '▶ Enter the Season Championship',
  '%1주차 · 종목당 %2명': 'Week %1 · %2 per event',
  '시즌 승점 %1 · 금 %2 은 %3 동 %4': 'Season %1 pts · %2 gold %3 silver %4 bronze',
  '출전 선수가 없습니다': 'No athletes entered',
  '자동 편성했습니다': 'Entries filled automatically',

  /* ── 종족 50종 ── */
  '치타':'Cheetah', '그레이하운드':'Greyhound', '토끼':'Rabbit', '타조':'Ostrich',
  '가지뿔영양':'Pronghorn', '산토끼':'Hare', '자칼':'Jackal', '로드러너':'Roadrunner',
  '말':'Horse', '여우':'Grey Fox', '가젤':'Gazelle', '칼새':'Swift', '임팔라':'Impala',
  '캥거루':'Kangaroo', '개구리':'Frog', '스프링복':'Springbok', '스라소니':'Lynx',
  '사슴':'Deer', '서벌':'Serval', '왈라비':'Wallaby', '늑대':'Wolf', '허스키':'Husky',
  '낙타':'Camel', '순록':'Caribou', '영양':'Antelope', '하이에나':'Hyena',
  '알바트로스':'Albatross', '개미':'Ant', '다람쥐':'Squirrel', '벼룩':'Flea',
  '산양':'Ibex Goat', '메뚜기':'Grasshopper', '아이벡스':'Ibex', '저비':'Jerboa',
  '원숭이':'Monkey', '여우원숭이':'Lemur', '퓨마':'Puma', '귀뚜라미':'Cricket',
  '돌고래':'Dolphin', '코끼리':'Elephant', '고릴라':'Gorilla', '하마':'Hippo',
  '곰':'Bear', '문어':'Octopus', '코뿔소':'Rhino', '들소':'Bison', '게':'Crab',
  '독수리':'Eagle', '사마귀':'Mantis', '바다코끼리':'Walrus',

  /* ── 종족 한 줄 설명 ── */
  '순간 속도는 따라올 종이 없다':'No species matches that top-end speed',
  '출발이 폭발적이다':'An explosive start',
  '속도와 지구력을 함께 갖췄다':'Speed and stamina in one frame',
  '오래 빠르게 달린다':'Fast for a very long way',
  '지그재그로 치고 나간다':'Breaks away in zigzags',
  '끈질기게 따라붙는다':'Hangs on relentlessly',
  '발이 땅에 안 닿는 것 같다':'Barely seems to touch the ground',
  '보폭이 압도적이다':'An overwhelming stride',
  '멈추는 법을 모른다':'Does not know how to stop',
  '장애물 감각이 타고났다':'Born with a feel for barriers',
  '뛰어넘는 데 특화됐다':'Built to bound over things',
  '짧은 도약이 정확하다':'Precise on short leaps',
  '착지가 소리 없다':'Lands without a sound',
  '겁이 많지만 잘 넘는다':'Skittish, but clears well',
  '다리가 길어 허들이 낮다':'Long legs make the hurdles low',
  '작지만 리듬이 좋다':'Small, but wonderfully rhythmic',
  '지치는 걸 즐긴다':'Seems to enjoy being tired',
  '먼 길을 아는 다리':'Legs that know long roads',
  '꾸준하다':'Steady',
  '끝까지 물고 늘어진다':'Never lets go of the pace',
  '멈추지 않는 법을 안다':'Knows how not to stop',
  '체구 대비 지구력이 비상식적이다':'Absurd endurance for its size',
  '몸놀림이 가볍다':'Light on its feet',
  '체구 대비 폭발력이 비상식적이다':'Absurd power for its size',
  '높이 뛰는 데 두려움이 없다':'No fear of height',
  '한 번에 멀리 간다':'Covers ground in one go',
  '절벽에서도 뛴다':'Leaps even off cliffs',
  '작고 튀어오른다':'Tiny, and springs high',
  '공중에서 자세를 잡는다':'Sets its shape in mid-air',
  '세 번 연속으로 뛴다':'Bounds three times in a row',
  '도약 거리가 비현실적이다':'An unreal leap',
  '가볍게 튄다':'Springs lightly',
  '물 밖에서도 솟구친다':'Surges even out of water',
  '던지는 힘이 압도적이다':'Overwhelming throwing power',
  '회전력이 좋다':'Generates fine rotation',
  '무게로 던진다':'Throws with sheer mass',
  '팔이 많아 자세가 정교하다':'So many arms, such precise form',
  '밀어내는 힘이 무섭다':'A frightening push',
  '어깨가 산 같다':'Shoulders like a mountain',
  '집게가 회전을 만든다':'Its claws create the spin',
  '멀리 보고 던진다':'Sees far, throws far',
  '팔이 채찍처럼 뻗는다':'An arm that snaps like a whip',
  '상체만으로 던진다':'Throws with the upper body alone',

  /* ── 특성 · 성장 · 등급 조각 ── */
  '강골':'Ironman', '잘 지치지 않는다':'Rarely tires',
  '승부사':'Big-game', '큰 경기에서 강하다':'Rises in big meets',
  '유리몸':'Glass', '부상 위험이 높다':'Injury-prone',
  '후반에 안 죽는다':'Does not fade late',
  '지치지 않는다':'Never tires',
  '흔함':'Common', '우수':'Fine', '정예':'Elite', '영웅':'Heroic', '전설':'Legendary',
  '%1세':'Age %1', '세':'', '주 종목':'Main event',

  /* ── 특성 전수 (TRAITS 표에서 뽑음 — 무작위 로스터에 의존하지 않는다) ── */
  '허들을 잘 넘는다':'Clears the barriers well',
  '용수철':'Springs', '도약이 좋다':'A fine leaper',

  '▲▼ 이동 · 확인 선택   |   ◀▶ 언어   |   조작 방식은 P':
    '▲▼ Move · Confirm select   |   ◀▶ Language   |   P for controls',
  '한국어':'한국어',

  '%1 연속':'%1 in a row',

  '▲▼ 이동 · 확인 선택   |   ◀▶ 언어 · B 커리어 · P 조작':
    '▲▼ Move · Confirm   |   ◀▶ Language · B Career · P Controls',
  '커리어':'Career', '랭크 상승':'Rank up',
  '뱃지 %1 / %2':'Badges %1 / %2',
  '%1경기 · 최고 %2회 · 금 %3 · 시즌 %4':'%1 races · %2 PBs · %3 gold · %4 seasons',
  '신인':'Rookie', '선수':'Athlete', '주전':'Starter', '간판':'Star', '전설':'Legend',
  '첫 결승선':'First Finish', '아무 종목이나 완주했다':'Finished your first event',
  '기준 통과':'Qualified', '기준 기록을 넘었다':'Beat a qualifying mark',
  '기록의 사람':'Record Holder', '개인 최고를 10번 경신했다':'Set 10 personal bests',
  '트랙 순회':'Track Circuit', '달리기 종목을 모두 완주했다':'Finished every running event',
  '필드 순회':'Field Circuit', '도약·투척을 모두 완주했다':'Finished every jump and throw',
  '네 영법':'Four Strokes', '수영 네 종목을 모두 완주했다':'Finished all four swim events',
  '무결점':'Flawless', '한 경기에서 5단까지 올렸다':'Reached tier 5 in one race',
  '첫 금메달':'First Gold', '대회에서 1위를 했다':'Won a meet event',
  '한 시즌':'A Full Season', '시즌을 끝까지 마쳤다':'Completed a season',
  '금메달 10':'Ten Golds', '금메달을 10개 모았다':'Collected ten golds',
  '최고 랭크에 올랐다':'Reached the top rank',
  'CP %1 / %2':'CP %1 / %2', 'CP %1':'CP %1',

  '취소 돌아가기':'Cancel to go back',

  '설정':'Settings', '효과음':'Sound effects', '관중 소리':'Crowd ambience',
  '음소거':'Mute', '언어':'Language', '조작':'Controls', '돌아가기':'Back',
  '켜짐':'On', '꺼짐':'Off', '화면 버튼':'Touch buttons', '키보드':'Keyboard',
  '▲▼ 이동 · ◀▶ 조절 · 확인 전환 · 취소 돌아가기':
    '▲▼ Move · ◀▶ Adjust · Confirm toggle · Cancel back',

  '▲▼ 인원  %1인 동시 대결':'▲▼ Players  %1P Versus',
  '▲▼ 인원  %1인 턴제':'▲▼ Players  %1P Turns',
  '▲▼ 인원  %1인 ':'▲▼ Players  %1P',
  '동시 대결':'Versus', '턴제':'Turns',
  'A / D · S':'A / D · S', '← / → · ↓':'← / → · ↓', 'J / L · K':'J / L · K',
  '숫자4 / 6 · 5':'Num 4 / 6 · 5',

  'P%1 승리':'P%1 Wins', '%1위':'#%1',
  '확인 다시   ·   취소 종목 선택':'Confirm rematch   ·   Cancel event list',

  '범고래':'Orca', '바다사자':'Sea Lion', '수달':'Otter', '펭귄':'Penguin',
  '물개':'Fur Seal', '가마우지':'Cormorant',
  '물에서는 상대가 없다':'Unmatched in the water',
  '상체로 물을 민다':'Drives the water with its chest',
  '물속에서 몸을 비튼다':'Twists its body underwater',
  '뭍에서와 물에서가 딴판이다':'A different animal once wet',
  '앞지느러미가 노가 된다':'Its foreflippers become oars',
  '잠수해서 앞선다':'Dives ahead of the field',

  '어느 나라를 대표합니까':'Which nation do you represent?',
  '◀▶▲▼ 고르고 확인으로 시작   ·   취소 돌아가기':
    '◀▶▲▼ Choose · Confirm to start   ·   Cancel back',
  '대한민국':'Korea', '일본':'Japan', '중국':'China', '미국':'USA', '캐나다':'Canada',
  '브라질':'Brazil', '멕시코':'Mexico', '아르헨티나':'Argentina', '자메이카':'Jamaica',
  '영국':'Britain', '프랑스':'France', '독일':'Germany', '이탈리아':'Italy',
  '스페인':'Spain', '네덜란드':'Netherlands', '스웨덴':'Sweden', '노르웨이':'Norway',
  '폴란드':'Poland', '우크라이나':'Ukraine', '스위스':'Switzerland', '그리스':'Greece',
  '포르투갈':'Portugal', '케냐':'Kenya', '에티오피아':'Ethiopia', '나이지리아':'Nigeria',
  '남아공':'South Africa', '모로코':'Morocco', '이집트':'Egypt', '호주':'Australia',
  '뉴질랜드':'New Zealand', '인도':'India', '태국':'Thailand', '베트남':'Vietnam',
  '인도네시아':'Indonesia', '필리핀':'Philippines', '튀르키예':'Türkiye', '카타르':'Qatar',
  '쿠바':'Cuba', '콜롬비아':'Colombia', '체코':'Czechia',
  '트랙 클럽':'Track Club',

  '국가별 메달':'Medal Table', '금 은 동':'G  S  B',

  '▶ 국가별 메달':'▶ Medal Table', '금  은  동':'G   S   B',
  '아직 메달이 없습니다':'No medals yet',
  '◀ 결과로   ·   확인 계속':'◀ Results   ·   Confirm continue',
  '%1년차 · %2주차':'Year %1 · Week %2',

  '비버':'Beaver', '백조':'Swan', '오리':'Duck', '바다거북':'Sea Turtle',
  '판자 꼬리로 민다':'Pushes with that paddle tail',
  '수면 위는 고요하다':'Serene above, furious below',
  '물갈퀴가 부지런하다':'Tireless webbed feet',
  '노처럼 저어 멀리 간다':'Oars its way over distance',

  '올림픽':'Olympics', '%1 — 올해다':'%1 — this year',
  'LA 2028까지 %1년':'%1 years to LA 2028',
  '브리즈번 2032':'Brisbane 2032', '서울 2036':'Seoul 2036',
  '파리 2040':'Paris 2040', '케이프타운 2044':'Cape Town 2044',
  '국가대표':'National team',

  '목표 승점 %1 · 금 %2':'Target %1 pts · %2 gold',
  '%1 해':'%1 year',

  '400m 허들':'400m Hurdles', '3000m 장애물':'3000m Steeple',
  '허들 %1/%2 성공':'Hurdles %1/%2 clean',

  '다이빙':'Diving', '점':' pts', '%1점':'%1 pts',
  '좌·우를 번갈아 눌러 반동을 키우세요':'Alternate left/right to build the bounce',
  '지금 뛰세요!':'Jump now!', '초록에서 액션':'Act on green',
  '회전 %1':'Spin %1', '수면 직전에 액션으로 펴세요':'Straighten just before the water',
  '완벽한 도약!':'Perfect launch!', '도약':'Launch',
  '물보라 없이!':'No splash!', '입수 %1%':'Entry %1%',
  '배치기!':'Belly flop!', '타이밍을 놓쳤다':'Missed the timing',
  '최고 %1':'Best %1',

  '역도':'Weightlifting', '%1kg':'%1kg',
  '좌·우를 고르게 번갈아 눌러 자세를 잡으세요':'Alternate evenly to set your grip',
  '들어올리세요 — 길게':'Pull — hold it',
  '누르고 있다가 초록에서 떼세요':'Hold, then release on green',
  '버티기 %1초':'Hold %1s', '기우는 반대쪽을 누르세요':'Press against the tilt',
  '깨끗한 인상!':'Clean lift!', '들었다':'Lifted',
  '들어올리지 못했다':'Could not lift it', '바벨이 넘어갔다':'The bar went over',
  '성공 %1kg':'Good lift %1kg', '실패':'No lift',
  '최고 %1kg · 남은 시기 %2':'Best %1kg · %2 attempts left',

  '양궁':'Archery', '%1 / %2발':'%1 / %2 arrows', '합계 %1':'Total %1',
  '액션을 누르고 있으면 당겨집니다':'Hold action to draw',
  '더 당기세요':'Draw further', '흔들림이 작을 때 떼세요':'Release when steady',
  '좌·우로 조준 보정':'Left/right to adjust aim',
  '정중앙!':'Bullseye!', '과녁을 벗어났다':'Missed the target',
  '%1점':'%1 pts', '너무 오래 당겼다':'Held too long',

  '트랙 사이클':'Track Cycling', '기어':'Gear', '▲▼ 변속':'▲▼ Shift',
  '경':'L', '중':'M', '강':'H', '기어 %1':'Gear %1',
  '체력':'Energy', '액션 = 스퍼트 (한 번)':'Action = Sprint (once)', '스퍼트!':'Sprint!',

  /* ── 2026-08-28 추가 — 신규 종목·리그·공통 문구 ─────────────
     ⚠ 여기 없는 문장은 영어 화면에도 **한글 그대로** 나간다. 측정으로 244개를 찾았다:
        txt() 입력이 아니라 **K() 를 통과한 뒤** 한글이 남는 것만 미번역이다. */

  /* 공통 — 출발·판정 */
  '부정 출발':'False start', '총성 전에 움직였습니다':'You moved before the gun',
  '총소리를 듣고 나서 두드리세요':'Wait for the gun, then tap',
  'SPACE: 다시  ·  Q: 종목 선택':'SPACE: Retry  ·  Q: Event list',
  '완벽':'Perfect', '어긋남':'Off', '성공!':'Made it!',
  '세 번 모두 파울':'All three fouled', '기준 %1':'Target %1',
  '나':'You', '상대':'Rival', '점수':'Score', '높이':'Height', '회차':'Bounce',

  /* 도약·투척 */
  '◀ 왼발':'◀ Left', '오른발 ▶':'Right ▶',
  '액션을 눌렀다 놓아 자세를 잡으세요':'Press and release action to set up',
  '놓을 타이밍':'Release timing', '가득 찼을 때 놓으세요':'Release when the bar fills',
  '힘을 모으는 중…':'Gathering power…', '너무 일찍 뛰었다':'Took off too early',
  '회전이 부족하다':'Not enough spin', '릴리스 %1°  (최적 %2°)':'Release %1°  (best %2°)',
  '도달 %1m / 바 %2m':'Reached %1m / Bar %2m',
  '좌·우를 두드려 몸을 넘기세요':'Alternate to carry yourself over',
  '좌·우를 두드려 몸을 끌어올리세요':'Alternate to haul yourself up',
  '꽂기 %1%':'Plant %1%', '폴을 꽂았다':'Pole planted',
  '구름판':'Board', '홉':'Hop', '스텝':'Step', '점프':'Jump',
  '홉 %1%':'Hop %1%', '스텝 %1%':'Step %1%', '점프 %1%':'Jump %1%',
  '구름판 %1%':'Board %1%',
  '홉!':'Hop!', '스텝! %1%':'Step! %1%', '점프! %1%':'Jump! %1%',
  '홉 — 정점에서 누르세요':'Hop — press at the peak',
  '스텝 — 정점에서 누르세요':'Step — press at the peak',
  '점프 — 정점에서 누르세요':'Jump — press at the peak',
  '%1차 %2':'Att %1: %2', '%1 / %2차':'Attempt %1 / %2',

  /* 중장거리 */
  '여유':'Easy', '유지':'Even', '승부':'Push',
  '▲▼ 페이스':'▲▼ Pace', '페이스 ↑ %1':'Pace up — %1', '페이스 ↓ %1':'Pace down — %1',
  '%1 / %2 바퀴':'Lap %1 / %2', '액션 = 스퍼트 %1회':'Action = Kick (%1)',
  '스퍼트 중':'Kicking', '힘이 다 떨어졌다':'Ran out of legs',
  '경고 %1 / %2':'Warning %1 / %2', '경고 %1/%2 — 뛰지 마세요':'Warning %1/%2 — no running',
  '실격 — 경고 %1회':'Disqualified — %1 warnings',

  /* 조정 */
  '조정 %1m':'Rowing %1m', '일정함':'Consistency',
  '좌·우를 천천히 고르게 — 간격을 일정하게':'Slow, even strokes — keep the rhythm steady',
  '캐치가 얕다 — 배가 채인다':'Shallow catch — the boat checks',
  '같은 쪽만 저었다':'Both strokes on one side', '피치 업!':'Rate up!',
  '액션 = 피치 업 (한 번)':'Action = Rate up (once)',

  /* 트램폴린 */
  '트램폴린':'Trampoline', '회전':'Twist', '%1바퀴':'%1 turns',
  '자세 폄':'Opened out', '자세 흐트러짐':'Form broken',
  '타이밍을 놓쳤다':'Missed the timing', '%1연속 완벽':'%1 in a row',
  '아무 키나 눌러 시작 — 매트에 닿는 순간 액션':'Press any key — action the moment you touch the bed',
  '좌우 = 회전 · 착지 전에 액션으로 펴고, 닿는 순간 다시 액션':'Left/right to twist · open out before landing, then action on contact',

  /* 스피드 클라이밍 */
  '스피드 클라이밍':'Speed Climbing', '미끄러짐':'Slips', '흐름':'Flow',
  '%1 / %2 홀드':'Hold %1 / %2', '데드포인트!':'Dyno!',
  '액션 = 도약 %1회 (두 칸)':'Action = Dyno (%1, skips two)',
  '도약은 한 번뿐':'Only one dyno', '손이 꼬였다':'Hands crossed',
  '리듬이 어긋났다':'Rhythm broke', '도약이 빗나갔다':'Dyno missed',
  '추락 — 실격':'Fell — disqualified',
  '좌·우를 고르게 번갈아 — 서두르면 미끄러진다':'Alternate evenly — rushing makes you slip',

  /* 펜싱 */
  '펜싱 에페':'Fencing (Épée)', '앙 갸르드':'En garde', '굳음':'Frozen',
  '리포스트':'Riposte', '거리 %1m':'Distance %1m',
  '사거리 안 — 서로 닿는다':'In distance — both can hit',
  '사거리 밖':'Out of distance', '%1점 선취':'First to %1',
  '← 물러서기 · → 다가가기 · 액션 = 런지':'← Retreat · → Advance · Action = Lunge',
  '헛쳤다 — 자세가 무너졌다':'Missed — you are exposed',
  '%1P 득점 — 런지':'%1P scores — lunge', '상대 득점 — 런지':'Rival scores — lunge',
  '%1P 득점 — 피스트 이탈':'%1P scores — off the piste',
  '상대 득점 — 피스트 이탈':'Rival scores — off the piste',
  '동시 타격 — 둘 다 득점':'Double touch — both score',
  '파리! 상대가 받아넘겼다 — 리포스트':'Parry! The rival turned it aside — riposte',
  '파리! 2P가 받아넘겼다 — 리포스트':'Parry! 2P turned it aside — riposte',
  '파리! 받아넘겼다 — 리포스트':'Parry! You turned it aside — riposte',

  /* 10종·철인3종 */
  '계영 %1×%2m':'%1×%2m Free', '%1번 주자':'Leg %1', '팀 기록':'Team time',
  '인계 — 벽을 찍기 직전에 ▲':'Exchange — press ▲ just before the touch',
  '완벽한 인계!':'Perfect exchange!', '인계':'Exchange', '인계가 늦었다':'Late exchange',
  '너무 일찍 뛰었다 — 실격':'Left too early — disqualified',
  '10종 경기':'Decathlon', '7종 경기':'Heptathlon', '근대5종':'Pentathlon', '개인혼영 %1m':'%1m IM',

  /* 탁구 */
  '탁구':'Table Tennis',
  '인원':'Players', '인':'P', '인원은 설정에서 (일시정지)':'Players: in Settings (pause)',
  '트랙':'Track', '필드':'Field', '수영':'Swim', '복합':'Combined', '맞대결':'Duel', '그 외':'Other',
  '◀▶ 고르기 · ▲▼ 줄·갈래 · 확인 시작 · 취소 뒤로':'◀▶ pick · ▲▼ row/group · Confirm start · Back',
  '준비 중':'Coming soon', '기록 없음':'No record', '최고':'Best', '동시 대결':'head-to-head', '턴제':'take turns',

  /* 유도 */
  '유도':'Judo',

  /* 도마 */
  '도마':'Vault',
  /* 철봉 */
  '철봉':'Horizontal Bar', '스윙':'Swing', '이탈':'Release', '이탈!':'Release!',
  '이탈 가능':'Ready to release', '더 흔들어라':'Swing higher', '스윙이 얕다':'Swing is too shallow',
  '놓는 때가 어긋났다':'Released off the top', '잡기':'Catch', '잡았다':'Caught it',
  '완벽하게 잡았다!':'Perfect catch!', '봉을 놓쳤다 — 추락':'Missed the bar — fall',
  '그냥 떨어졌다':'Came straight down', '스윙이 죽었다':'The swing died',
  '내리기':'Dismount', '내려서기':'Dismount', '이제 내려서세요':'Now dismount',
  '연기 시간 초과':'Routine time over', '추락':'Fall', '착지':'Landing',
  '좌·우를 리듬에 맞춰 — 스윙이 커지면 액션으로 이탈':'Alternate in rhythm — action to release once the swing is big',
  /* 승마 장애물 */
  '승마 장애물':'Show Jumping', '보폭':'Stride', '짧게':'Short', '보통':'Even', '길게':'Long',
  '남은 걸음':'Strides left', '지금 뛰어라!':'Jump now!',
  '발이 맞는다':'The stride fits', '발이 어긋난다 — 보폭을 바꿔라':'The stride does not fit — change it',
  '깨끗하게!':'Clear!', '막대를 떨어뜨렸다 +4':'Rail down +4',
  '거부 +4 — 다시 접근':'Refusal +4 — approach again', '거부 3회 — 실격':'Three refusals — eliminated',
  '아직 멀다':'Still too far', '벌점':'Faults', '낙마봉':'Rails', '거부':'Refusals', '리듬':'Rhythm',
  '▲▼ 보폭 · 좌우 한 걸음 · 도약대에서 액션':'▲▼ stride · left/right to canter · action at the takeoff mark',
  /* 골프 */
  '골프 3홀':'Golf (3 holes)', '%1번 홀':'Hole %1', '파':'Par', '타수':'Strokes',
  '남은 거리':'To hole', '바람':'Wind', '라이':'Lie',
  '페어웨이':'Fairway', '벙커':'Bunker', '러프':'Rough',
  '드라이버':'Driver', '우드':'Wood', '아이언':'Iron', '웨지':'Wedge', '퍼터':'Putter',
  '세기 — 액션으로 멈춤':'Power — action to stop', '정확도 — 초록에서 액션':'Accuracy — action on green',
  '벙커에 빠졌다':'In the bunker', '러프다':'In the rough',
  '이글!':'Eagle!', '버디!':'Birdie!', '보기':'Bogey', '더블 보기 이상':'Double bogey or worse',
  '최대 타수':'Stroke limit', '홀 아웃':'Picked up',
  '←→ 조준 · ▲▼ 클럽 · 액션 3번(시작·세기·정확도)':'←→ aim · ▲▼ club · action 3× (start, power, accuracy)',
  /* 카누 슬라럼 */
  '카누 슬라럼':'Canoe Slalom', '문':' gates', '놓침':'Missed', '접촉':'Touched',
  '봉을 건드렸다 +2초':'Touched a pole +2s', '문을 놓쳤다 +50초':'Missed a gate +50s',
  '빨간 문 — 거슬러 올라간다':'Red gate — go back up through it',
  '번갈아 저으면 빨라지고, 한쪽만 저으면 그 반대로 돈다':'Alternate to go fast; paddle one side to turn the other way', '손 짚기':'Block', '완벽한 손 짚기!':'Perfect block!',
  '손을 못 짚었다':'Missed the block', '손이 미끄러졌다':'Hands slipped',
  '구름판까지 %1m':'%1m to the board', '지금!':'Now!',
  '구름판이 아직 멀다':'The board is still far', '구름판을 지나쳤다':'Ran past the board',
  '그대로 떨어졌다':'Came straight down', '난도':'Difficulty', '수행':'Execution',
  '%1차':'Att %1', '차':'', '바퀴':' turns',
  '좌·우로 달려 구름판을 밟고, 도마에 닿을 때 다시 액션':'Run with left/right, hit the board, then action again on the table', '하지메':'Hajime', '깃 싸움':'Grip fight', '한판':'Ippon', '절반':'Waza-ari',
  '절반%1':'Waza-ari %1', '한판 선취':'First to ippon',
  '우세':'Ahead', '열세':'Behind', '역습 한판':'countered — ippon',
  '기술이 안 걸렸다':'The throw did not land', '걸리지 않았다':'No throw',
  '지금! 한판이 걸린다':'Now — ippon is on', '절반은 걸린다':'Waza-ari is on',
  '아직 얕다':'Grip is still shallow', '지금 지르면 역습당한다':'Throw now and you get countered',
  '좌·우를 번갈아 두드려 깃을 잡고, 기울면 액션':'Alternate to win the grip, then action when it tips',
  '시간 만료 — 기술이 나오지 않았다':'Time — no throw was scored',
  '%1P — %2':'%1P — %2', '나 — %1':'You — %1', '상대 — %1':'Rival — %1', '2P — %1':'2P — %1', '%1구째':'Rally %1', '받는 여유':'Reaction room',
  '서브 — 액션':'Your serve — action', '상대 서브':'Rival serves',
  '←/→ 로 설 자리와 코스를 고른다':'←/→ set where you stand and where you aim',
  '완벽!':'Perfect!', '받지 못했다':'could not reach it',
  '타이밍을 놓쳤다':'mistimed it', '헛스윙':'swung at air',
  '%1P 득점 — %2':'%1P scores — %2', '상대 득점 — %1':'Rival scores — %1',
  '나 득점 — %1':'You score — %1', '2P 득점 — %1':'2P scores — %1', '%1번째 종목':'Event %1 of 10',
  '지금까지 %1점':'%1 pts so far', '아무 키나 눌러 시작':'Press any key to start',
  '+%1점':'+%1 pts',
  '철인3종':'Triathlon', '수영':'Swim', '사이클':'Bike', '달리기':'Run',
  '수영 → 사이클 → 달리기':'Swim → Bike → Run',
  '끊기지 않는다 — 앞 구간에서 쓴 힘이 뒤로 넘어간다':'No rest — the effort you spend carries into the next leg',
  '전환 구역':'Transition', '자전거로':'To the bike', '운동화로':'To the shoes',
  '여기서 쉬는 게 아니라 잃는 것이다':'This is not a rest — it is time lost',
  '피로':'Fatigue', '전환':'Transition',

  /* 리그 */
  '리그 순위표':'League Table', '클럽':'Club', '승점':'Points', '금':'Gold',
  '리그 6개 클럽':'Six clubs in the league',
  '우리가 1위 · %1점':'We lead · %1 pts',
  '%1위 · 1위 %2 %3점 (%4점 차)':'#%1 · leader %2 %3 pts (%4 behind)',
  '1위까지 %1점':'%1 pts to the lead',
  '선두다 — 지키는 것도 일이다':'Top of the table — holding it is the job',
  '리그 정보가 없습니다':'No league data',
  '검은표범 클럽':'Black Panther AC', '화강암 체육회':'Granite SC',
  '조류 수영단':'Tidewater Swim', '고원 육상부':'Highland Track',
  '하늘길 클럽':'Skyward Club', '무쇠 클럽':'Ironbar Club',

  /* 공유 카드 */
  '공유 카드':'Share card', '스크린샷으로 공유하세요':'Share it with a screenshot',
  '확인 내려받기  ·  취소 돌아가기':'Confirm: download  ·  Back: return',
  '▲▼ 공유 카드   ·   확인/취소 돌아가기':'▲▼ Share card   ·   Confirm/Back to return',
  '이미지를 내려받았습니다':'Image downloaded',

  /* 사격 */
  '10m 공기소총':'10m Air Rifle', '숨 참기':'Breath hold',
  '%1 / %2발':'Shot %1 / %2', '다시 호흡':'Re-breathe', '다시 호흡 %1회':'Re-breathed %1×',
  '액션을 눌러 숨을 참으세요':'Hold action to hold your breath',
  '액션을 떼면 발사  ·  ▲ 다시 호흡':'Release to fire  ·  ▲ re-breathe',
  '더는 못 참는다':'Out of breath', '시간 초과 — 쏴야 한다':'Out of time — you must shoot',
  '완벽한 한 발!':'Perfect shot!', '좋다':'Good', '빗나갔다':'Off the mark',
  '과녁을 벗어났다':'Missed the target', '%1초':'%1s', '정점에서 누르세요':'press at the peak', '액션':'Action', '확인':'OK', '취소':'Back', '기준':'Target',
  '%1년 뒤':'in %1 yr', '선두까지 %1점':'%1 pts to the lead',
  '%1위 · 선두 %2점 차':'#%1 · %2 pts behind the lead',
  '화면을 캡처해 공유하세요':'Capture the screen to share',

  /* ── 종목 조작 한 줄 (선택 화면) ── */
  '좌·우 번갈아 두드려 달린다 · 총성 전에 누르면 부정 출발':
    'Alternate ◀ ▶ to run · pressing before the gun is a false start',
  '좌·우 번갈아 · 곡선에서도 리듬을 잃지 않는다':
    'Alternate ◀ ▶ · keep the rhythm through the bend',
  '좌·우 번갈아 · 한 바퀴라 초반에 다 쓰면 무너진다':
    'Alternate ◀ ▶ · a full lap — spend it all early and you fall apart',
  '좌·우 번갈아 달리다 허들 앞에서 액션으로 넘는다':
    'Alternate ◀ ▶, then Action to clear each hurdle',
  '허들 10개 · 보폭이 흐트러지면 발이 안 맞는다':
    'Ten hurdles · lose your stride pattern and you meet them wrong-footed',
  '허들 + 물웅덩이 · 물 앞에서는 일찍 뛴다':
    'Barriers + water jump · take off early at the water',
  '▲▼ 페이스(여유·유지·승부) · 액션 = 스퍼트 1회':
    '▲▼ pace (easy · hold · push) · Action = one kick',
  '▲▼ 페이스 배분이 전부 · 승부는 한 번뿐':
    '▲▼ pace is everything · you only get one kick',
  '▲▼ 페이스 · 길다. 유지로 가다 마지막에 지른다':
    '▲▼ pace · it is long. Hold, then go on the last lap',
  '▲▼ 페이스 · 너무 빠른 케이던스는 경고, 3회면 실격':
    '▲▼ pace · too quick a cadence draws a warning — three and you are out',
  '좌·우로 달리고 인계 구역에서 액션 · 속도가 비슷할 때 넘긴다':
    'Run with ◀ ▶, Action in the exchange zone · hand over at matched speed',
  '한 바퀴씩 네 명 · 인계 품질이 13초를 가른다':
    'Four runners, a lap each · the handoffs decide 13 seconds',
  '좌·우로 달려 구름판에서 액션 · 공중에서 액션을 쥐었다 놓는다':
    '◀ ▶ to run, Action on the board · hold and release Action in the air',
  '홉·스텝·점프 — 정점마다 액션':
    'Hop, step, jump — Action at each peak',
  '좌·우로 달려 액션으로 뛰고, 좌·우로 몸을 넘긴다':
    '◀ ▶ to run, Action to take off, then ◀ ▶ to arch over',
  '액션으로 폴을 꽂고 좌·우로 몸을 끌어올린다':
    'Action to plant the pole, ◀ ▶ to haul yourself up',
  '액션을 눌러 힘을 모으고 가득 찼을 때 놓는다':
    'Hold Action to build force, release when the gauge fills',
  '좌·우 번갈아 회전을 올리고 액션으로 놓는다':
    'Alternate ◀ ▶ to spin up, Action to release',
  '좌·우로 달려 액션 · 릴리스 각도가 45°에 가까울수록 멀리 간다':
    '◀ ▶ to run, then Action · the closer the release is to 45°, the farther it flies',
  '좌·우 번갈아 회전 · 회전이 많을수록 멀리 가지만 놓치기 쉽다':
    'Alternate ◀ ▶ to turn · more turns fly farther but are easier to lose',
  '좌·우 번갈아 젓고, 제때 액션으로 숨 쉬고, 벽 앞에서 액션으로 턴':
    'Alternate ◀ ▶ to stroke, Action to breathe on time, Action at the wall to turn',
  '배영 · 숨은 자유롭지만 벽이 안 보인다':
    'Backstroke · breathing is free, but you cannot see the wall',
  '평영 · 느리지만 리듬 창이 넓다':
    'Breaststroke · slower, but the rhythm window is wide',
  '접영 · 가장 빠르게 지치니 호흡을 놓치지 말 것':
    'Butterfly · it tires you fastest, so never miss a breath',
  '좌·우로 반동 → 액션으로 도약 → 좌·우 회전 → 액션으로 편다':
    '◀ ▶ to bounce → Action to leave the board → ◀ ▶ to spin → Action to open',
  '좌·우로 자세를 잡고 액션을 길게 눌러 든다 · 기우는 반대쪽을 누른다':
    '◀ ▶ to set your stance, hold Action to lift · press against the way you tilt',
  '액션을 누르고 있으면 당겨진다 · 좌·우로 조준 · 떼면 발사':
    'Hold Action to draw · ◀ ▶ to aim · release to shoot',
  '좌·우로 페달 · ▲▼ 기어 · 액션 = 스퍼트 1회':
    '◀ ▶ to pedal · ▲▼ gears · Action = one attack',
  '좌·우를 천천히 고르게 — 빠름이 아니라 일정함이 속도다':
    '◀ ▶ slowly and evenly — speed comes from consistency, not haste',
  '매트에 닿는 순간 액션 · 좌·우 회전 · 착지 전에 액션으로 편다':
    'Action the moment you touch the bed · ◀ ▶ to spin · Action to open before landing',
  '좌·우를 고르게 — 정확하면 빨라진다 · 액션 = 도약 1회':
    '◀ ▶ evenly — accuracy is speed · Action = one dyno',
  '← 물러서기 · → 다가가기 · 액션 = 런지 · 뻗을 때 물러서면 받아넘긴다':
    '← retreat · → advance · Action = lunge · retreat as they extend to parry',
  '열 종목을 이어서 · 각 종목의 조작 그대로':
    'Ten events back to back · each keeps its own controls',
  '수영 → 사이클 → 달리기 · 앞 구간에서 쓴 힘이 뒤로 넘어간다':
    'Swim → bike → run · what you spend early carries into the next leg',
  '액션을 눌러 숨을 참고 가장 잔잔할 때 뗀다 · ▲ 다시 호흡':
    'Hold Action to hold your breath, release at the stillest point · ▲ to breathe',
  '일곱 종목을 이어서 · 각 종목의 조작 그대로':
    'Seven events back to back · each keeps its own controls',
  '접영→배영→평영→자유형 · 영법마다 리듬을 새로 잡는다':
    'Fly → back → breast → free · find the rhythm again at every change',
  '←→ 로 설 자리와 코스를 정하고, 공이 올 때 액션':
    '←→ to place your feet and the course, Action as the ball arrives',
  '좌·우 번갈아 깃 싸움 · 저울이 기울면 액션으로 메친다':
    'Alternate ◀ ▶ for the grip · when the scale tips, Action to throw',
  '좌·우로 달려 구름판, 도마에 닿을 때 다시 액션 · 좌·우 비틀기':
    '◀ ▶ to run, Action on the board, Action again on the table · ◀ ▶ to twist',
  '번갈아 저으면 빨라지고, 한쪽만 저으면 그 반대로 돈다':
    'Alternate sides to go fast; paddling one side turns you the other way',
  '←→ 조준 · ▲▼ 클럽 · 액션 3번(시작·세기·정확도)':
    '←→ aim · ▲▼ club · Action three times (start · power · accuracy)',
  '▲▼ 보폭 · 좌·우 한 걸음 · 도약대에 발이 맞으면 액션':
    '▲▼ stride · ◀ ▶ one step · Action when the take-off lands right',
  '좌·우로 흔들어 스윙을 키우고 액션으로 이탈 · 다시 액션으로 잡는다':
    '◀ ▶ to build the swing, Action to release · Action again to catch',
  '펜싱·수영·승마·사격·달리기 다섯 종목':
    'Five events: fencing · swimming · riding · shooting · running',
  '네 명이 이어 헤엄친다 · ▲ 인계는 벽을 찍기 직전에(먼저 뛰면 실격)':
    'Four swimmers in turn · ▲ hands over just before the wall (early = DQ)',

  /* ── 부팅 화면(HTML) · 화면 버튼 ── */
  '좌·우를 일정한 박자로 번갈아 — 빨리가 아니라 고르게': 'Alternate ◀ ▶ at a steady beat — even, not fast',
  '어떻게 조작할까요?': 'How do you want to play?',
  '키보드로': 'Keyboard', 'A / D · Space': 'A / D · Space',
  '화면 버튼으로': 'On-screen buttons', '손가락이나 마우스로': 'Finger or mouse',
  '%1종목 더': '%1 more events',
  '마라톤': 'Marathon',
  '▲▼ 페이스 · 가장 긴 종목이다. 초반에 지르면 뒤가 없다':
    '▲▼ pace · the longest event — go early and there is nothing left',
  '남은 %1km': '%1km to go',

  /* ── 링 ── */
  '링': 'Rings', '버티기': 'Hold', '십자버티기': 'Iron cross', '수평버티기': 'Planche',
  '내리기': 'Dismount', '자세': 'Position', '흔들림': 'Sway',
  '되잡기 %1': 'Corrections %1',
  '아직 버텨야 한다': 'Hold it longer',
  '흔들림 없이 버텼다': 'Held it dead still',
  '버텼다': 'Held', '많이 흔들렸다': 'A lot of sway',
  '자세가 무너졌다': 'The hold collapsed',
  '완벽한 착지!': 'Perfect landing!', '착지': 'Landed', '착지가 흔들렸다': 'Shaky landing',
  '정점에서 액션 — 내려서기': 'Action at the top — dismount',
  '액션으로 다음 자세': 'Action for the next position',
  '%1초 더': '%1s more',
  '너무 자주 잡으면 몸이 출렁인다': 'Correcting too often makes you swing',
  '좌·우로 되잡아 흔들림을 0 에 둔다': 'Use ◀ ▶ to hold the sway at zero',
  '안정 %1%  ·  무너짐 %2': 'Steady %1%  ·  Collapses %2',
  '좌·우로 흔들림을 되잡아 버틴다 — 많이 누를수록 감점':
    '◀ ▶ to steady yourself — every correction costs you',
  '실격': 'Disqualified',
  '케이던스 경고 3회 — 걷기를 유지해야 합니다': 'Three cadence warnings — you must keep walking',
  '제한 시간 안에 들어오지 못했습니다': 'You did not finish inside the time limit',
  '실격되었습니다': 'You were disqualified',
  '인계 구역을 벗어났습니다': 'You left the exchange zone',
  '거부 3회 — 말이 장애물 앞에서 멈췄습니다': 'Three refusals — your horse stopped at the fence',
  '인계 부정 출발 — 벽을 찍기 전에 뛰었습니다': 'Early exchange — you left before the wall was touched',
  '미끄러졌습니다 — 리듬이 어긋나면 손이 빠집니다': 'You slipped — a broken rhythm loses the hold',
  '제한 시간 안에 완등하지 못했습니다': 'You did not top out inside the time limit',
  '연타는 오히려 느려집니다 — 리듬을 맞추세요': 'Mashing makes you slower — match the rhythm',
  '같은 쪽을 연달아 눌렀습니다 — 좌·우를 번갈아': 'You pressed the same side twice — alternate ◀ ▶',
  '너무 빨리 두드렸습니다 — 아래 게이지의 초록 칸에 맞추세요':
    'Too fast — land your taps in the green band on the gauge below',
  '조금씩 늦습니다 — 게이지보다 살짝 먼저 누르세요': 'A touch late — press just before the marker',
  '아래 게이지의 초록 칸에서 두드리면 빨라집니다': 'Tap inside the green band below to go faster',
  '완주하지 못했습니다': 'You did not finish',
  '좌·우를 일정한 박자로 번갈아 — 빨리가 아니라 고르게 · 총성 전엔 부정 출발':
    'Alternate ◀ ▶ at a steady beat — even, not fast · pressing before the gun is a false start',
  '좌·우를 일정한 박자로 — 곡선에서도 그 박자를 잃지 않는다':
    'Alternate ◀ ▶ at a steady beat — keep it through the bend',
  '좌·우를 일정한 박자로 — 한 바퀴다. 초반에 다 쓰면 무너진다':
    'Alternate ◀ ▶ at a steady beat — one full lap; spend it early and you fall apart',
  '좌·우를 일정한 박자로 달리다 허들 앞에서 액션':
    'Alternate ◀ ▶ at a steady beat, then Action at each hurdle',
  '좌·우를 일정한 박자로 · 인계 구역에서 액션(속도가 비슷할 때)':
    'Steady beat with ◀ ▶ · Action in the exchange zone, at matched speed',
  '박자 소리': 'Beat cue',
  /* ── v5.5~v7.0 에서 더한 화면들 (2026-08-29) ─────────────────────
     ⚠ 처음 켠 영어 플레이어가 **반쯤 한국어인 사무실**을 봤다. 육성·감독·시설·
        스킬·도감·종합력을 붙이면서 이 표를 같이 안 채웠기 때문이다.
        K.missing() 으로 수확해 메웠다 — 새 문자열을 쓰면 여기도 같이 채울 것. */
  '육성':'Development', '감독':'Manager', '시설':'Facilities', '코치진':'Coaches',
  '스킬':'Skills', '장비':'Gear', '경기':'Race', '스탯':'Stats', '잠재':'Pot',
  '종족 도감':'Codex', '명예의 전당':'Hall of Fame', '일일 도전':'Daily Challenge',
  '스카우트 리포트':'Scout Report', '스탯 올리기':'Raise Stats',
  '경기력':'Power', '성장력':'Growth', '클럽 경기력':'Club power',
  '훈련 포인트':'Training points', '유산':'Legacy', '등록':'Collected',
  '확신도':'Confidence', '낮음':'Low', '시즌':'Seasons', '합계':'Total',
  '빈칸':'Empty', '비어 있음':'Empty', '신발':'Shoes', '유니폼':'Kit',
  '지도 안 함':'No coaching', '팀 프로그램대로':'Follows the team program',
  '팀 미팅':'Team meeting', '도전':'Try', '명':'', '곳':'',
  '이름 없는 감독':'Unnamed manager', '지금 받는 것':'Active bonuses',
  '다음 이정표':'Next milestone', '선수 레벨 상한':'Athlete level cap',
  '코치 자리':'Coach slots', '선수단 정원':'Squad size', '스카우트 지역':'Scout regions',
  '감독 레벨이 여는 것':'What manager level unlocks',

  '감독  이름 없는 감독':'Manager  Unnamed',
  'Lv.%1 · 선수 레벨 상한 %2 · 다음 Lv.%3: 코치 %4명':
    'Lv.%1 · athlete cap %2 · next Lv.%3: %4 coaches',
  '훈련 포인트 %1 · 창고 %2개':'%1 training points · %2 in storage',
  '▶ 시설을 지을 수 있습니다':'▶ You can build a facility',
  '코인을 영구 성장으로 바꿉니다':'Turn coins into permanent growth',
  '코인을 영구 성장으로 바꿉니다 — 클럽에 남고, 모든 선수에게 적용됩니다':
    'Turn coins into permanent growth — it stays with the club and helps every athlete',
  '▶ 훈련 포인트 %1점이 놀고 있습니다':'▶ %1 training points are sitting unused',
  '스탯을 올리거나 잠재치를 돌파하세요':'Raise a stat, or break through the cap',
  '팀 사기가 %1까지 내려갔습니다':'Team morale has fallen to %1',
  '팀 미팅으로 올리세요 — 컨디션이 따라 오릅니다':
    'Call a team meeting — condition follows morale up',
  '선수단 전체의 사기를 올린다 — 낮은 선수일수록 크게':
    'Lifts the whole squad — most for those lowest',
  '팀 사기 +%1':'Squad morale +%1', '평균 %1':'avg %1', '성장 ×%1':'growth ×%1',
  '%1 → 잠재 %2':'%1 → pot %2', 'OVR %1 · 잠재 %2':'OVR %1 · pot %2',
  '슬롯 %1 / %2':'Slots %1 / %2', '다음 칸 Lv.%1':'next at Lv.%1',
  '슬롯 %1 / %2 · 다음 칸 Lv.%3':'Slots %1 / %2 · next at Lv.%3',
  '훈련 포인트 %1':'%1 training points',
  '훈련 포인트 %1점을 쓸 수 있습니다':'%1 training points to spend',
  '아직 안 뛰었다':'Not run yet', '아직 판단하기 이르다':'Too early to judge',
  '%1주 함께함':'%1 weeks together', '특기 %1':'Best at %1',
  '  창고가 비었다':'  Storage is empty',
  '대회에서 장비가 나옵니다':'Gear drops at meets',
  '아직 은퇴한 선수가 없습니다':'No one has retired yet',
  '선수가 은퇴하면 이곳에 남고, 신인이 그 자질을 물려받습니다':
    'Retirees stay here, and rookies inherit their potential',
  '아직 아무것도 짓지 않았습니다':'Nothing built yet',
  '모으면 자동으로 쌓입니다':'Builds up as you collect',
  '영구 성장  종족당 +%1%':'Permanent growth  +%1% per species',
  '%1인당':'per athlete', '다음 이정표  %1 / %2':'Next milestone  %1 / %2',
  '본 것 %1':'Seen %1', '전당 %1':'Hall %1', '전당 %1명':'%1 in the hall',
  '클럽 전체 성장 +%1%':'Club-wide growth +%1%',
  '오늘의 종목 %1개 — 한 번씩만':'%1 events today — one try each',
  '세 종목을 마치면 받습니다':'Finish all three to claim',
  '경기를 하면 커리어 점수가 쌓입니다 — 아케이드도, 감독 모드도':
    'Every race earns career points — arcade and manager alike',
  '다음 Lv.%1 에서':'At Lv.%1', '커리어 점수 %1 더':'%1 more career points',
  '코치 %1명':'%1 coaches', '%1곳':'%1',
  '계약금 %1':'Signing %1',
  /* ⚠ 이 줄은 코드가 K() 에 넘기는 **원문 그대로**여야 한다.
     원문에 이미 %1 같은 자리표시자가 있으면, 자동 번호매김(_tmpl)이 그 안의 숫자까지
     다시 치환해 '%%1 / %2 명 · 주급 합계 %%3' 이라는 엉뚱한 키를 만든다.
     K() 는 **정확 일치를 먼저** 보므로 원문을 그대로 넣어 두면 그 경로를 안 탄다. */
  '%1 / 3 명 · 주급 합계 %2':'%1 / 3 hired · wages %2',
  '%1 / %2 명 · 주급 합계 %3':'%1 / %2 hired · wages %3',
  '%1 성장 +%2%':'%1 growth +%2%', '부상 %1% · 피로 회복 +%2':'Injury %1% · recovery +%2',
  '스피드 성장 +%1%':'Speed growth +%1%', '파워 성장 +%1%':'Power growth +%1%',
  '지구력 성장 +%1%':'Stamina growth +%1%', '기술 성장 +%1%':'Technique growth +%1%',
  '리듬 성장 +%1%':'Rhythm growth +%1%',
  '○ 단거리 코치':'○ Sprint coach', '○ 웨이트 코치':'○ Strength coach',
  '○ 지구력 코치':'○ Endurance coach', '○ 기술 코치':'○ Technique coach',
  '○ 리듬 코치':'○ Rhythm coach', '○ 의무 트레이너':'○ Physio',
  /* ⛔ 여기 있던 '훈련장  ○○○○○' 다섯 줄을 지웠다 — **0단계만 맞는 키**였다.
     레벨이 오르면 동그라미가 ●●○○○ 로 바뀌어 표에서 못 찾고 영어판이 한국어로 남았다.
     이제 이름만 옮기고(위 시설 구획) 동그라미는 코드가 붙인다. */
  '선수가 더 빨리 자란다':'Athletes grow faster',
  '부상이 줄고 피로가 잘 빠진다':'Fewer injuries, faster recovery',
  '컨디션이 잘 오른다':'Condition rises more easily',
  '선수의 잠재치를 빨리 알아본다':'Read potential sooner',
  '들어오는 신인이 좋아진다':'Better rookies come through',

  /* 스킬 — 이름과 설명 */
  '총성 반응':'Gun Reflex', '화약 반응':'Powder Reflex', '뒷심':'Closer',
  '강철 뒷심':'Iron Closer', '박자':'Beat', '절대 박자':'Perfect Beat',
  '강심장':'Big Heart', '대무대 체질':'Born for the Stage', '허들 감각':'Hurdle Sense',
  '용수철':'Coil', '채찍팔':'Whip Arm', '식성':'Big Appetite', '강철 무릎':'Iron Knees',
  '낙천':'Sunny', '흡수력':'Sponge', '천재성':'Prodigy', '프로 의식':'Professional',
  '출발 반응이 빨라진다 · 포인트 %1':'Faster start reaction · %1 pts',
  '후반에 덜 무너진다 · 포인트 %1':'Fades less late · %1 pts',
  '리듬이 덜 흔들린다 · 포인트 %1':'Steadier rhythm · %1 pts',
  '피로가 잘 빠진다 · 포인트 %1':'Recovers fatigue faster · %1 pts',
  '부상 위험이 준다 · 포인트 %1':'Lower injury risk · %1 pts',
  '컨디션이 잘 오른다 · 포인트 %1':'Condition rises more easily · %1 pts',
  '훈련 효율이 오른다 · 포인트 %1':'Trains more efficiently · %1 pts',

  /* 아래쪽 조작 안내 */
  '확인 +%1 / 잠재치 돌파 · ▲ 리포트 · ▼ 계승 · ◀▶ 탭 · 취소':
    'Confirm +%1 / break cap · ▲ report · ▼ inherit · ◀▶ tabs · Cancel',
  '확인 착용 · ▲ 합성 · ▼ 팔기 · ◀▶ 탭 · 취소 뒤로':
    'Confirm equip · ▲ fuse · ▼ sell · ◀▶ tabs · Cancel back',
  '확인 배우기 / 켜고 끄기 · ◀▶ 탭 · 취소 뒤로':
    'Confirm learn / toggle · ◀▶ tabs · Cancel back',
  '확인 영입/해고   취소 돌아가기':'Confirm hire/fire   Cancel back',
  '확인 짓기 · 취소 뒤로':'Confirm build · Cancel back',
  '확인 도전/받기   취소 돌아가기':'Confirm try/claim   Cancel back',
  '확인 이름 바꾸기':'Confirm rename',
  '확인 이름 · ◀▶ 얼굴 · 취소 돌아가기':'Confirm name · ◀▶ face · Cancel back',
  '◀▶ 특성 · ▲ 다시 뽑기 · 취소 돌아가기':'◀▶ trait · ▲ reroll · Cancel back',
  '◀▶ 고르기 · ▲▼ 등급 · 확인 보상 · 취소 뒤로':
    '◀▶ pick · ▲▼ tier · Confirm claim · Cancel back',
  '◀▶▲▼ 고르기 · 확인 선택 · 취소 돌아가기':'◀▶▲▼ move · Confirm select · Cancel back',
  '▲ 다시 뽑기 −%1':'▲ Reroll −%1',

  /* ── 종족 이름 60종 ─────────────────────────────────────
     ⚠ 선수 줄마다 나오는데 영어가 없었다 — 영어판 로스터가 '토끼 신서아' 였다.
        txt() 가 자동으로 K() 를 태우므로 표에만 넣으면 코드는 그대로다. */
  '치타':'Cheetah',
  '그레이하운드':'Greyhound',
  '토끼':'Rabbit',
  '타조':'Ostrich',
  '가지뿔영양':'Pronghorn',
  '산토끼':'Hare',
  '자칼':'Jackal',
  '로드러너':'Roadrunner',
  '말':'Horse',
  '여우':'Grey Fox',
  '가젤':'Gazelle',
  '칼새':'Swift',
  '임팔라':'Impala',
  '캥거루':'Kangaroo',
  '개구리':'Frog',
  '스프링복':'Springbok',
  '스라소니':'Lynx',
  '사슴':'Deer',
  '서벌':'Serval',
  '왈라비':'Wallaby',
  '늑대':'Wolf',
  '허스키':'Husky',
  '낙타':'Camel',
  '순록':'Caribou',
  '영양':'Antelope',
  '하이에나':'Hyena',
  '알바트로스':'Albatross',
  '개미':'Ant',
  '다람쥐':'Squirrel',
  '벼룩':'Flea',
  '산양':'Ibex Goat',
  '메뚜기':'Grasshopper',
  '아이벡스':'Ibex',
  '저비':'Jerboa',
  '원숭이':'Monkey',
  '여우원숭이':'Lemur',
  '퓨마':'Puma',
  '귀뚜라미':'Cricket',
  '돌고래':'Dolphin',
  '코끼리':'Elephant',
  '고릴라':'Gorilla',
  '하마':'Hippo',
  '곰':'Bear',
  '문어':'Octopus',
  '코뿔소':'Rhino',
  '들소':'Bison',
  '게':'Crab',
  '독수리':'Eagle',
  '사마귀':'Mantis',
  '바다코끼리':'Walrus',
  '범고래':'Orca',
  '바다사자':'Sea Lion',
  '수달':'Otter',
  '펭귄':'Penguin',
  '물개':'Fur Seal',
  '가마우지':'Cormorant',
  '비버':'Beaver',
  '백조':'Swan',
  '오리':'Duck',
  '바다거북':'Sea Turtle',

  /* ── 기록실 거르기 · 시즌 종료 (2026-08-29 ink.html 로 잡은 구멍) ──
     ⚠ 시즌 종료 화면은 '보고서'가 있어야 열려서 그동안 훑기에서 빠져 있었다 —
        영어 빌드에서 한 화면이 통째로 한국어였다. */
  '%1 / %2 종목 · %3년차':'%1 / %2 events · Year %3',
  '◆ 거르기 · 취소 돌아가기':'◆ Filter · Cancel Back',
  '해당하는 종목이 없습니다':'No events match',
  '기록 있음':'Has record', '아직 없음':'Not yet',
  '◀ 전체 ▶':'◀ All ▶', '◀ 기록 있음 ▶':'◀ Has record ▶', '◀ 아직 없음 ▶':'◀ Not yet ▶',
  '%1년차 시즌 종료':'Year %1 Season End',
  '승점 %1  ·  금 %2 은 %3 동 %4':'%1 pts  ·  %2G %3S %4B',
  '목표 승점 %1 · 금 %2':'Target %1 pts · %2 gold',
  '%1세 · OVR %2':'Age %1 · OVR %2',
  '%1세 · OVR %2 / 잠재 %3':'Age %1 · OVR %2 / Pot %3',
  '확인 다음 시즌 시작':'Confirm Start next season',
  '평가':'Grade', '은퇴':'Retired', '신입':'Rookies',
  /* 올림픽 개최 도시는 데이터라 문장 밖에 둔다 — 틀만 옮긴다 */
  '올림픽의 해':'Olympic year',
  /* 선수단 정렬 기준 · 안내줄 */
  '등록순':'Default', '나이':'Age',
  /* ⚠ 컨디션 5단 중 3단이 빠져 있었다. ink.html 이 '선수 이름 제외' 필터로
     2~4자 한글을 통째로 걸러서 **짧은 한국어 낱말이 전부 숨어 있었다.** */
  '최악':'Awful', '나쁨':'Poor', '최상':'Peak',
  '부상 %1주':'Out %1w',
  /* ── 시설 ─────────────────────────────────────────────
     ⚠ 예전엔 레벨별 라벨('훈련장  ○○○○○')을 손으로 넣어 뒀다 — 1단계부터 안 맞는다.
        이제 **이름만** 옮기고 동그라미는 코드가 붙인다.
     ⚠ 값 줄도 문장을 통째로 넣지 않는다. 낱말만 옮기고 숫자는 코드가 붙인다.
     ⚠ 자리표시자가 든 키는 **원문 그대로** 넣어야 한다 — 자동 번호매김이
        '%1' 안의 숫자까지 바꿔 '%%1' 이라는 엉뚱한 키를 만든다(정확 일치가 먼저다). */
  '훈련장':'Training hall', '의무실':'Medical room', '기숙사':'Dormitory',
  '분석실':'Analysis room', '유소년 아카데미':'Youth academy',
  '성장':'Growth', '회복':'Recovery', '부상률':'Injury rate',
  '스카우트 확신':'Scout confidence', '신인 자질':'Rookie quality',
  '성장 +%1%':'Growth +%1%', '회복 +%1':'Recovery +%1',
  '부상률 −%1%':'Injury rate −%1%', '컨디션 +%1':'Condition +%1',
  '스카우트 +%1%':'Scout +%1%', '신인 자질 +%1%':'Rookie quality +%1%',
  '지금 받는 것 · 클럽에 영구':'Active bonuses · permanent, club-wide',
  /* 감독 이력 — 라벨이 스스로 분모를 말한다(직접 뛴 것 vs 클럽이 딴 것) */
  '직접 뛴 경기':'Races you ran', '대회 금메달':'Meet golds', '마친 시즌':'Seasons done',
  '◀▶ 특성 · 취소 돌아가기':'◀▶ Trait · Cancel back',
  /* 경기 HUD — 아이콘이 없을 때 나오는 라벨(원문은 한국어여야 한다) */
  '시간':'TIME', '속도':'SPEED', '거리':'DIST',
  '팀 사기 %1 — 올릴 수 있습니다':'Team morale %1 — you can raise it',
  /* 2인 이상 턴제 — 지금 누구 차례인가 */
  '차례':'turn',
  /* 수영 호흡 게이지 라벨 — 한 글자라 눈에 안 띄어 계속 빠져 있었다 */
  '숨':'Air',
  /* 허들 도약 눈금 — 가운데에 닿는 순간 */
  '지금':'NOW',
  /* 3000m 장애물의 장애물은 허들이 아니다 */
  '장애물':'Barriers', '허들':'Hurdles',
  /* 캐릭터 모드 — 경기 직전 종목 선택에서 고른다 */
  '캐릭터':'Character', 'HD 그림':'HD art', '픽셀':'Pixel',
  '◀ 등록순 ▶':'◀ Default ▶', '◀ 나이 ▶':'◀ Age ▶',
  '◀▶ 정렬 · 확인 상세 · 취소 돌아가기':'◀▶ Sort · Confirm Detail · Cancel Back',
};