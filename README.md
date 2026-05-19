# PhotoFleur

撮影会予約サービス。モデルとカメラマンをつなぐ予約・管理プラットフォーム。

## 概要

- カメラマンがイベント・撮影枠を予約
- モデルがシフト提出・プロフィール管理
- スタッフが受付・運営管理
- 運営が承認・通知・コンテンツ管理

## 技術スタック

| 分類 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| データベース | Supabase (PostgreSQL) |
| 認証 | Supabase Auth |
| ストレージ | Cloudflare R2 |
| メール送信 | Resend |
| LINE通知 | LINE Messaging API |
| デプロイ | Vercel |

## 主な機能

**一般ユーザー**
- スケジュール・イベント閲覧・予約
- カート決済（QRコード発行）
- リクエスト撮影予約
- ブログ閲覧

**モデルポータル**
- プロフィール編集・承認申請
- シフト提出・管理
- 予約状況確認・カメラマンSNS確認
- 活動手引きPDF閲覧

**スタッフポータル**
- 活動手引きPDF閲覧
- プロフィール・表示名設定

**管理画面**
- モデル・スタッフ・ユーザー権限管理
- イベント・予約管理
- LINE一斉送信・自動通知テンプレート設定
- メディア管理（ヒーロー画像・PDF）
- ショップ・グッズ・非公開商品管理

## 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
NEXT_PUBLIC_R2_PUBLIC_URL=
RESEND_API_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_GROUP_ID=
MODEL_INVITE_TOKEN=
STAFF_INVITE_TOKEN=
CRON_SECRET=
