import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl, moment } from 'obsidian';

// Define the settings interface for the plugin
interface WxPusherReminderSettings {
	appToken: string;
	uid: string;
	// Number of days in advance to remind
	reminderDays: number;
	// Time to scan tasks daily (24-hour format)
	scanTime: string;
}

// Define the default settings
const DEFAULT_SETTINGS: WxPusherReminderSettings = {
	appToken: '',
	uid: '',
	// Default to remind 1 day before due date
	reminderDays: 1,
	// Default scan time is 14:00 (2 PM)
	scanTime: '14:00'
}

// Main plugin class
export default class WxPusherReminderPlugin extends Plugin {
	settings: WxPusherReminderSettings;

	async onload() {
		console.log('Loading WxPusher Reminder Plugin');
		// Load settings from Obsidian data
		await this.loadSettings();

		// Add a command to manually trigger the task check
		this.addCommand({
			"id": 'check-tasks-and-send-reminders',
			"name": 'Check tasks and send reminders',
			"callback": () => {
				this.checkTasksAndSendReminders();
			}
		});

		// Add a command to test WxPusher connection
		this.addCommand({
			"id": 'test-wxpusher-connection',
			"name": 'Test WxPusher Connection',
			"callback": () => {
				this.testWxPusherConnection();
			}
		});

		// Add the settings tab
		this.addSettingTab(new WxPusherReminderSettingTab(this.app, this));

		// Register an event to check tasks when Obsidian layout is ready (runs once on startup)
		this.app.workspace.onLayoutReady(() => {
			console.log('Obsidian layout ready, checking tasks...');
			this.checkTasksAndSendReminders();
			// Start the daily scan timer
			this.startDailyScanTimer();
		});

		// Optionally, check tasks when a file is opened (can be performance intensive)
		// this.registerEvent(this.app.workspace.on('file-open', (file) => {
		// 	console.log('File opened, checking tasks...');
		// 	this.checkTasksAndSendReminders();
		// }));
	}

	// Function called when the plugin is unloaded
	async onunload() {
		console.log('Unloading WxPusher Reminder Plugin');
	}

	// Load settings from Obsidian's storage
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// Save settings to Obsidian's storage
	async saveSettings() {
		 await this.saveData(this.settings);
	}

	// Function to test WxPusher connection
	async testWxPusherConnection() {
		console.log('Testing WxPusher connection...');
		const { appToken, uid } = this.settings;

		// Check if appToken or uid is missing
		 if (!appToken || !uid) {
			new Notice('WxPusher appToken or UID is not configured. Please configure it in the plugin settings.');
			console.log('WxPusher appToken or UID is missing for test.');
			return;
		}

		new Notice('Sending test message via WxPusher...');
		const testContent = 'This is a test message from the Obsidian WxPusher Reminder plugin.';
		const testSummary = 'WxPusher Test';
		// Call the existing send function with test data
		 await this.sendWxPusherNotification(appToken, uid, testContent, testSummary, true); // Pass true to indicate it's a test
	}

	// Function to check tasks and send reminders
	async checkTasksAndSendReminders() {
		console.log('Checking tasks for reminders...');
		const { appToken, uid, reminderDays } = this.settings;

		// Check if appToken or uid is missing
		 if (!appToken || !uid) {
			// No notice here, as this runs automatically on startup
			console.log('WxPusher appToken or UID is not configured. Skipping reminder check.');
			return;
		}

		const files = this.app.vault.getMarkdownFiles();
		const today = moment().startOf('day');
		const reminderDateLimit = moment().add(reminderDays, 'days').endOf('day');
		let tasksFound = 0;
		let remindersToSend: { task: string, dueDate: string, file: TFile }[] = [];

		// Regular expression to find tasks with due dates (Obsidian Tasks format: 📅 YYYY-MM-DD)
		// Example: - [ ] Task description 📅 2023-10-27
		const taskRegex = /-\s*\[ \]\s*(.*?)📅\s*(\d{4}-\d{2}-\d{2})/g;

		for (const file of files) {
			const content = await this.app.vault.cachedRead(file);
			let match;
			while ((match = taskRegex.exec(content)) !== null) {
				const taskDescription = match[1].trim();
				const dueDateStr = match[2];
				const dueDate = moment(dueDateStr, 'YYYY-MM-DD');

				// Check if the due date is valid and within the reminder window
				 if (dueDate.isValid() && dueDate.isBetween(today, reminderDateLimit, undefined, '[]')) { // '[]' includes start and end dates
					console.log(`Found task due soon: ${taskDescription} on ${dueDateStr} in file ${file.path}`);
					 remindersToSend.push({ task: taskDescription, dueDate: dueDateStr, file: file });
					 tasksFound++;
				}
			}
		}

		console.log(`Found ${tasksFound} tasks due within the next ${reminderDays} days.`);

		// Send reminders if any tasks are found
		 if (remindersToSend.length > 0) {
			let reminderContent = `You have ${remindersToSend.length} task(s) due soon:\n\n`;
			 remindersToSend.forEach(reminder => {
				// Add file path to the reminder message
				 reminderContent += `- ${reminder.task} (Due: ${reminder.dueDate}, File: ${reminder.file.basename})\n`;
			});

			// Send the combined reminder message via WxPusher
			 await this.sendWxPusherNotification(appToken, uid, reminderContent.trim(), `Obsidian Task Reminder (${remindersToSend.length})`);
		} else {
			console.log('No tasks due soon found.');
			// Optionally send a notification if no tasks are due
			// new Notice('No tasks due soon found.');
		}
	}

