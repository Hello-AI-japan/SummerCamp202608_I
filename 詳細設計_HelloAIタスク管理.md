# 詳細設計

要件定義は [`要件定義_HelloAIタスク管理.md`](./要件定義_HelloAIタスク管理.md) を参照。
本ドキュメントは運営要項11限の型（要望→要求→検討→**要件**）のうち、要件を実現するための技術的な検討（DBスキーマ・RLS・画面遷移・API・技術スタック）を1枚にまとめたもの。

---

## 1. DBスキーマ（Supabase / PostgreSQL）

認証は Supabase Auth（`auth.users`）を利用。自前実装しない。テーブルは**3つ**（profiles / tasks / task_comments）。

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
| assignee_ids | uuid[] | 複数担当者。空配列で未割当（DBレベルのFK制約は配列要素には張れないため参照整合性はアプリ層で担保） |
| created_by | uuid FK → profiles.id | |
| due_at | timestamptz | null許容 |
| status | text | `todo` / `in_progress` / `done`、default `todo` |
| estimated_hours | numeric | null許容。M5の工数集計用 |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | |

### task_comments（M7）

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| task_id | uuid FK → tasks.id | on delete cascade |
| author_id | uuid FK → profiles.id | on delete set null |
| body | text | NOT NULL |
| created_at | timestamptz | default now() |

> tasksとは独立したテーブルにしている理由: コメントは「誰でも投稿できるが削除は投稿者本人かadminのみ」という、tasksの行単位ポリシー（admin/担当者のみ更新可）とは別の権限が必要。JSONB埋め込みだとRLSが行単位でしか制御できず、tasksのUPDATE権限自体を緩めることになり既存の権限設計を壊すため、専用テーブル＋専用RLSポリシーにした（CLAUDE.mdの「テーブルは2つのみ」からの唯一の例外）。

---

## 2. ⚠ RLS設計（ここが今回の最大の難所）

### ポリシー方針

| 対象 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| tasks | **全員が全件**（要件そのもの） | ログイン済み全員 | adminまたは担当者本人 | adminのみ |
| profiles | 全員が全件 | トリガーで自動 | 本人の表示名／adminのrole変更 | なし |
| task_comments | 全員が全件 | ログイン済み全員（`author_id = auth.uid()`のみ） | なし（編集不可） | 投稿者本人またはadmin |

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

タスク作成は全員可能になったが、**タスク削除・ロール変更はadmin限定**のままであり、**最初の1人をadminにする手段がアプリ内に存在しません**。
→ Supabaseダッシュボードの Table Editor から手動で `role` を `admin` に書き換える。
この手順を忘れると、当日「誰も削除やロール変更ができない」状態で固まります。**環境構築フェーズで必ず済ませること。**

### 地雷3: メール確認で登録が止まる

Supabase Authはデフォルトでメール確認が有効です。当日デモ用にアカウントを増やすとき、確認メールを待つ羽目になります。
→ Authentication の設定で **Confirm email をオフ**にしておく。

---

## 3. 画面遷移（3枚）

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
- 右上「＋タスク作成」ボタン: **ログイン済み全員に表示**（サーバー側でも権限チェックすること）
- 未割当タスクの「未アサイン」セクションを設けると管理者が使いやすい

### `/login`

- メール＋パスワードのログイン／新規登録タブ切り替えのみ

### `/gantt`（M5、新規・Aさん担当）

- タスクを`due_at`ベースでガントチャート表示、担当者別の`estimated_hours`合計を集計表示

---

## 4. API一覧（Next.js Route Handlers）

| メソッド | パス | 役割 | 権限 |
|---|---|---|---|
| GET | `/api/tasks` | 全タスク取得（profiles をjoinして担当者名も返す） | 全員 |
| POST | `/api/tasks` | タスク作成・割り当て | ログイン済み全員 |
| PATCH | `/api/tasks/:id` | ステータス・担当者・期限の更新 | admin / 担当者本人 |
| DELETE | `/api/tasks/:id` | 削除 | admin |
| GET | `/api/members` | メンバー一覧（割り当て先の選択肢用） | 全員 |
| GET | `/api/tasks/:id/comments` | コメント一覧取得（M7） | ログイン済み全員 |
| POST | `/api/tasks/:id/comments` | コメント投稿（M7、`author_id`はサーバー側で`auth.uid()`固定） | ログイン済み全員 |
| DELETE | `/api/comments/:id` | コメント削除（M7） | 投稿者本人またはadmin |

M4〜M7分を含めて計8本。Bさんが`/api/tasks/:id/comments`と`/api/comments/:id`を新規実装する（既存5本は変更不要）。

> **UIで隠すだけでは不十分**。「adminのみ」の制御は RLS とAPI側の両方で行う。
> ここを「二重で防いだ」と説明できると技術評価に効きます。

---

## 5. 技術スタック（要項5章準拠）

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
