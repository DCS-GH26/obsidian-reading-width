import { App, PluginSettingTab, Setting } from 'obsidian';
import type ReadingWidthPlugin from './main';
import { DEFAULT_WIDTH, MAX_STEP, MAX_WIDTH, MIN_STEP, MIN_WIDTH, SLIDER_STEP, parseStep } from './width';

export class WidthSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ReadingWidthPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Ширина полосы чтения')
      .setDesc(`От ${MIN_WIDTH} до ${MAX_WIDTH} px. Работает при включённом «Ширина строки читаемая» в разделе «Редактор». «По умолчанию» возвращает стандартные ${DEFAULT_WIDTH} px.`)
      .addSlider((s) => s
        .setLimits(MIN_WIDTH, MAX_WIDTH, SLIDER_STEP)
        .setValue(this.plugin.getWidth() ?? DEFAULT_WIDTH)
        .setDynamicTooltip()
        .onChange((v) => this.plugin.setWidth(v)))
      .addExtraButton((b) => b
        .setIcon('rotate-ccw')
        .setTooltip('По умолчанию')
        .onClick(() => { this.plugin.setWidth(null); this.display(); }));

    new Setting(containerEl)
      .setName('Шаг команд «Шире» и «Уже»')
      .setDesc(`От ${MIN_STEP} до ${MAX_STEP} px.`)
      .addText((t) => t
        .setValue(String(this.plugin.settings.step))
        .onChange((v) => {
          this.plugin.settings.step = parseStep(Number(v));
          this.plugin.saveSoon();
        }));
  }
}
