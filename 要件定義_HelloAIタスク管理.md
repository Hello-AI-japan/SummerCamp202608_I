# 要件定義・詳細設計 1枚

**プロダクト名（仮）**: HelloBoard / TeamTrack など後で決定
**チーム**: 2名
**お題の切り口**: A. コミュニティ運営の無駄

---

## 1. コンセプト（誰の・どんな無駄を・なぜ）

> **Hello AI! の運営メンバー**は、**誰が何を担当していて今どこまで進んでいるのか**が、Slackの会話やミーティングでの口約束に埋もれて分からなくなっている。**担当と進捗が一箇所にまとまっていない**ため、「あれって誰がやってるんだっけ」という確認が何度も繰り返され、抜け漏れとタスクの重複が発生する。**管理者がタスクを明示的に割り当て、全メンバーの担当状況を1画面で見えるようにする**ことで解決する。

### 「見える化」の先にある行動変化（評価軸25点はここ）

- 「誰がやってる？」の確認Slackが**ゼロ**になる
- 未着手のまま放置されているタスクが**一覧の先頭に出る**ので、期限前に気づける
- 割り当て時点で担当が確定するので、**同じ作業を2人がやる**事故がなくなる



---

## 2. スコープ

### Must（これだけで完走できる設計）

| # | 機能 | 完了条件 |
|---|---|---|
| M1 | ログイン＋ロール判定 | メール＋パスワードで登録・ログインでき、admin / member が区別される |
| M2 | タスク作成・割り当て（管理者のみ） | 管理者がタイトル・担当者・期限を指定してタスクを作成できる。メンバーには作成ボタンが出ない |
| M3 | 担当者別ボード＋進捗更新 | 全メンバーのタスクが担当者ごとに一覧表示され、担当者本人がステータスを変更できる |

### Should（時間が余ったら）

- 自分のタスクだけを絞り込むフィルタ
- タスクへのコメント機能
- 期限切れの赤色ハイライト、期限順ソート
- 管理者によるメンバーのロール変更UI

### Could（やらない。スライドの「今後の展望」に書く）

- Slack通知連携
- ファイル添付、カテゴリ・タグ管理
- ガントチャート、工数集計
- 3つ目以降のロール（閲覧専用など）

---

## 3. DBスキーマ（Supabase / PostgreSQL）

認証は Supabase Auth（`auth.users`）を利用。自前実装しない。テーブルは**2つだけ**。

### profiles（ユーザー情報とロール）

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | `auth.users.id` を参照 |
| display_name | text | 表示名 |
| role | text | `admin` / `member`、default `member` |
| created_at | timestamptz | default now() |

> サインアップ時にトリガーで自動作成する（`auth.users` の INSERT に対する trigger）。
> これを作らないと、登録したのにプロフィールが無いユーザーが生まれます。

### tasks

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| title | text | NOT NULL |
| description | text | |
| assignee_id | uuid FK → profiles.id | null許容（未割当） |
| created_by | uuid FK → profiles.id | |
| due_at | timestamptz | null許容 |
| status | text | `todo` / `in_progress` / `done`、default `todo` |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | |

---

## 4. ⚠ RLS設計（ここが今回の最大の難所）

### ポリシー方針

| 対象 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| tasks | **全員が全件**（要件そのもの） | adminのみ | adminまたは担当者本人 | adminのみ |
| profiles | 全員が全件 | トリガーで自動 | 本人の表示名／adminのrole変更 | なし |

### 地雷1: 無限再帰

`profiles` のポリシーの中で「このユーザーはadminか？」を判定するために `profiles` を SELECT すると、
**`infinite recursion detected in policy` エラー**で全クエリが死にます。初見だと原因が分からず30分溶けます。

**回避策**: ロール判定は `SECURITY DEFINER` 関数に切り出す。

```sql
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
```

以降のポリシーでは `using (public.is_admin())` の形で呼ぶ。

### 地雷2: 最初のadminが作れない

「adminしかタスクを作れない」設計なので、**最初の1人をadminにする手段がアプリ内に存在しません**。
→ Supabaseダッシュボードの Table Editor から手動で `role` を `admin` に書き換える。
この手順を忘れると、当日「誰もタスクを作れない」状態で固まります。**環境構築フェーズで必ず済ませること。**

### 地雷3: メール確認で登録が止まる

Supabase Authはデフォルトでメール確認が有効です。当日デモ用にアカウントを増やすとき、確認メールを待つ羽目になります。
→ Authentication の設定で **Confirm email をオフ**にしておく。

---

## 5. 画面遷移（3枚）

```
/login  ──ログイン──→  /  ──（adminのみ）──→  タスク作成モーダル
（Supabase Auth）      （ボード）
```

### `/` ボード（メイン画面）

- **上段: 自分のタスク**（ログインユーザーに割り当てられたもの）
- **下段: メンバー別セクション**。メンバーごとに担当タスクをカード表示
  - カード: タイトル / 期限 / ステータスバッジ
  - 期限切れは赤、今日締切は強調
