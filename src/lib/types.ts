export type WindDir = 'down' | 'dl' | 'dr' | 'left' | 'right' | 'ul' | 'ur' | 'into' | 'calm';
export type LeaveDistBucket = 'ON' | '0-2m' | '2-5m' | '5m+' | 'PEN';
export type PuttDistBucket = '0-1m' | '1-2m' | '2-5m' | '5-8m' | '8m+';
export type WindStr = 'none' | 'weak' | 'strong' | 'gusty';
export type WeatherVal = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'fog';
export type InputMode = 'fun' | 'casual' | 'serious';
export type ShapeVal = 'duck-hook' | 'hook' | 'pull' | 'draw' | 'straight' | 'fade' | 'push' | 'slice' | 'shank';
export type StartLineVal = 'pull' | 'straight' | 'push';
export type CurveVal = 'duck-hook' | 'hook' | 'draw' | 'straight' | 'fade' | 'slice' | 'shank';
export type TrajVal = 'low' | 'mid' | 'high';
export type FeelVal = 'flushed' | 'toe' | 'heel' | 'high' | 'low';
export type PuttFeelVal = 'solid' | 'pushed' | 'pulled' | 'thin' | 'decel';
export type ReadVal = 'R--' | 'R-' | 'R0' | 'R+' | 'R++';

export interface UserClub {
  id?: string;
  userId: string;
  clubName: string;
  carryM: number;
  totalM: number;
  sortOrder: number;
}

export interface TeeRoutine {
  // PRE
  windStr:          WindStr | null;
  windDir:          WindDir | null;
  targetTraj:       TrajVal | null;
  targetStartLine:  StartLineVal | null;
  targetCurve:      CurveVal | null;
  // POST
  landing:          'FW' | 'RO' | 'BK' | 'HZ' | 'OB' | null;
  actualCarry:      string | null;
  resultTraj:       TrajVal | null;
  resultStartLine:  StartLineVal | null;
  resultCurve:      CurveVal | null;
  feel:             FeelVal | null;
  commit:           string | null;
  learnType:        'gain confidence' | 'lesson' | 'note' | null;
  learnNote:        string | null;
  // deprecated — kept for migration compat
  targetShape?:     ShapeVal | null;
  resultShape?:     ShapeVal | null;
}

export type StgIntent = 'approach' | 'arg' | 'layup' | 'recovery';

export interface StgShot {
  intent:           StgIntent;
  dist:             string;
  club:             string;
  // PRE — wind
  windStr:          WindStr | null;
  windDir:          WindDir | null;
  // PRE — lie
  lieQuality:       'clean' | 'rough' | 'sand' | 'divot' | 'bad' | null;
  lieBall:          'up' | 'buried' | null;
  lieSlope:         string[] | null;
  lieStance:        'stable' | 'unstable' | null;
  // PRE — target
  argType:          string | null;
  targetTraj:       TrajVal | null;
  targetStartLine:  StartLineVal | null;
  targetCurve:      CurveVal | null;
  // POST
  result:           string | null;
  resTraj:          TrajVal | null;
  resStartLine:     StartLineVal | null;
  resCurve:         CurveVal | null;
  feel:             FeelVal | null;
  commit:           string | null;
  learnType:        string | null;
  note:             string | null;
  // Phase 4A — eSG data
  leaveDistBucket?: LeaveDistBucket | null;
  // deprecated — kept for migration compat
  targetShape?:     ShapeVal | null;
  resShape?:        ShapeVal | null;
}

export interface PuttCard {
  dist:             string | null;
  distBucket?:      PuttDistBucket | null;   // Phase 4A — eSG data
  slope:            'flat' | 'uphill' | 'downhill' | 'up-down' | 'down-up' | null;
  break:            'straight' | 'left' | 'right' | 'double' | null;
  preSpeed:         number | null;
  outcome:          'made' | 'missed' | null;
  postSpeed:        'short' | 'good' | 'long' | null;
  startLine:        'left' | 'good' | 'right' | null;
  read:             ReadVal | null;
  feel:             PuttFeelVal | null;
  note:             string | null;
}

export interface HoleFormState {
  par:              number;
  score:            number;
  teeClub:          string;
  teeCarry:         string;
  teeRoutine:       TeeRoutine;
  stgShots:         StgShot[];
  puttCards:         PuttCard[];
  notes:            string;
  shotsToGreenOverride: number | null;
  puttsOverride?:   number | null;
}

export interface HoleData {
  id?:              string;
  roundId:          string;
  holeNum:          number;
  par:              number;
  score:            number;
  teeRoutine:       TeeRoutine;
  stgShots:         StgShot[];
  puttCards:        PuttCard[];
  notes:            string;
  savedAt?:         string;
}

export interface Round {
  id:               string;
  userId:           string;
  course:           string;
  date:             string;
  tee:              string;
  handicap:         number | null;
  rating:           number | null;
  holes:            number;
  greenSpeed:       number;
  weather:          WeatherVal | null;
  temperature:      number | null;
  roundTime:        string | null;
  inputMode:        InputMode;
  createdAt:        string;
}

export interface UserSettings {
  userId:           string;
  defaultMode:      InputMode;
  updatedAt:        string;
}
