export interface Translations {
  // Common
  'common.send': string;
  'common.close': string;
  'common.cancel': string;
  'common.prev': string;
  'common.next': string;

  // Sidebar
  'sidebar.subtitle': string;

  // Chat
  'chat.selectSkill': string;
  'chat.inputPlaceholder': string;
  'chat.run': string;
  'chat.startPrompt': string;
  'chat.processing': string;
  'chat.reply': string;
  'chat.reset': string;
  'chat.stop': string;
  'chat.complete': string;
  'chat.sendCtrlEnter': string;
  'chat.attachFile': string;

  // Approval
  'approval.title': string;
  'approval.approve': string;
  'approval.customInput': string;
  'approval.customPlaceholder': string;
  'approval.feedbackPlaceholder': string;

  // Question Form
  'question.filled': string;
  'question.submit': string;
  'question.customInput': string;
  'question.customPlaceholder': string;
  'question.inputPlaceholder': string;
  'question.notFilled': string;

  // Settings
  'settings.title': string;
  'settings.theme': string;
  'settings.language': string;
  'settings.about': string;
  'settings.systemCheck': string;
  'settings.back': string;

  // About
  'about.description1': string;
  'about.description2': string;
  'about.footer': string;

  // Stream
  'stream.respond': string;
  'stream.error': string;

  // Startup
  'startup.title': string;
  'startup.subtitle': string;
  'startup.checking': string;
  'startup.allPassed': string;
  'startup.hasFails': string;
  'startup.fixing': string;
  'startup.fixSuccess': string;
  'startup.fixFail': string;
  'startup.fix': string;
  'startup.retry': string;
  'startup.continue': string;
  'startup.runInTerminal': string;

  // Categories
  'category.core': string;
  'category.setup': string;
  'category.utility': string;
  'category.external': string;

  // Skill names
  'skill.develop-plugin.name': string;
  'skill.develop-plugin.desc': string;
  'skill.team-planner.name': string;
  'skill.team-planner.desc': string;
  'skill.publish.name': string;
  'skill.publish.desc': string;
  'skill.setup.name': string;
  'skill.setup.desc': string;
  'skill.help.name': string;
  'skill.help.desc': string;
  'skill.add-ext-skill.name': string;
  'skill.add-ext-skill.desc': string;
  'skill.remove-ext-skill.name': string;
  'skill.remove-ext-skill.desc': string;
  'skill.ext-github-release-manager.name': string;
  'skill.ext-github-release-manager.desc': string;

  // Plugin
  'plugin.add': string;
  'plugin.remove': string;
  'plugin.name': string;
  'plugin.projectDir': string;
  'plugin.browse': string;
  'plugin.select': string;
  'plugin.cancel': string;
  'plugin.addBtn': string;
  'plugin.validating': string;
  'plugin.error.notFound': string;
  'plugin.error.noPluginJson': string;
  'plugin.error.noSkillsDir': string;
  'plugin.error.alreadyRegistered': string;
  'plugin.error.cannotRemoveDefault': string;
  'plugin.removeConfirm': string;
  'plugin.dirBrowser.title': string;
  'plugin.dirBrowser.parent': string;
  'plugin.dirBrowser.empty': string;

  // File Browser
  'fileBrowser.title': string;
  'fileBrowser.select': string;
  'fileBrowser.cancel': string;
  'fileBrowser.empty': string;
  'fileBrowser.selectedCount': string;
  'fileBrowser.unsupportedType': string;

  // Activity Panel
  'activity.idle': string;
  'activity.running': string;
  'activity.complete': string;
  'activity.error': string;
  'activity.toggle': string;
  'activity.progress': string;
  'activity.progress.elapsed': string;
  'activity.progress.completedIn': string;
  'activity.progress.inProgress': string;
  'activity.progress.ready': string;
  'activity.progress.selectSkill': string;
  'activity.progress.failed': string;
  'activity.agents': string;
  'activity.tools': string;
  'activity.tools.summary': string;
  'activity.tools.feed': string;
  'activity.skillInfo': string;
  'activity.skillInfo.plugin': string;
  'activity.skillInfo.skill': string;
  'activity.skillInfo.session': string;
  'activity.skillInfo.category': string;
  'activity.usage': string;
  'activity.agents.model': string;
  'activity.agents.tier': string;
  'activity.agents.empty': string;
  'activity.usage.tokens': string;
  'activity.usage.cost': string;
  'activity.usage.duration': string;
  'activity.usage.turns': string;
  'activity.usage.input': string;
  'activity.usage.output': string;
  'activity.usage.cacheRead': string;

  // Agent Sync
  'agentSync.label': string;
  'agentSync.tooltip': string;
  'agentSync.syncing': string;
  'agentSync.success': string;
  'agentSync.fail': string;
  'agentSync.noAgents': string;

  // Prompt
  'prompt.title': string;
  'prompt.description': string;
  'prompt.placeholder': string;
  'prompt.tooltip': string;
  'prompt.run': string;
  'prompt.emptyWarn': string;

  // Session History
  'session.history': string;
  'session.empty': string;
  'session.resume': string;
  'session.resumed': string;
  'session.delete': string;
  'session.deleteAll': string;
  'session.deleteConfirm': string;
  'session.deleteAllConfirm': string;
  'session.status.completed': string;
  'session.status.waiting': string;
  'session.status.error': string;
  'session.status.active': string;
  'session.tokens': string;
  'session.cost': string;
  'session.duration': string;
  'session.timeAgo.now': string;
  'session.timeAgo.minutes': string;
  'session.timeAgo.hours': string;
  'session.timeAgo.days': string;
  'session.editTitle': string;
  'session.editPlaceholder': string;

  // Skill Switch Dialog
  'switchDialog.title': string;
  'switchDialog.message': string;
  'switchDialog.confirm': string;
  'switchDialog.cancel': string;

  // Setup Guard
  'setup.required': string;

  // Transcript (integrated into SessionList)
  'session.claudeCode': string;
  'session.transcriptView': string;
  'session.backToList': string;

  // Resume Dropdown
  'resume.title': string;
  'resume.tooltip': string;
  'resume.empty': string;
  'resume.newPrompt': string;

  // Relevance Banner
  'relevance.suggestion': string;
  'relevance.promptSuggestion': string;
  'relevance.switch': string;
  'relevance.dismiss': string;

  // Menu Management
  'menu.manage': string;
  'menu.manage.tooltip': string;
  'menu.aiRecommend': string;
  'menu.aiRecommend.loading': string;
  'menu.addSubcategory': string;
  'menu.removeSubcategory': string;
  'menu.save': string;
  'menu.moveSkill': string;
  'menu.ko': string;
  'menu.en': string;
  'menu.newSubcategory': string;
  'menu.confirmReset': string;
  'menu.dropHere': string;
  'menu.useSubcategory': string;
  'menu.noSubcategory': string;
}
