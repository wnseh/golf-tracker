export type WindDir = 'down' | 'dl' | 'dr' | 'left' | 'right' | 'ul' | 'ur' | 'into' | 'calm';
export type WindStr = 'none' | 'weak' | 'strong' | 'gusty';
export type ShapeVal = 'duck-hook' | 'hook' | 'pull' | 'draw' | 'straight' | 'fade' | 'push' | 'slice' | 'shank';
export type TrajVal = 'low' | 'mid' | 'high';
export type FeelVal = 'flushed' | 'toe' | 'heel' | 'high' | 'low';
export type ReadVal = 'R--' | 'R-' | 'R0' | 'R+' | 'R++';

export interface TeeRoutine {
  // PRE
  windStr:      WindStr | null;
  windDir:      WindDir | null;
  targetTraj:   TrajVal | null;
  targetShape:  ShapeVal | null;
  // POST
  landing:      'FW' | 'RO' | 'BK' | 'OB' | null;
  actualCarry:  string | null;
  resultTraj:   TrajVal | null;
  resultShape:  ShapeVal | null;
  feel:         FeelVal | null;
  commit:       string | null;
  learnType:    'positive' | 'lesson' | 'neutral' | null;
  learnNote:    string | null;
}

export type StgIntent = 'approach' | 'arg' | 'layup' | 'recovery';

export interface StgShot {
  intent:       StgIntent;
  dist:         string;
  club:         string;
  // PRE — wind
  windStr:      WindStr | null;
  windDir:      WindDir | null;
  // PRE — lie
  lieQuality:   'clean' | 'rough' | 'sand' | 'divot' | 'bad' | null;
  lieBall:      'up' | 'buried' | null;
  lieSlope:     'uphill' | 'downhill' | 'toe-up' | 'toe-dn' | null;
  lieStance:    'stable' | 'unstable' | null;
  // PRE — target
  argType:      string | null;
  targetTraj:   TrajVal | null;
  targetShape:  ShapeVal | null;
  // POST
  result:       string | null;
  resTraj:      TrajVal | null;
  resShape:     ShapeVal | null;
  feel:         FeelVal | null;
  commit:       string | null;
  learnType:    string | null;
  note:         string | null;
}

export interface PuttCard {
  dist:         string | null;
  slope:        'flat' | 'uphill' | 'downhill' | 'up-down' | 'down-up' | null;
  break:        'straight' | 'left' | 'right' | 'double' | null;
  preSpeed:     'slow' | 'medium' | 'fast' | null;
  outcome:      'made' | 'missed' | null;
  postSpeed:    'short' | 'good' | 'long' | null;
  startLine:    'left' | 'good' | 'right' | null;
  read:         ReadVal | null;
  feel:         FeelVal | null;
  note:         string | null;
}

export interface HoleData {
  id?:          string;
  roundId:      string;
  holeNum:      number;
  par:          number;
  score:        number;
  teeRoutine:   TeeRoutine;
  stgShots:     StgShot[];
  puttCards:    PuttCard[];
  notes:        string;
  savedAt?:     string;
}

export interface Round {
  id:           string;
  userId:       string;
  course:       string;
  date:         string;
  tee:          string;
  handicap:     number | null;
  rating:       number | null;
  holes:        number;
  createdAt:    string;
}
