"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Download, Languages, Mic, Shield, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";
import { localeLabels } from "@/lib/missions";
import type { HintLocale } from "@/lib/types";

export function SettingsPanel() {
  const [locale, setLocale] = useState<HintLocale>("hi-IN");
  const [captions, setCaptions] = useState(false);
  const [research, setResearch] = useState(false);
  const [exported, setExported] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="settings-sections">
      <section className="settings-card">
        <div className="settings-card-title">
          <Languages aria-hidden="true" />
          <div><h2>Practice preferences</h2><p>Change the support you see during Coach Mode.</p></div>
        </div>
        <div className="setting-row">
          <label htmlFor="hint-locale"><strong>Hint language</strong><small>Native-script help during supported practice</small></label>
          <select id="hint-locale" value={locale} onChange={(event) => setLocale(event.target.value as HintLocale)}>
            {(Object.entries(localeLabels) as [HintLocale, (typeof localeLabels)[HintLocale]][]).map(
              ([code, label]) => <option value={code} key={code}>{label.label} · {label.native}</option>,
            )}
          </select>
        </div>
        <div className="setting-row">
          <span><strong>Accessibility captions</strong><small>Show a transcript in Real-World Mode and mark results caption-assisted</small></span>
          <button className={`switch ${captions ? "on" : ""}`} role="switch" aria-checked={captions} onClick={() => setCaptions((value) => !value)}>
            <i />
          </button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-title">
          <Mic aria-hidden="true" />
          <div><h2>Audio</h2><p>Choose and check the device used for live missions.</p></div>
        </div>
        <div className="setting-row">
          <label htmlFor="microphone"><strong>Microphone</strong><small>Browser default · clear signal</small></label>
          <select id="microphone"><option>System default microphone</option></select>
        </div>
        <Button variant="secondary"><Mic aria-hidden="true" /> Run sound check</Button>
      </section>

      <section className="settings-card">
        <div className="settings-card-title">
          <Shield aria-hidden="true" />
          <div><h2>Privacy and consent</h2><p>Optional choices never affect your beta access.</p></div>
        </div>
        <div className="setting-row">
          <span><strong>Core live processing</strong><small>Required · Version 1.0 accepted 29 July 2026</small></span>
          <span className="status-chip"><Check aria-hidden="true" /> Active</span>
        </div>
        <div className="setting-row">
          <span><strong>Research participation</strong><small>Include de-identified learning signals in fairness audits</small></span>
          <button className={`switch ${research ? "on" : ""}`} role="switch" aria-checked={research} onClick={() => setResearch((value) => !value)}>
            <i />
          </button>
        </div>
        <div className="setting-row">
          <span><strong>Model improvement</strong><small>Optional transcript use · off by default</small></span>
          <span className="status-chip neutral">Off</span>
        </div>
        <p className="no-audio-note">VishwaVaani v1 never retains raw voice audio.</p>
      </section>

      <section className="settings-card danger-zone">
        <div className="settings-card-title">
          <Shield aria-hidden="true" />
          <div><h2>Your account data</h2><p>Export a copy or permanently close your account.</p></div>
        </div>
        <div className="data-actions">
          <Button variant="secondary" onClick={() => setExported(true)}>
            {exported ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}
            {exported ? "Export requested" : "Request data export"}
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 aria-hidden="true" /> Delete account</Button>
        </div>
        {exported && <p className="request-status" role="status">Your encrypted export will be available for 24 hours after it is prepared.</p>}
      </section>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Close className="dialog-close" aria-label="Close"><X aria-hidden="true" /></Dialog.Close>
            <Dialog.Title>Delete your VishwaVaani account?</Dialog.Title>
            <Dialog.Description>
              Access will be revoked immediately. Active-system and processor data will be removed
              within seven days; backups expire within 35 days. This cannot be undone.
            </Dialog.Description>
            <div className="field">
              <label htmlFor="delete-confirmation">Type DELETE to confirm</label>
              <input id="delete-confirmation" placeholder="DELETE" />
            </div>
            <div className="dialog-actions">
              <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
              <Button variant="danger">Permanently delete</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
