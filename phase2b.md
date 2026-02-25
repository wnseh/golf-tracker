

- Score 에 토탈 스코어 외에도 몇온/몇펏/토탈 스코어(Birdie/Par/Bogey)를 쓸수 있었으면 좋겠음
- 파3 인 경우, Tee Shot 에 그 유저의 가장 긴 채부터 퍼터 제외 가장 짧은 채까지 리스트에 나와야함
- 유저마다 따로 설정한 채와 그에 맞는 거리를 저장할 DB가 필요하고, 설정창에서 설정할수 있었으면 좋겠음. 캐리/토털 둘다나 따로(연습장 기준)
- 설정창이 필요함. 우선은 홈버튼 오른쪽 위에 톱니바퀴 버튼으로. 각 유저들이 쓰는 채와 거리를 설정하게, 그리고 그 설정된 채들이 티샷이나 그라운드 샷을 할때 리스트에 나왔으면 좋겠음.
	- Driver, mini-Driver, 3W,4W,5W,6W,7W,8W,9W, 3H,4H,5H,6H,7H,8H,9H, 1I,2I,3I,4I,5I,6I,7I,8I,9I,pw,aw,gw,sw,lw,48~74도 웨지 선택 가능(1도씩 wheel picker로 추가 가능)
	- 설정을 안했다면, Driver, 3W,5W,4H, 4I,5I,6I,7I,8I,9I,pw,gw,sw,lw를 디폴트로.
	- 거리는 이렇게를 디폴트로 저장해줘. :
		gender,club,distance_m
		male_amateur,Driver,200
		male_amateur,3W,180
		male_amateur,3H,170
		male_amateur,4I,160
		male_amateur,5I,150
		male_amateur,6I,140
		male_amateur,7I,130
		male_amateur,8I,120
		male_amateur,9I,110
		male_amateur,PW,100
		male_amateur,GW,85
		male_amateur,SW,70
		male_amateur,LW,55
		female_amateur,Driver,160
		female_amateur,3W,140
		female_amateur,5W,130
		female_amateur,3H,132
		female_amateur,4I,127
		female_amateur,5I,118
		female_amateur,6I,109
		female_amateur,7I,100
		female_amateur,8I,91
		female_amateur,9I,81
		female_amateur,PW,68
		female_amateur,GW,54
		female_amateur,SW,45
		female_amateur,LW,36
-html 에 있듯이 Bottom Navigation Bar가 추가되어야함. Home, Input, Analysis, Card, Setting
-앱 화면에 슬라이드바가 너무 촌스러움. 홀 선택을 하거나 shape 선택을 할때 슬라이드가 숨겨져 있고, 해당 선택을 전체적으로 드래그 하면서 슬라이드 했으면 좋겠는데 가능한지 알아봐야함.(어떤 선택이 있는지 알려줘)
-퍼팅에서 putt distance 가 맥스 30m까지 설정 가능하게 해줘. 그린 스피드는 2.0~4.0 까지 0.1 단위로 설정가능하게 슬라이더로 바꿔줘
- shape을 2줄로 바꿔줘. 천번째 줄: pull, straight, push. 두번째 줄: Hook, Draw, Straight, Fade, Slice, Shank 
- slope 옵션을 중복으로 선택할수 있게 해줘: downhill & toe-dn 등 가능하게.
- 각각의 선택하는 옵션들을 디폴트로 선택 되어있게 해줘.
	- wind: none, calm
	- quality: clean
	- Slope: flat
	- trajectory: mid,
	- shape: Str
	- 등등. pre post 둘다.
- 설명이 필요한 문구는 옆에 ? 나 info 등의 작은 아이콘을 누르면 설명이 보였으면 좋겠어.
	- Ground Shot고를때 뭘 뜻하는지 알수있게 작은 설명이 있었으면 좋겠어. Approach: 그린 공략 >= 50m, ARG: 그린 공략 < 50m, layup: 전략적 레이업, Recovery: 탈출 레이업.
	- 퍼팅 post read review 도 설명이 필요해 R−− 훨씬 덜 꺾임  |  R− 덜 꺾임  |  R0 정확  |  R+ 더 꺾임  |  R++ 훨씬 더 꺾임
	- shape 의 경우에는 모양으로.
