# HelloBoard

Hello AI! サークルの運営メンバー向けタスク管理アプリ。管理者・メンバー問わずタスクを作成・割り当てでき、担当状況と進捗を1画面で確認できる。

詳細は [`要件定義_HelloAIタスク管理.md`](./要件定義_HelloAIタスク管理.md) と [`詳細設計_HelloAIタスク管理.md`](./詳細設計_HelloAIタスク管理.md) を参照。

## セットアップ

1. 依存パッケージをインストール
   ```bash
   npm install
   ```
2. [Supabase](https://supabase.com) でプロジェクトを新規作成し、Project URL / anon key / service role key を控える
3. Supabaseダッシュボードの **SQL Editor** で [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) の内容を実行する
4. **Authentication > Settings** で **Confirm email** をオフにする（デモ用アカウントを増やす際に確認メール待ちにならないため）
5. `.env.local.example` をコピーして `.env.local` を作成し、値を埋める
   ```bash
   cp .env.local.example .env.local
   ```
6. 開発サーバーを起動
   ```bash
   npm run dev
   ```
7. `http://localhost:3000/login` で最初のユーザーを新規登録する
8. Supabaseダッシュボードの **Table Editor** で `profiles` テーブルを開き、そのユーザーの `role` を手動で `admin` に書き換える（アプリ内には最初のadminを作る手段がないため、必ず環境構築時に行う）
9. 本番ビルドの確認
   ```bash
   npm run build
   ```

## 権限まわりの検証

権限を変更した際は、必ず「できるべき操作」と「できてはいけない操作」の両方を確認する（CLAUDE.md参照）。

1. adminでログイン → タスク作成 → 担当者を割り当てられること
2. memberでログイン → タスクを作成できること、自分のタスクのステータスを変更できること
3. memberが他人のタスクを操作**できない**こと
4. memberがタスクを削除**できない**こと、adminはできること
