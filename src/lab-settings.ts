import { Modal, Notice, Setting, type App } from 'obsidian';
import type QiaomuRssPlugin from './main';
import { t } from './i18n';

export class LabSettingsModal extends Modal {
  constructor(app: App, private plugin: QiaomuRssPlugin, private adminOnly = false) { super(app); }
  onOpen() {
    this.modalEl.addClass('qrs-modal', 'qrs-lab-settings');
    if (this.adminOnly) {
      this.modalEl.addClass('qrs-lab-admin-dialog'); this.setTitle(t('lab.advanced'));
      this.renderAdmin(this.contentEl); this.contentEl.querySelector<HTMLInputElement>('input[type=email]')?.focus(); return;
    }
    this.setTitle(t('lab.collection'));
    const settings = this.plugin.state.settings;
    new Setting(this.contentEl).setName(t('lab.enable')).setDesc(t('lab.shortDescription')).addToggle(toggle => toggle.setValue(settings.labCollection).onChange(async value => {
      settings.labCollection = value; await this.plugin.persist(); this.plugin.refreshPersonalViews(); if (value) void this.plugin.checkCollectionJobs();
    }));
    let draft = settings.labInviteCode, busy = false;
    const row = new Setting(this.contentEl).setName(t('lab.invite'));
    const status = row.descEl.createSpan({ attr: { role: 'status', 'aria-live': 'polite' } });
    const refreshStatus = () => status.setText(t(draft === settings.labInviteCode && settings.labInviteVerified ? 'lab.verified' : 'lab.notVerified'));
    const error = this.contentEl.createEl('p', { cls: 'qrs-subscription-error', attr: { role: 'alert' } });
    row.addText(text => {
      text.inputEl.type = 'password'; text.setValue(draft).onChange(value => { draft = value; error.setText(''); refreshStatus(); });
      row.nameEl.id = 'qrs-lab-invite-' + crypto.randomUUID(); text.inputEl.setAttribute('aria-labelledby', row.nameEl.id);
      row.addButton(button => {
        const verify = async () => {
          if (busy) return; busy = true; button.setDisabled(true); button.setButtonText(t('lab.verifying')); error.setText('');
          try { await this.plugin.verifyCollectionInvite(draft); if (status.isConnected) { refreshStatus(); new Notice(t('lab.verified')); } }
          catch (e) { if (error.isConnected) error.setText(e instanceof Error ? e.message : t('lab.unavailable')); }
          finally { busy = false; button.setDisabled(false); button.setButtonText(t('lab.verifySave')); }
        };
        button.setButtonText(t('lab.verifySave')).setCta().onClick(verify);
        text.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); void verify(); } });
      });
    });
    refreshStatus();
    new Setting(this.contentEl).setName(t('lab.myRequests')).setDesc(t('lab.requestsLocation')).addButton(button => button.setButtonText(t('lab.viewRequests')).onClick(() => { this.close(); void this.plugin.openCollectionChannel(); }));
    const advanced = this.contentEl.createEl('details', { cls: 'qrs-lab-advanced' });
    advanced.hidden = !this.plugin.collectionAdminAvailable();
    advanced.open = !advanced.hidden;
    advanced.createEl('summary', { text: t('lab.advanced') });
    const panel = advanced.createDiv();
    this.renderAdmin(panel);
  }
  private renderAdmin(panel: HTMLElement) {
    panel.empty(); panel.removeClass('qrs-lab-admin-form');
    if (this.plugin.collectionAdminAvailable()) {
      new Setting(panel).setName(t('lab.adminVerified', { name: this.plugin.collectionAdminName() })).setDesc(t('lab.adminSessionHint')).addButton(button => button.setButtonText(t('lab.logout')).onClick(async () => {
        try { await this.plugin.logoutCollectionAdmin(); } catch { /* Local administrator access is already cleared. */ }
        this.renderAdmin(panel);
      }));
      new Setting(panel).setName(t('lab.userRequests')).addButton(button => button.setButtonText(t('lab.viewRequests')).onClick(() => { this.close(); void this.plugin.openCollectionChannel(true); }));
      return;
    }
    panel.addClass('qrs-lab-admin-form');
    let email = '', password = '', busy = false;
    const mail = new Setting(panel).setName(t('lab.adminEmail')).addText(text => {
      text.inputEl.type = 'email'; text.inputEl.autocomplete = 'username'; text.setValue(email).onChange(value => { email = value; });
    });
    const secret = new Setting(panel).setName(t('lab.adminPassword'));
    const error = panel.createEl('p', { cls: 'qrs-subscription-error', attr: { role: 'alert' } });
    secret.addText(text => {
      text.inputEl.type = 'password'; text.inputEl.autocomplete = 'current-password';
      text.onChange(value => { password = value; error.setText(''); });
      const actions = new Setting(panel).setClass('qrs-lab-admin-actions');
      actions.addButton(button => {
        const verify = async () => {
          if (busy) return; busy = true; button.setDisabled(true); error.setText('');
          try { await this.plugin.verifyCollectionAdmin(email, password); password = ''; text.setValue(''); if (panel.isConnected) this.renderAdmin(panel); }
          catch (e) { error.setText(e instanceof Error ? e.message : t('lab.adminDenied')); }
          finally { busy = false; button.setDisabled(false); }
        };
        button.setButtonText(t('lab.verifyAdmin')).setCta().onClick(verify);
        text.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); void verify(); } });
      });
    });
    for (const row of [mail, secret]) { row.nameEl.id = 'qrs-lab-field-' + crypto.randomUUID(); row.controlEl.querySelector('input')?.setAttribute('aria-labelledby', row.nameEl.id); }
  }
  onClose() { for (const input of this.contentEl.querySelectorAll<HTMLInputElement>('input[type=password]')) input.value = ''; this.contentEl.empty(); }
}
