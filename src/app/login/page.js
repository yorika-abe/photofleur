import LoginForm from './LoginForm'

export const metadata = { title: 'ログイン | PhotoFleur' }

export default async function LoginPage({ searchParams }) {
  const params = await searchParams
  const redirect = params.redirect || '/'
  const isAlreadyRegistered = params.notice === 'already_registered'
  const noticeEmail = params.email || ''
  const errorParam = params.error || ''
  const lineError = errorParam.startsWith('line_') && errorParam !== 'line_blocked'
  const lineBlocked = errorParam === 'line_blocked'

  return (
    <LoginForm
      redirect={redirect}
      isAlreadyRegistered={isAlreadyRegistered}
      noticeEmail={noticeEmail}
      lineError={lineError}
      lineBlocked={lineBlocked}
    />
  )
}
