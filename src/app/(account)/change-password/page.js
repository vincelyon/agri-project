import Link from "next/link";
import { requireUser } from "@/lib/auth.js";
import { changePasswordAction } from "@/app/actions/auth.js";
import { ActionForm, TextField } from "@/components/forms/ActionForm.jsx";

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  const forced = user.mustChangePassword;

  return (
    <main className="login-stage">
      <div className="login-stage__bg" aria-hidden="true">
        <img
          src="/agri-stock-hero.jpg"
          alt=""
          className="login-stage__image"
          width={1920}
          height={1080}
        />
        <div className="login-stage__veil" />
      </div>

      <div className="form-modal form-modal--standalone" role="dialog" aria-labelledby="change-password-title">
        <div className="form-modal__header">
          <h1 id="change-password-title" className="form-modal__title">
            Change password
          </h1>
          {!forced && (
            <Link href="/dashboard" className="form-modal__close" aria-label="Close">
              ×
            </Link>
          )}
        </div>
        <div className="form-modal__body">
          {forced ? (
            <p className="mb-4 text-sm text-orange-800">
              For security, you must choose a new password before continuing.
            </p>
          ) : (
            <p className="mb-4 text-sm text-slate-600">Signed in as {user.email}.</p>
          )}
          <ActionForm action={changePasswordAction} submit="Update password">
            <TextField
              name="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
            />
            <TextField
              name="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters."
              required
            />
            <TextField
              name="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
            />
          </ActionForm>
        </div>
      </div>
    </main>
  );
}