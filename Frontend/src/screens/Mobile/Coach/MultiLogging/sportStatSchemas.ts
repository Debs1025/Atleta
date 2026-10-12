export interface SportStatSchema {
  sportDisplayName: string;
  isTimed: boolean;
  formatSummary: (stats: any) => string;
  primaryActions: {
    label: string;
    statKey: 'pts' | 'ast' | 'reb' | 'stl' | 'blk' | 'pf' | 'to';
    delta: number;
  }[];
  secondaryActions: {
    label: string;
    statKey: 'pts' | 'ast' | 'reb' | 'stl' | 'blk' | 'pf' | 'to';
    delta: number;
    icon: string;
    color: string;
  }[];
  multiPointOptions: {
    label: string;
    statKey: 'pts';
    delta: number;
  }[];
  tableHeaders: {
    label: string;
    key: 'pts' | 'ast' | 'reb' | 'stl' | 'blk' | 'pf' | 'to';
    width?: number;
  }[];
}

export function getSportStatSchema(rawSport: string = 'BASKETBALL'): SportStatSchema {
  const sport = (rawSport || 'BASKETBALL').toUpperCase();

  if (sport.includes('VOLLEY')) {
    return {
      sportDisplayName: 'VOLLEYBALL',
      isTimed: false,
      formatSummary: (s) =>
        `${s.pts || 0} KILLS • ${s.ast || 0} ACES • ${s.blk || 0} BLKS • ${s.reb || 0} DIGS`,
      primaryActions: [
        { label: '+KILL', statKey: 'pts', delta: 1 },
        { label: '+ACE', statKey: 'ast', delta: 1 },
        { label: '+BLOCK', statKey: 'blk', delta: 1 },
      ],
      secondaryActions: [
        { label: 'DIG (+1 DIG)', statKey: 'reb', delta: 1, icon: 'shield-outline', color: '#10B981' },
        { label: 'ASSIST (+1 AST)', statKey: 'stl', delta: 1, icon: 'share-outline', color: '#00D2FF' },
        { label: 'FAULT (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'ATTACK ERR (+1 ERR)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F59E0B' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'KILLS', key: 'pts' },
        { label: 'ACES', key: 'ast' },
        { label: 'BLKS', key: 'blk' },
        { label: 'DIGS', key: 'reb' },
        { label: 'FLTS', key: 'pf' },
        { label: 'ERRS', key: 'to' },
      ],
    };
  }

  if (sport.includes('PICKLE')) {
    return {
      sportDisplayName: 'PICKLEBALL',
      isTimed: false,
      formatSummary: (s) =>
        `${s.pts || 0} PTS • ${s.ast || 0} WINNERS • ${s.reb || 0} DINKS`,
      primaryActions: [
        { label: '+PT', statKey: 'pts', delta: 1 },
        { label: '+WINNER', statKey: 'ast', delta: 1 },
        { label: '+DINK', statKey: 'reb', delta: 1 },
      ],
      secondaryActions: [
        { label: 'FAULT (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'UNFORCED ERR (+1 ERR)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F59E0B' },
        { label: 'VOLLEY (+1 VLY)', statKey: 'blk', delta: 1, icon: 'flash-outline', color: '#00D2FF' },
        { label: 'ACE (+1 ACE)', statKey: 'stl', delta: 1, icon: 'star-outline', color: '#10B981' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'PTS', key: 'pts' },
        { label: 'WINNERS', key: 'ast' },
        { label: 'DINKS', key: 'reb' },
        { label: 'VOLLEYS', key: 'blk' },
        { label: 'FAULTS', key: 'pf' },
        { label: 'ERRORS', key: 'to' },
      ],
    };
  }

  // Default Basketball schema
  return {
    sportDisplayName: sport || 'BASKETBALL',
    isTimed: false,
    formatSummary: (s) =>
      `${s.pts || 0} PTS • ${s.ast || 0} AST • ${s.reb || 0} REB`,
    primaryActions: [
      { label: '+PTS', statKey: 'pts', delta: 1 },
      { label: '+AST', statKey: 'ast', delta: 1 },
      { label: '+REB', statKey: 'reb', delta: 1 },
    ],
    secondaryActions: [
      { label: 'FOUL (+1 PF)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
      { label: 'TURNOVER (+1 TO)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F59E0B' },
      { label: 'STEAL (+1 STL)', statKey: 'stl', delta: 1, icon: 'hand-left-outline', color: '#10B981' },
      { label: 'BLOCK (+1 BLK)', statKey: 'blk', delta: 1, icon: 'shield-checkmark-outline', color: '#00D2FF' },
    ],
    multiPointOptions: [
      { label: '+2 PTS (FG)', statKey: 'pts', delta: 2 },
      { label: '+3 PTS (3PT)', statKey: 'pts', delta: 3 },
    ],
    tableHeaders: [
      { label: 'PTS', key: 'pts' },
      { label: 'REB', key: 'reb' },
      { label: 'AST', key: 'ast' },
      { label: 'STL', key: 'stl' },
      { label: 'BLK', key: 'blk' },
      { label: 'PF', key: 'pf' },
      { label: 'TO', key: 'to' },
    ],
  };
}
