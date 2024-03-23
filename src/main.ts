import { App, Editor, EditorPosition, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder, Vault } from 'obsidian';
import { generateFlashcards } from "./flashcards";

interface FlashcardsSettings {
  apiKey: string;
  model: string;
  inlineSeparator: string;
  generationTag: string;
}

const DEFAULT_SETTINGS: FlashcardsSettings = {
  apiKey: "",
  model: "gpt-4",
  inlineSeparator: "::",
  generationTag: "#generate"
};

export default class FlashcardsLLMPlugin extends Plugin {
  settings: FlashcardsSettings;

  async onload() {
    await this.loadSettings();

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new FlashcardsSettingsTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle("Generete flashcards")
              .setIcon("cpu")
              .onClick(async () => {
                this.onGenerateFlashcards(file)
              });
          });
        }
      })
    );
  }

  async onGenerateFlashcards(file: TFolder) {
    const apiKey = this.settings.apiKey;
    if (!apiKey) {
      new Notice("API key is not set in plugin settings");
      return;
    }

    const model = this.settings.model;
    const sep = this.settings.inlineSeparator

    file.children.forEach((file) => {
      if (file instanceof TFile) {
        this.genereteFlashcards(file, apiKey, model, sep)
      }
    })

  }

  async genereteFlashcards(file: TFile, apiKey: string, model: string, sep: string | undefined) {
    const contents: string = await this.app.vault.read(file)

    let wholeText = contents

    // Check if #generate tag is present
    const generateTag = this.settings.generationTag
    if (!wholeText.includes(generateTag)) return;
  
    const headerRegex = /\n\n### Generated Flashcards\n/;
    const hasHeader = headerRegex.test(wholeText);

    // Check if the #flashcards tag is already present
    const tagRegex = /\n#flashcards.*\n/;
    const hasTag = tagRegex.test(wholeText);

    new Notice("Generating flashcards...");
    try {
      const generatedCards = (await (generateFlashcards(wholeText, apiKey, model, sep))).split("\n");

      let updatedText = "";

      // Generate and add the header if not already present
      if (!hasHeader) {
        updatedText += "\n\n### Generated Flashcards\n";
      }

      // Generate and add the #flashcards tag if not already present
      if (!hasTag) {
        updatedText += "#flashcards\n";
      }

      updatedText += "\n\n" + generatedCards.map((s: string) => s.trim()).join('\n\n');

      wholeText = wholeText.concat(updatedText)

      const tagRegex = new RegExp(`\\${generateTag}(\\s|$)`, 'g');
      wholeText = wholeText.replace(tagRegex, '');

      new Notice("Flashcards succesfully generated!");
    } catch (error) {
      console.error("Error generating flashcards:", error);
      new Notice("Error generating flashcards. Please check the plugin console for details.");
    }

    this.app.vault.modify(file, wholeText)
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class FlashcardsSettingsTab extends PluginSettingTab {
  plugin: FlashcardsLLMPlugin;

  constructor(app: App, plugin: FlashcardsLLMPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h3", {text: "Model settings"})

    new Setting(containerEl)
    .setName("OpenAI API key")
    .setDesc("Enter your OpenAI API key")
    .addText((text) =>
      text
      .setPlaceholder("API key")
      .setValue(this.plugin.settings.apiKey)
      .onChange(async (value) => {
        this.plugin.settings.apiKey = value;
        await this.plugin.saveSettings();
      })
    );

    new Setting(containerEl)
    .setName("Model")
    .setDesc("Which language model to use")
    .addDropdown((dropdown) =>
      dropdown
      .addOption("gpt-3.5-turbo", "gpt-3.5-turbo")
      .addOption("gpt-4", "gpt-4")
      .setValue(this.plugin.settings.model)
      .onChange(async (value) => {
        this.plugin.settings.model = value;
        await this.plugin.saveSettings();
      })
    );

    containerEl.createEl("h3", {text: "Preferences"})

    new Setting(containerEl)
    .setName("Separator for inline flashcards")
    .setDesc("Note that after changing this you have to manually edit any flashcards you already have")
    .addText((text) =>
      text
      .setPlaceholder("::")
      .setValue(this.plugin.settings.inlineSeparator)
      .onChange(async (value) => {
        this.plugin.settings.inlineSeparator = value;
        await this.plugin.saveSettings();
      })
    );


  }
}
