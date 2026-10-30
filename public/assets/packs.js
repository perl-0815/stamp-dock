import { TEMPLATES } from './templates.js';

export const PACKS = [
  { id: 'standard', name: 'スタンダード', tagline: 'まずは、この16個。', description: 'レビュー・進捗・お礼。毎日のやりとりをひと通り。', icon: 'grid', color: '#39775b', ids: ['lgtm', 'resolved', 'thanks', 'approved', 'wip', 'good-work', 'reviewed', 'fixed', 'roger', 'agree', 'helpful', 'checking', 'done', 'deployed', 'nice', 'no-problem'] },
  { id: 'code-review', name: 'コードレビュー', tagline: 'ひとつずつ、いいコードに。', description: 'レビュー依頼から指摘、修正、承認まで。', icon: 'check', color: '#547fc4', ids: ['lgtm', 'approved', 'nit', 'imo', 'fyi', 'must', 'suggestion', 'question', 'reviewing', 'review-request', 'reviewed', 'changes-requested', 'good-point', 'merge-ok', 'fixed', 'test-added'] },
  { id: 'progress', name: 'タスク進行', tagline: 'いま、こんなところ。', description: '着手・調査・保留・完了。状況をさっと共有。', icon: 'status', color: '#ad8437', ids: ['todo', 'started', 'doing', 'wip', 'investigating', 'checking', 'waiting', 'pending', 'blocked', 'on-hold', 'scheduled', 'almost', 'ready', 'done', 'resolved', 'verified'] },
  { id: 'release-ops', name: 'リリース・運用', tagline: 'ビルドから、その先まで。', description: 'テスト、デプロイ、監視、障害対応のひとこと。', icon: 'code', color: '#3e8e8e', ids: ['ship-it', 'pr-open', 'merged', 'build-passed', 'tests-passed', 'green', 'deployed', 'release', 'hotfix', 'rollback', 'maintenance', 'recovered', 'monitoring', 'backup', 'safe', 'breaking'] },
  { id: 'team-chat', name: 'チームの会話', tagline: 'いつもの会話に、ひと押し。', description: 'あいさつ、お礼、お願い。チームで使う日常セット。', icon: 'message', color: '#cb6b85', ids: ['thanks', 'good-work', 'roger', 'please', 'agree', 'helpful', 'good-morning', 'bye', 'brb', 'checking-soon', 'will-do', 'need-help', 'share', 'no-problem', 'take-time', 'back'] },
  { id: 'coffee-break', name: 'ひとやすみ', tagline: 'コードの合間に、ひと息。', description: '休憩と、思わずうなずくエンジニアあるある。', icon: 'coffee', color: '#8d78b4', ids: ['coffee', 'lunch', 'sleep', 'rubber-duck', 'local-works', 'why', 'suddenly', 'pray', 'yoshi', 'hmm', 'weekend', 'commit', 'one-more', 'it-depends', 'small-step', 'happy-coding'] },
];

const templatesById = new Map(TEMPLATES.map(stamp => [stamp.id, stamp]));
export function packStamps(pack) {
  return pack.ids.map(id => {
    const stamp = templatesById.get(id);
    if (!stamp) throw new Error(`パックに含まれるスタンプが見つかりません: ${id}`);
    return stamp;
  });
}
