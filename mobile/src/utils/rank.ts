export interface RankInfo {
  title: string;
  icon: string;
  color: string;
}

export const calculateUserRank = (points: number): RankInfo => {
  if (points > 150) {
    return { title: 'Campus Hero', icon: '', color: '#F59E0B' };
  } else if (points > 100) {
    return { title: 'Study Mentor', icon: '', color: '#8B5CF6' };
  } else if (points > 50) {
    return { title: 'Scholar', icon: '', color: '#10B981' };
  } else {
    return { title: 'Rookie', icon: '', color: '#94A3B8' };
  }
};