- ステータス変更: カード上のセレクトまたはボタンで `todo → in_progress → done`
  - **自分のタスクとadminのみ操作可**。他人のカードは読み取り専用で表示
- 右上「＋タスク作成」ボタン: **adminにのみ表示**（サーバー側でも権限チェックすること）
- 未割当タスクの「未アサイン」セクションを設けると管理者が使いやすい

### `/login`

- メール＋パスワードのログイン／新規登録タブ切り替えのみ

---

## 6. API一覧（Next.js Route Handlers）

| メソッド | パス | 役割 | 権限 |
|---|---|---|---|
| GET | `/api/tasks` | 全タスク取得（profiles をjoinして担当者名も返す） | 全員 |
| POST | `/api/tasks` | タスク作成・割り当て | admin |
| PATCH | `/api/tasks/:id` | ステータス・担当者・期限の更新 | admin / 担当者本人 |
| DELETE | `/api/tasks/:id` | 削除 | admin |
| GET | `/api/members` | メンバー一覧（割り当て先の選択肢用） | 全員 |

計5本。これ以上増やさない。

> **UIで隠すだけでは不十分**。「adminのみ」の制御は RLS とAPI側の両方で行う。
> ここを「二重で防いだ」と説明できると技術評価に効きます。

---

## 7. 技術スタック（要項5章準拠）

| レイヤー | 技術 | 選定理由（スライドにそのまま使える） |
|---|---|---|
| フロント | Next.js (App Router) / TypeScript / Tailwind CSS | 情報が豊富、Cloudflareとの相性 |
| DB・認証 | Supabase (PostgreSQL, Auth, RLS) | 5限のRDB知識を直接活用。ロールベースの権限制御をDB層で完結でき、自前実装が不要 |
| インフラ | Cloudflare Workers / Pages | 規約必須。無料枠・デプロイ高速 |
| バージョン管理 | Git / GitHub（PRベース） | 7限・8限の実践 |
| AI | Claude Code | 10限の実践 |

### ⚠ 技術リスク

**Next.js を Cloudflare にデプロイする部分が最大の詰まりどころ**です（OpenNext / next-on-pages の設定）。
実装③のデプロイ工程で30分以上溶けたら、**Vite + React（静的） + Hono on Workers** に切り替える。
この切り替え基準を事前に決めておくこと自体が、スコープ管理の工夫としてスライドに書けます。

---

## 8. 当日タイムライン（要項4章に対応）

| 時間 | やること | 担当 |
|---|---|---|
| 0:00–0:05 | オリエン・役割確認 | 両名 |
| 0:05–0:35 | 本ドキュメントをレビュー・確定。`types/task.ts` の型を2人で合意 | 両名 |
| 0:35–1:35 | リポジトリ作成、CLAUDE.md、Supabase接続、テーブル＋RLS、**最初のadmin設定** | A: 認証・RLS / B: UI土台 |
| 1:35–1:40 | 中間チェック① | |
| 1:40–3:35 | M1・M2・M3の実装 | A: API＋権限制御 / B: ボードUI |
| 3:35–3:40 | 中間チェック②（Must完成判定） | |
| 3:40–4:35 | デプロイ、**デモ用シードデータ投入**、デモ動画、スライド | A: デプロイ / B: スライド |
| 4:35–5:20 | 発表・総括 | 両名 |

> **シードデータは必須**。空のボードを見せても課題解決が伝わりません。
> メンバー3〜4名分、タスク8〜10件（期限切れ・今日締切・完了済みを混ぜる）を用意しておく。

---

## 9. 事前準備チェックリスト（当日までに）

- [ ] Supabaseプロジェクト作成、接続情報を控える
- [ ] Supabase Auth の **Confirm email をオフ**に設定
- [ ] Cloudflareアカウント作成、GitHub連携を確認
- [ ] Hello AI! organization への権限確認（publicリポジトリ作成可能か）
- [ ] デモ用のダミーメンバー名・タスク内容を考えておく（実際のサークル運営タスクだと説得力が出る）

---

## 10. 役割分担（2名）

| | メンバーA | メンバーB |
|---|---|---|
| 主担当 | Supabase Auth、RLSポリシー、API（権限制御） | DBスキーマ定義、ボードUI、タスクカード、モーダル |
| ブランチ | `feature/auth-api` | `feature/board-ui` |
| 共通 | CLAUDE.md整備、相互PRレビュー（承認1名必須）、GitHub Actions | |

**衝突回避**: 最初の30分で `types/task.ts`（Task型・Profile型・Status型）だけ2人で確定させ、mainにマージしてから分岐する。
これをやらないと結合時に必ず揉めます。

---

## 11. スライド必須項目とのマッピング（要項8章）

| 必須項目 | 参照先 |
|---|---|
| 技術スタック | 7章 |
| なぜそれを選んだのか | 7章の選定理由列（特にRLSを選んだ理由は語りどころ） |
| Gitの活用内容・工夫点 | 10章＋当日のPR運用実績 |
| Agent活用の工夫点 | CLAUDE.md、Plan Mode、並列作業、Claude in Chromeでの動作検証 |
| コンセプト・作った理由 | 1章の1文をそのまま掲載 |