	// Function to send notification via WxPusher API
	async sendWxPusherNotification(appToken: string, uid: string, content: string, summary?: string, isTest: boolean = false) {
		const wxPusherUrl = 'https://wxpusher.zjiecode.com/api/send/message';
		const payload = {
			appToken: appToken,
			// Replace newline with <br/> for HTML content
			content: content.replace(/\n/g, '<br/>'),
			// 1: text, 2: html, 3: markdown
			contentType: 2,
			// Optional summary, defaults to first 20 chars of content
			 summary: summary || content.substring(0, 20),
			// topicIds: [], // Use topicIds for group sending
			"uids": [
				uid
			],
			// url: '' // Optional: URL to jump to when the message is clicked
		};

		console.log(`Sending ${isTest ? 'test ' : ''}notification via WxPusher...`);
		console.log('Payload:', JSON.stringify(payload));

		 try {
			const response = await requestUrl({
				url: wxPusherUrl,
				method: 'POST',
				contentType: 'application/json',
				 body: JSON.stringify(payload)
			});

			console.log('WxPusher API Response Status:', response.status);
			console.log('WxPusher API Response Body:', response.text);

			// Check response status and provide feedback
			const responseData = response.json;
			 if (response.status === 200 && responseData && responseData.code === 1000) {
				new Notice(`WxPusher ${isTest ? 'test ' : ''}message sent successfully!`);
				console.log(`WxPusher ${isTest ? 'test ' : ''}message sent successfully!`);
			} else {
				const errorMsg = responseData ? responseData.msg : 'Unknown error';
				new Notice(`Failed to send WxPusher ${isTest ? 'test ' : ''}message: ${errorMsg}`);
				console.error(`Failed to send WxPusher ${isTest ? 'test ' : ''}message:`, errorMsg, response.text);
			}
		} catch (error) {
			new Notice(`Error sending WxPusher ${isTest ? 'test ' : ''}message. Check console for details.`);
			console.error(`Error sending WxPusher ${isTest ? 'test ' : ''}message:`, error);
		}
	}

	// Function to start the daily scan timer
	startDailyScanTimer() {
		const { scanTime } = this.settings;
		const [hours, minutes] = scanTime.split(':').map(Number);
		
		// Calculate time until next scan
		const now = new Date();
		const nextScan = new Date();
		nextScan.setHours(hours, minutes, 0, 0);
		
		// If the scan time has already passed today, set it for tomorrow
		if (nextScan <= now) {
			nextScan.setDate(nextScan.getDate() + 1);
		}
		
		const timeUntilNextScan = nextScan.getTime() - now.getTime();
		
		// Set the initial timeout
		setTimeout(() => {
			this.checkTasksAndSendReminders();
			// Set up the daily interval
			setInterval(() => {
				this.checkTasksAndSendReminders();
			}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
		}, timeUntilNextScan);
		
		console.log(`Next task scan scheduled for ${nextScan.toLocaleString()}`);
	}
}

// Settings tab class
class WxPusherReminderSettingTab extends PluginSettingTab {
	plugin: WxPusherReminderPlugin;

	constructor(app: App, plugin: WxPusherReminderPlugin) {
		 super(app, plugin);
		 this.plugin = plugin;
	}

	// Build the settings UI
	 display(): void {
		 const { containerEl } = this;

		 containerEl.empty();

		 containerEl.createEl('h2', { text: 'WxPusher Reminder Settings' });

		 // Setting for WxPusher AppToken
		 new Setting(containerEl)
			 .setName('WxPusher AppToken')
			 .setDesc('Your WxPusher application token.')
			 .addText(text => text
				 .setPlaceholder('Enter your AppToken')
				 .setValue(this.plugin.settings.appToken)
				 .onChange(async (value) => {
					 this.plugin.settings.appToken = value;
					 await this.plugin.saveSettings();
				 }));

		 // Setting for WxPusher UID
		 new Setting(containerEl)
			 .setName('WxPusher UID')
			 .setDesc('Your WxPusher user ID (UID) to receive messages.')
			 .addText(text => text
				 .setPlaceholder('Enter your UID')
				 .setValue(this.plugin.settings.uid)
				 .onChange(async (value) => {
					 this.plugin.settings.uid = value;
					 await this.plugin.saveSettings();
				 }));

		 // Setting for Reminder Days
		 new Setting(containerEl)
			 .setName('Reminder Days Before Due')
			 .setDesc('Number of days before the due date to send a reminder (e.g., 1 for tomorrow, 0 for today).')
			 .addText(text => text
				 .setPlaceholder('e.g., 1')
				 .setValue(String(this.plugin.settings.reminderDays))
				 .onChange(async (value) => {
					 const days = parseInt(value);
					 if (!isNaN(days) && days >= 0) {
						 this.plugin.settings.reminderDays = days;
						 await this.plugin.saveSettings();
					 } else {
						 new Notice('Please enter a valid non-negative number for reminder days.');
					 }
				 }));

		 // Setting for Daily Scan Time
		 new Setting(containerEl)
			 .setName('Daily Scan Time')
			 .setDesc('Time to scan tasks daily (24-hour format, e.g., 14:00 for 2 PM).')
			 .addText(text => text
				 .setPlaceholder('e.g., 14:00')
				 .setValue(this.plugin.settings.scanTime)
				 .onChange(async (value) => {
					 // Validate time format (HH:MM)
					 if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
						 this.plugin.settings.scanTime = value;
						 await this.plugin.saveSettings();
						 // Restart the timer with new scan time
						 this.plugin.startDailyScanTimer();
					 } else {
						 new Notice('Please enter a valid time in 24-hour format (HH:MM).');
					 }
				 }));
	 }
}

