"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Stamp, TextInput, SelectInput } from "@/components/ui";
import { cta } from "@/content/cta";
import { submitContactRequest, validateContactField, validateContactForm } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion-tokens";

const empty = { name: "", company: "", headcount: "", phone: "", email: "" };

/** Demo request form. Validates on blur, submits to the mock `submitContactRequest`, then shows the cachet. */
export default function ContactForm({ className }) {
  const { form, success } = cta;
  const formRef = useRef(null);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | error | success
  const [result, setResult] = useState(null);

  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    // Once a field showed an error, re-check live so the message clears as soon as it is fixed.
    if (errors[key]) setErrors((e) => ({ ...e, [key]: validateContactField(key, value) }));
  };
  const blur = (key) => () => setErrors((e) => ({ ...e, [key]: validateContactField(key, values[key]) }));

  async function onSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;
    const found = validateContactForm(values);
    setErrors(found);
    if (Object.keys(found).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setStatus("loading");
    try {
      const res = await submitContactRequest(values);
      setResult(res);
      setStatus("success");
    } catch (err) {
      if (err?.errors) setErrors(err.errors);
      setStatus("error");
    }
  }

  function reset() {
    setValues(empty);
    setErrors({});
    setResult(null);
    setStatus("idle");
  }

  const common = (key) => ({ value: values[key], onBlur: blur(key), error: errors[key], "aria-required": "true", disabled: status === "loading" });

  return (
    <div className={cn("relative rounded-xl border border-border bg-surface p-[1.5em] text-fg shadow-lg md:p-[2em]", className)}>
      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {status === "success" ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.panel, ease: ease.out }}
              className="flex flex-col items-center gap-[1.25em] py-[1.5em] text-center"
            >
              <Stamp label={success.stamp} sub={success.stampSub} />
              <h3 className="font-display text-h2 font-semibold text-fg">{success.title}</h3>
              <p className="max-w-[34ch] text-fg-secondary text-pretty">{success.text.replace("{name}", values.name.split(" ")[0]).replace("{phone}", values.phone)}</p>
              <p className="font-mono text-code text-fg-muted">
                {success.reference} <span className="text-fg">{result?.reference}</span>
              </p>
              <Button variant="secondary" onClick={reset}>{success.again}</Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              ref={formRef}
              noValidate
              onSubmit={onSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.base }}
              className="flex flex-col gap-[1.1em]"
              aria-label={form.title}
            >
              <div className="grid gap-[1.1em] sm:grid-cols-2">
                <TextInput label={form.fields.name.label} placeholder={form.fields.name.placeholder} autoComplete={form.fields.name.autoComplete} onChange={set("name")} {...common("name")} />
                <TextInput label={form.fields.company.label} placeholder={form.fields.company.placeholder} autoComplete={form.fields.company.autoComplete} onChange={set("company")} {...common("company")} />
              </div>
              <SelectInput label={form.fields.headcount.label} placeholder={form.fields.headcount.placeholder} options={form.headcountOptions} onChange={set("headcount")} {...common("headcount")} />
              <div className="grid gap-[1.1em] sm:grid-cols-2">
                <TextInput type="tel" inputMode="tel" label={form.fields.phone.label} placeholder={form.fields.phone.placeholder} autoComplete={form.fields.phone.autoComplete} onChange={set("phone")} {...common("phone")} />
                <TextInput type="email" label={form.fields.email.label} placeholder={form.fields.email.placeholder} autoComplete={form.fields.email.autoComplete} onChange={set("email")} {...common("email")} />
              </div>
              {status === "error" && <p role="alert" className="text-sm text-danger-fg">{form.error}</p>}
              <Button type="submit" size="lg" loading={status === "loading"} className="w-full sm:w-auto sm:self-start">
                {status === "loading" ? form.submitting : form.submit}
              </Button>
              <p className="text-[0.8125em] text-fg-muted">{form.privacy}</p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
