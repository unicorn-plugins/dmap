import type { Translations } from './types.js';

const en: Translations = {
  // Common
  'common.send': 'Send',
  'common.close': 'Close',
  'common.cancel': 'End',
  'common.prev': 'Prev',
  'common.next': 'Next',

  // Sidebar
  'sidebar.subtitle': 'Declarative Multi-Agent Plugin Builder',

  // Chat
  'chat.selectSkill': 'Select a skill from the sidebar',
  'chat.inputPlaceholder': 'Input (optional)',
  'chat.run': 'Run (Ctrl+Enter)',
  'chat.startPrompt': "Press 'Run' to start the skill",
  'chat.processing': 'Processing...',
  'chat.reply': 'Reply...',
  'chat.reset': 'Reset',
  'chat.stop': 'Stop',
  'chat.complete': 'Task complete',
  'chat.sendCtrlEnter': 'Send (Ctrl+Enter)',
  'chat.attachFile': 'Add file or image',

  // Approval
  'approval.title': 'Approval Request',
  'approval.approve': 'Approve',
  'approval.customInput': 'Custom input...',
  'approval.customPlaceholder': 'Enter your response...',
  'approval.feedbackPlaceholder': 'Add feedback and approve (Enter)',

  // Question Form
  'question.filled': '{{filled}}/{{total}} filled',
  'question.submit': 'Submit ({{filled}}/{{total}})',
  'question.customInput': 'Custom input',
  'question.customPlaceholder': 'Enter custom value',
  'question.inputPlaceholder': 'Enter {{question}}',
  'question.notFilled': '(empty)',

  // Settings
  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.language': 'Language',
  'settings.about': 'About Me',
  'settings.systemCheck': 'System Check',
  'settings.back': 'Back',

  // About
  'about.description1':
    'DMAP (Declarative Multi-Agent Plugin) is a no-code builder for creating multi-agent plugins using only Markdown and YAML.',
  'about.description2':
    'From team planning to plugin development and GitHub deployment — a complete End-to-End workflow.',
  'about.footer': 'Developed by Unicorn Inc. | MIT License',

  // Stream
  'stream.respond': 'Please enter your response.',
  'stream.error': 'Error:',

  // Startup
  'startup.title': 'System Check',
  'startup.subtitle': 'Verifying readiness',
  'startup.checking': 'Checking...',
  'startup.allPassed': 'All checks passed!',
  'startup.hasFails': 'Some items need to be resolved',
  'startup.fixing': 'Installing...',
  'startup.fixSuccess': 'Installed',
  'startup.fixFail': 'Installation failed',
  'startup.fix': 'Auto Install',
  'startup.retry': 'Re-check',
  'startup.continue': 'Get Started',
  'startup.runInTerminal': 'Run in terminal required',

  // Categories
  'category.core': 'Core',
  'category.setup': 'Setup',
  'category.utility': 'Utility',
  'category.external': 'External',

  // Skill names
  'skill.develop-plugin.name': 'Plugin (AI Team) Dev',
  'skill.develop-plugin.desc': 'Plugin development based on AI team plan',
  'skill.team-planner.name': 'AI Team (Plugin) Plan',
  'skill.team-planner.desc': 'Create a new AI team (plugin) plan',
  'skill.publish.name': 'GitHub Deploy',
  'skill.publish.desc': 'Deploy completed plugin to GitHub',
  'skill.setup.name': 'Plugin Setup',
  'skill.setup.desc': 'DMAP plugin initial setup and status check',
  'skill.help.name': 'Help',
  'skill.help.desc': 'Available commands and usage guide',
  'skill.add-ext-skill.name': 'Add Plugin',
  'skill.add-ext-skill.desc': 'Add external plugin integration',
  'skill.remove-ext-skill.name': 'Remove Plugin',
  'skill.remove-ext-skill.desc': 'Remove external plugin integration',
  'skill.ext-github-release-manager.name': 'Release Manager',
  'skill.ext-github-release-manager.desc': 'GitHub Release automation (github-release-manager plugin)',

  // Plugin
  'plugin.add': 'Add Plugin',
  'plugin.remove': 'Remove Plugin',
  'plugin.name': 'Plugin Name',
  'plugin.projectDir': 'Project Path',
  'plugin.browse': 'Browse',
  'plugin.select': 'Select',
  'plugin.cancel': 'Cancel',
  'plugin.addBtn': 'Add',
  'plugin.validating': 'Validating...',
  'plugin.error.notFound': 'Directory not found',
  'plugin.error.noPluginJson': 'plugin.json not found',
  'plugin.error.noSkillsDir': 'skills directory not found',
  'plugin.error.alreadyRegistered': 'Plugin already registered',
  'plugin.error.cannotRemoveDefault': 'Cannot remove default plugin',
  'plugin.removeConfirm': 'Remove this plugin?',
  'plugin.dirBrowser.title': 'Select Directory',
  'plugin.dirBrowser.parent': 'Parent',
  'plugin.dirBrowser.empty': 'No subdirectories',
  'plugin.tab.github': 'Add from GitHub',
  'plugin.tab.local': 'Add Local Plugin',
  'plugin.githubRepo': 'GitHub Repository',
  'plugin.githubRepoPlaceholder': 'organization/repository',
  'plugin.step.marketplaceAdd': 'Adding to marketplace...',
  'plugin.step.pluginInstall': 'Installing plugin...',
  'plugin.error.cliFailure': 'CLI command execution failed',
  'plugin.error.invalidGithubRepo': 'Please enter in valid format (organization/repository)',
  'plugin.error.installInProgress': 'Another plugin installation is in progress',
  'plugin.warning.registryFailed': 'Installation completed but may not appear in list. Please refresh.',
  'plugin.workingDirReadonly': 'Working Path (read-only)',
  'plugin.workingDirEdit': 'Change Working Path',
  'plugin.workingDirUpdated': 'Working path updated successfully',
  'plugin.error.updateFailed': 'Failed to update working path',
  'plugin.dirBrowser.newFolder': 'New Folder',
  'plugin.dirBrowser.newFolderPlaceholder': 'Folder name',
  'plugin.dirBrowser.newFolderError': 'Failed to create folder',

  // File Browser
  'fileBrowser.title': 'Select Files',
  'fileBrowser.select': 'Select',
  'fileBrowser.cancel': 'Cancel',
  'fileBrowser.empty': 'No files',
  'fileBrowser.selectedCount': '{{count}} selected',
  'fileBrowser.unsupportedType': 'Allowed: png, jpg, gif, webp, pdf, txt, md, csv, json, yaml, xml',

  // Activity Panel
  'activity.idle': 'Idle',
  'activity.running': 'Running...',
  'activity.complete': 'Complete',
  'activity.error': 'Error',
  'activity.toggle': 'Activity Panel',
  'activity.progress': 'Progress',
  'activity.progress.elapsed': 'Elapsed: {{time}}',
  'activity.progress.completedIn': 'Completed in {{time}}',
  'activity.progress.inProgress': 'Execution in progress',
  'activity.progress.ready': 'Ready to execute',
  'activity.progress.selectSkill': 'Select a skill to begin',
  'activity.progress.failed': 'Execution failed',
  'activity.agents': 'Agents',
  'activity.tools': 'Tools',
  'activity.tools.summary': 'Summary',
  'activity.tools.feed': 'Feed',
  'activity.skillInfo': 'Skill Info',
  'activity.skillInfo.plugin': 'Plugin',
  'activity.skillInfo.skill': 'Skill',
  'activity.skillInfo.session': 'Session',
  'activity.skillInfo.category': 'Category',
  'activity.usage': 'Usage',
  'activity.agents.model': 'Model',
  'activity.agents.tier': 'Tier',
  'activity.agents.empty': 'No agent activity',
  'activity.usage.tokens': 'Tokens',
  'activity.usage.cost': 'Cost',
  'activity.usage.duration': 'Duration',
  'activity.usage.turns': 'Turns',
  'activity.usage.input': 'Input',
  'activity.usage.output': 'Output',
  'activity.usage.cacheRead': 'Cache',

  // Agent Sync
  'agentSync.label': 'Sync Agents',
  'agentSync.tooltip': 'Refresh plugin agents in DMAP.\nRequired when agent definitions are updated.',
  'agentSync.syncing': 'Syncing...',
  'agentSync.success': '{{count}} agents synced',
  'agentSync.fail': 'Agent sync failed',
  'agentSync.noAgents': 'No agents to sync',

  // Prompt
  'prompt.title': 'Prompt',
  'prompt.description': 'Execute free-form prompt',
  'prompt.placeholder': 'Enter a prompt to execute...',
  'prompt.tooltip': 'Run Prompt',
  'prompt.run': 'Run (Ctrl+Enter)',
  'prompt.emptyWarn': 'Please enter a prompt',

  // Session History
  'session.history': 'Recent Conversations',
  'session.empty': 'No previous conversations',
  'session.resume': 'Resume',
  'session.resumed': 'Resuming previous conversation',
  'session.delete': 'Delete',
  'session.deleteAll': 'Delete All',
  'session.deleteConfirm': 'Delete this conversation?',
  'session.deleteAllConfirm': 'Delete all conversations?',
  'session.status.completed': 'Done',
  'session.status.waiting': 'Waiting',
  'session.status.error': 'Error',
  'session.status.active': 'Running',
  'session.tokens': '{{count}} tokens',
  'session.cost': '${{cost}}',
  'session.duration': '{{time}}',
  'session.timeAgo.now': 'Just now',
  'session.timeAgo.minutes': '{{n}}m ago',
  'session.timeAgo.hours': '{{n}}h ago',
  'session.timeAgo.days': '{{n}}d ago',
  'session.editTitle': 'Edit Title',
  'session.editPlaceholder': 'Enter title',

  // Skill Switch Dialog
  'switchDialog.title': 'Switch Skill',
  'switchDialog.message': 'The running skill will be interrupted. Switch?',
  'switchDialog.confirm': 'Switch',
  'switchDialog.cancel': 'Cancel',

  // Setup Guard
  'setup.required': 'Plugin initial setup is required before use.',

  // Transcript (integrated into SessionList)
  'session.claudeCode': 'Claude Code Conversations',
  'session.transcriptView': 'View Transcript',
  'session.backToList': 'Back',

  // Resume Dropdown
  'resume.title': 'Conversations',
  'resume.tooltip': 'Conversations',
  'resume.empty': 'No conversations yet',
  'resume.newPrompt': 'New Prompt',

  // Relevance Banner
  'relevance.suggestion': 'This input may be better suited for the {{skill}} skill',
  'relevance.promptSuggestion': 'This input may be better suited for Prompt mode',
  'relevance.switch': 'Switch Skill',
  'relevance.dismiss': 'Dismiss',

  // Permission
  'permission.title': 'Tool Permission',
  'permission.allow': 'Allow',
  'permission.deny': 'Deny',

  // Menu Management
  'menu.manage': 'Manage Menu',
  'menu.manage.tooltip': 'Customize skill menu',
  'menu.aiRecommend': 'AI Recommend',
  'menu.aiRecommend.loading': 'Analyzing skills...',
  'menu.addSubcategory': 'Add Subcategory',
  'menu.removeSubcategory': 'Remove Subcategory',
  'menu.save': 'Save',
  'menu.moveSkill': 'Move',
  'menu.ko': 'Korean',
  'menu.en': 'English',
  'menu.newSubcategory': 'New Subcategory',
  'menu.confirmReset': 'Replace menu with AI recommendation?',
  'menu.dropHere': 'Drop here',
  'menu.useSubcategory': 'Use Categories',
  'menu.noSubcategory': 'No Categories',
};

export default en;
