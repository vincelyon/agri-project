"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const FormContext = createContext({ errors: {}, values: {} });

export function SubmitButton({ children, pendingLabel = "Saving…", className = "btn btn-primary" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * Form bound to a Server Action via useActionState. Shows a form-level banner,
 * passes field errors / echoed values to child fields, and refills inputs when
 * validation fails (React resets uncontrolled forms after every action).
 */
export function ActionForm({ action, children, submit = "Save", className = "space-y-4", onSuccess }) {
  const [state, formAction] = useActionState(action, { ok: null });
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;

  useEffect(() => {
    if (state.ok) successRef.current?.(state);
  }, [state]);

  return (
    <FormContext.Provider
      value={{ errors: state.ok === false ? (state.fieldErrors ?? {}) : {}, values: state.ok === false ? (state.values ?? {}) : {} }}
    >
      <form action={formAction} className={className} noValidate={false}>
        {state.ok === false && state.error && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            <strong className="font-semibold">Error: </strong>
            {state.error}
          </p>
        )}
        {state.ok === true && state.message && (
          <p role="status" className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
            ✓ {state.message}
          </p>
        )}
        {children}
        {submit && (
          <div className="pt-1">
            <SubmitButton>{submit}</SubmitButton>
          </div>
        )}
      </form>
    </FormContext.Provider>
  );
}

function useField(name, defaultValue) {
  const { errors, values } = useContext(FormContext);
  const id = useId();
  const error = errors[name];
  const value = values[name] !== undefined ? values[name] : defaultValue;
  return { id, error, value, errorId: error ? `${id}-error` : undefined };
}

function FieldShell({ id, label, error, errorId, hint, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && <span aria-hidden="true" className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ name, label, defaultValue = "", type = "text", hint, required, ...rest }) {
  const f = useField(name, defaultValue);
  return (
    <FieldShell {...f} label={label} hint={hint} required={required}>
      <input
        id={f.id}
        name={name}
        type={type}
        defaultValue={f.value ?? ""}
        required={required}
        aria-invalid={Boolean(f.error)}
        aria-describedby={f.errorId}
        className={`input ${f.error ? "input-error" : ""}`}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({ name, label, defaultValue = "", hint, required, rows = 3, ...rest }) {
  const f = useField(name, defaultValue);
  return (
    <FieldShell {...f} label={label} hint={hint} required={required}>
      <textarea
        id={f.id}
        name={name}
        rows={rows}
        defaultValue={f.value ?? ""}
        required={required}
        aria-invalid={Boolean(f.error)}
        aria-describedby={f.errorId}
        className={`input ${f.error ? "input-error" : ""}`}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({ name, label, options, defaultValue = "", placeholder, hint, required, ...rest }) {
  const f = useField(name, defaultValue);
  return (
    <FieldShell {...f} label={label} hint={hint} required={required}>
      <select
        key={String(f.value ?? "")} // remount so an echoed value is re-applied after React resets the form
        id={f.id}
        name={name}
        defaultValue={String(f.value ?? "")}
        required={required}
        aria-invalid={Boolean(f.error)}
        aria-describedby={f.errorId}
        className={`input ${f.error ? "input-error" : ""}`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ name, label, defaultChecked = false, hint }) {
  const { errors, values } = useContext(FormContext);
  const id = useId();
  const checked = values[name] !== undefined ? values[name] === "on" : defaultChecked;
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input id={id} name={name} type="checkbox" defaultChecked={checked} className="h-4 w-4 rounded border-slate-300" />
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {errors[name] && <p className="mt-1 text-xs font-medium text-red-700">{errors[name]}</p>}
    </div>
  );
}

/**
 * Product dropdown that shows the live available quantity for the selected
 * product (used by stock-in/out/adjust forms).
 */
export function ProductSelect({ products, name = "productId", label = "Product", defaultValue = "", showAvailable = true }) {
  const f = useField(name, defaultValue);
  const ref = useRef(null);
  const [selected, setSelected] = useState(String(f.value ?? ""));

  // Re-sync when the server echoes the submitted value back after a validation error.
  useEffect(() => {
    setSelected(String(f.value ?? ""));
  }, [f.value]);

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const sync = () => setTimeout(() => setSelected(ref.current?.value ?? ""), 0);
    form.addEventListener("reset", sync);
    return () => form.removeEventListener("reset", sync);
  }, []);

  const product = products.find((p) => String(p.id) === selected);
  return (
    <FieldShell {...f} label={label} required>
      <select
        key={String(f.value ?? "")}
        ref={ref}
        id={f.id}
        name={name}
        required
        defaultValue={String(f.value ?? "")}
        onChange={(e) => setSelected(e.target.value)}
        aria-invalid={Boolean(f.error)}
        aria-describedby={f.errorId}
        className={`input ${f.error ? "input-error" : ""}`}
      >
        <option value="">Select a product…</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.sku})
          </option>
        ))}
      </select>
      {showAvailable && product && (
        <p className="mt-1 text-sm text-slate-700" aria-live="polite">
          Available: <strong>{product.onHand}</strong> {product.unit}
        </p>
      )}
    </FieldShell>
  );
}
