/**
 * Zustand Store for AIBuilder State Management
 *
 * This store mirrors all useState calls from AIBuilder.tsx for modular architecture.
 * It uses Zustand with:
 * - Immer middleware for safe immutable state updates (allows direct mutations in reducers)
 * - Devtools middleware for debugging in development
 * - Shallow comparison in selectors to prevent unnecessary re-renders
 *
 * Slices:
 * - Chat: messages, userInput, isGenerating, generationProgress
 * - Mode: currentMode (PLAN/ACT), lastUserRequest
 * - Components: components array, currentComponent, loadingApps, dbSyncError
 * - Version Control: undoStack, redoStack, showVersionHistory
 * - UI State: activeTab, layoutMode, all modal visibility states
 * - Data: pendingChange, pendingDiff, deploymentInstructions, etc.
 * - File Storage: contentTab, storageFiles, loadingFiles, etc.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type {
  ChatMessage,
  AppVersion,
  GeneratedComponent,
  PendingChange,
  PendingDiff,
  StagePlan,
  ActiveTab,
  ContentTab,
  BuilderMode,
  QualityReport,
  PerformanceReport,
  CurrentStagePlan,
  CompareVersions,
} from "@/types/aiBuilderTypes";
import type { AppConcept, ImplementationPlan } from "@/types/appConcept";
import type { LayoutDesign } from "@/types/layoutDesign";
import type { PhaseId } from "@/types/buildPhases";
import type { FileMetadata, StorageStats } from "@/types/storage";
import type { DeploymentInstructions } from "@/utils/exportApp";
import type { ProjectDocumentation } from "@/types/projectDocumentation";
import type {
  Team,
  TeamMember,
  AppAccess,
  AppCollaborator,
  Task,
  TaskFilters,
  TaskComment,
  ActivityLog,
  ActivityFilters,
  PresenceUser,
} from "@/types/collaboration";
import type {
  DebateSession,
  DebateMessage,
  DebateConsensus,
  DebateCost,
  DebateStatus,
  DebateModelId,
} from "@/types/aiCollaboration";

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * Chat slice state
 */
interface ChatSlice {
  chatMessages: ChatMessage[];
  userInput: string;
  isGenerating: boolean;
  generationProgress: string;
  // Actions
  setChatMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;
  setUserInput: (input: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
}

/**
 * Mode slice state
 */
interface ModeSlice {
  currentMode: BuilderMode;
  lastUserRequest: string;
  // Actions
  setCurrentMode: (mode: BuilderMode) => void;
  setLastUserRequest: (request: string) => void;
}

/**
 * Components slice state
 */
interface ComponentsSlice {
  components: GeneratedComponent[];
  currentComponent: GeneratedComponent | null;
  loadingApps: boolean;
  dbSyncError: string | null;
  // Actions
  setComponents: (
    components:
      | GeneratedComponent[]
      | ((prev: GeneratedComponent[]) => GeneratedComponent[])
  ) => void;
  setCurrentComponent: (component: GeneratedComponent | null) => void;
  setLoadingApps: (loading: boolean) => void;
  setDbSyncError: (error: string | null) => void;
  addComponent: (component: GeneratedComponent) => void;
  updateComponent: (id: string, updates: Partial<GeneratedComponent>) => void;
  removeComponent: (id: string) => void;
}

/**
 * Version control slice state
 */
interface VersionControlSlice {
  undoStack: AppVersion[];
  redoStack: AppVersion[];
  showVersionHistory: boolean;
  // Actions
  setUndoStack: (
    stack: AppVersion[] | ((prev: AppVersion[]) => AppVersion[])
  ) => void;
  setRedoStack: (
    stack: AppVersion[] | ((prev: AppVersion[]) => AppVersion[])
  ) => void;
  setShowVersionHistory: (show: boolean) => void;
  pushToUndoStack: (version: AppVersion) => void;
  pushToRedoStack: (version: AppVersion) => void;
  clearRedoStack: () => void;
}

/**
 * Main view type for tab navigation
 */
export type MainView = "main" | "wizard" | "layout" | "build";

/**
 * Preview mode type for WebContainers integration
 */
type PreviewMode = "sandpack" | "webcontainer";
type WebContainerStatus = "idle" | "booting" | "ready" | "error";

/**
 * UI state slice
 */
interface UISlice {
  isClient: boolean;
  activeTab: ActiveTab;
  activeView: MainView;
  // Modal visibility states
  showLibrary: boolean;
  showDiffPreview: boolean;
  showApprovalModal: boolean;
  showDeploymentModal: boolean;
  showCompareModal: boolean;
  showNewAppStagingModal: boolean;
  showConversationalWizard: boolean;
  showLayoutBuilder: boolean;
  showSettings: boolean;
  showAdvancedPhasedBuild: boolean;
  showQualityReport: boolean;
  showPerformanceReport: boolean;
  showNameAppModal: boolean;
  // Search
  searchQuery: string;
  // Preview mode (WebContainers support)
  previewMode: PreviewMode;
  webContainerStatus: WebContainerStatus;
  // Actions
  setIsClient: (isClient: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setActiveView: (view: MainView) => void;
  setShowLibrary: (show: boolean) => void;
  setShowDiffPreview: (show: boolean) => void;
  setShowApprovalModal: (show: boolean) => void;
  setShowDeploymentModal: (show: boolean) => void;
  setShowCompareModal: (show: boolean) => void;
  setShowNewAppStagingModal: (show: boolean) => void;
  setShowConversationalWizard: (show: boolean) => void;
  setShowLayoutBuilder: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowAdvancedPhasedBuild: (show: boolean) => void;
  setShowQualityReport: (show: boolean) => void;
  setShowPerformanceReport: (show: boolean) => void;
  setShowNameAppModal: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setWebContainerStatus: (status: WebContainerStatus) => void;
}

/**
 * Data slice state
 */
interface DataSlice {
  pendingChange: PendingChange | null;
  pendingDiff: PendingDiff | null;
  pendingNewAppRequest: string;
  deploymentInstructions: DeploymentInstructions | null;
  exportingApp: GeneratedComponent | null;
  compareVersions: CompareVersions;
  currentStagePlan: CurrentStagePlan | null;
  newAppStagePlan: StagePlan | null;
  appConcept: AppConcept | null;
  implementationPlan: ImplementationPlan | null;
  qualityReport: QualityReport | null;
  performanceReport: PerformanceReport | null;
  // Advanced phase build
  selectedPhaseId: PhaseId | null;
  isValidating: boolean;
  // Image upload
  uploadedImage: string | null;
  // Layout Builder
  currentLayoutDesign: LayoutDesign | null;
  savedLayoutDesigns: LayoutDesign[];
  // Actions
  setPendingChange: (change: PendingChange | null) => void;
  setPendingDiff: (diff: PendingDiff | null) => void;
  setPendingNewAppRequest: (request: string) => void;
  setDeploymentInstructions: (
    instructions: DeploymentInstructions | null
  ) => void;
  setExportingApp: (app: GeneratedComponent | null) => void;
  setCompareVersions: (versions: CompareVersions) => void;
  setCurrentStagePlan: (plan: CurrentStagePlan | null) => void;
  setNewAppStagePlan: (
    plan: StagePlan | null | ((prev: StagePlan | null) => StagePlan | null)
  ) => void;
  setAppConcept: (concept: AppConcept | null) => void;
  setImplementationPlan: (plan: ImplementationPlan | null) => void;
  setQualityReport: (report: QualityReport | null) => void;
  setPerformanceReport: (report: PerformanceReport | null) => void;
  setSelectedPhaseId: (phaseId: PhaseId | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  setUploadedImage: (image: string | null) => void;
  // Layout Builder actions
  setCurrentLayoutDesign: (design: LayoutDesign | null) => void;
  setSavedLayoutDesigns: (designs: LayoutDesign[]) => void;
  addSavedLayoutDesign: (design: LayoutDesign) => void;
  removeSavedLayoutDesign: (id: string) => void;
}

/**
 * Documentation slice state for Project Documentation System
 */
type DocumentationPanelTab = "concept" | "design" | "plan" | "progress";

interface DocumentationSlice {
  // Current documentation
  currentDocumentation: ProjectDocumentation | null;
  // Loading states
  isLoadingDocumentation: boolean;
  isSavingDocumentation: boolean;
  // Panel state
  showDocumentationPanel: boolean;
  documentationPanelTab: DocumentationPanelTab;
  // Actions
  setCurrentDocumentation: (doc: ProjectDocumentation | null) => void;
  setIsLoadingDocumentation: (loading: boolean) => void;
  setIsSavingDocumentation: (saving: boolean) => void;
  setShowDocumentationPanel: (show: boolean) => void;
  setDocumentationPanelTab: (tab: DocumentationPanelTab) => void;
}

/**
 * File storage slice state
 */
interface FileStorageSlice {
  contentTab: ContentTab;
  storageFiles: FileMetadata[];
  loadingFiles: boolean;
  selectedFiles: Set<string>;
  fileSearchQuery: string;
  fileTypeFilter: string;
  fileSortBy: "name" | "size" | "created_at" | "updated_at";
  fileSortOrder: "asc" | "desc";
  storageStats: StorageStats | null;
  uploadingFiles: Set<string>;
  deletingFiles: Set<string>;
  // Actions
  setContentTab: (tab: ContentTab) => void;
  setStorageFiles: (files: FileMetadata[]) => void;
  setLoadingFiles: (loading: boolean) => void;
  setSelectedFiles: (files: Set<string>) => void;
  setFileSearchQuery: (query: string) => void;
  setFileTypeFilter: (filter: string) => void;
  setFileSortBy: (
    sortBy: "name" | "size" | "created_at" | "updated_at"
  ) => void;
  setFileSortOrder: (order: "asc" | "desc") => void;
  setStorageStats: (stats: StorageStats | null) => void;
  setUploadingFiles: (files: Set<string>) => void;
  setDeletingFiles: (files: Set<string>) => void;
  toggleFileSelection: (fileId: string) => void;
  clearFileSelection: () => void;
}

/**
 * Collaboration slice state for team and sharing features
 */
interface CollaborationSlice {
  // Current team context
  currentTeamId: string | null;
  currentTeam: Team | null;
  // Team list (cached)
  teams: Team[];
  teamsLoading: boolean;
  // App access for current app
  currentAppAccess: AppAccess | null;
  currentAppCollaborators: AppCollaborator[];
  // Online presence
  onlineTeamMembers: PresenceUser[];
  // Modal states
  showTeamSettings: boolean;
  showInviteModal: boolean;
  showAccessModal: boolean;
  showTeamChat: boolean;
  // Actions
  setCurrentTeamId: (teamId: string | null) => void;
  setCurrentTeam: (team: Team | null) => void;
  setTeams: (teams: Team[]) => void;
  setTeamsLoading: (loading: boolean) => void;
  setCurrentAppAccess: (access: AppAccess | null) => void;
  setCurrentAppCollaborators: (collaborators: AppCollaborator[]) => void;
  setOnlineTeamMembers: (members: PresenceUser[]) => void;
  setShowTeamSettings: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  setShowAccessModal: (show: boolean) => void;
  setShowTeamChat: (show: boolean) => void;
  addTeam: (team: Team) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  removeTeam: (teamId: string) => void;
}

/**
 * Task slice state for task management
 */
interface TaskSlice {
  // Tasks
  tasks: Task[];
  tasksLoading: boolean;
  taskFilters: TaskFilters;
  // Selected task for detail view
  selectedTask: Task | null;
  taskComments: TaskComment[];
  // Modal states
  showTaskBoard: boolean;
  showTaskDetail: boolean;
  showTaskCreate: boolean;
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setTasksLoading: (loading: boolean) => void;
  setTaskFilters: (filters: TaskFilters) => void;
  setSelectedTask: (task: Task | null) => void;
  setTaskComments: (comments: TaskComment[]) => void;
  setShowTaskBoard: (show: boolean) => void;
  setShowTaskDetail: (show: boolean) => void;
  setShowTaskCreate: (show: boolean) => void;
}

/**
 * Activity slice state for activity feed
 */
interface ActivitySlice {
  // Activity feed
  activityFeed: ActivityLog[];
  activityLoading: boolean;
  activityHasMore: boolean;
  activityFilters: ActivityFilters;
  // Actions
  setActivityFeed: (activities: ActivityLog[]) => void;
  appendActivities: (activities: ActivityLog[]) => void;
  prependActivity: (activity: ActivityLog) => void;
  setActivityLoading: (loading: boolean) => void;
  setActivityHasMore: (hasMore: boolean) => void;
  setActivityFilters: (filters: ActivityFilters) => void;
  clearActivityFeed: () => void;
}

/**
 * Debate slice state for collaborative multi-AI debate feature
 */
interface DebateSlice {
  // Current debate
  activeDebate: DebateSession | null;
  isDebating: boolean;
  debateMessages: DebateMessage[];
  currentSpeaker: DebateModelId | null;
  debateCost: DebateCost | null;
  // Debate history for current app
  debateHistory: DebateSession[];
  debateHistoryLoading: boolean;
  // UI state
  showDebatePanel: boolean;
  showDebateHistory: boolean;
  debateMode: boolean; // Toggle for "Ask Both AIs" mode
  // Actions
  setActiveDebate: (debate: DebateSession | null) => void;
  setIsDebating: (isDebating: boolean) => void;
  addDebateMessage: (message: DebateMessage) => void;
  setDebateMessages: (messages: DebateMessage[]) => void;
  setCurrentSpeaker: (modelId: DebateModelId | null) => void;
  setDebateCost: (cost: DebateCost | null) => void;
  setDebateHistory: (debates: DebateSession[]) => void;
  addDebateToHistory: (debate: DebateSession) => void;
  updateDebateInHistory: (
    debateId: string,
    updates: Partial<DebateSession>
  ) => void;
  setDebateHistoryLoading: (loading: boolean) => void;
  setShowDebatePanel: (show: boolean) => void;
  setShowDebateHistory: (show: boolean) => void;
  setDebateMode: (enabled: boolean) => void;
  clearActiveDebate: () => void;
}

/**
 * Complete store state combining all slices
 */
export interface AppState
  extends ChatSlice,
    ModeSlice,
    ComponentsSlice,
    VersionControlSlice,
    UISlice,
    DataSlice,
    DocumentationSlice,
    FileStorageSlice,
    CollaborationSlice,
    TaskSlice,
    ActivitySlice,
    DebateSlice {}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

/**
 * Main Zustand store with all slices
 */
export const useAppStore = create<AppState>()(
  devtools(
    immer((set, _get) => ({
      // ========================================================================
      // CHAT SLICE
      // ========================================================================
      chatMessages: [],
      userInput: "",
      isGenerating: false,
      generationProgress: "",

      setChatMessages: (messages) =>
        set((state) => ({
          chatMessages:
            typeof messages === "function"
              ? messages(state.chatMessages)
              : messages,
        })),
      setUserInput: (input) => set({ userInput: input }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationProgress: (progress) =>
        set({ generationProgress: progress }),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
      clearChatMessages: () => set({ chatMessages: [] }),

      // ========================================================================
      // MODE SLICE
      // ========================================================================
      currentMode: "PLAN",
      lastUserRequest: "",

      setCurrentMode: (mode) => set({ currentMode: mode }),
      setLastUserRequest: (request) => set({ lastUserRequest: request }),

      // ========================================================================
      // COMPONENTS SLICE
      // ========================================================================
      components: [],
      currentComponent: null,
      loadingApps: true,
      dbSyncError: null,

      setComponents: (components) =>
        set((state) => ({
          components:
            typeof components === "function"
              ? components(state.components)
              : components,
        })),
      setCurrentComponent: (component) => set({ currentComponent: component }),
      setLoadingApps: (loading) => set({ loadingApps: loading }),
      setDbSyncError: (error) => set({ dbSyncError: error }),
      addComponent: (component) =>
        set((state) => ({
          components: [...state.components, component],
        })),
      updateComponent: (id, updates) =>
        set((state) => ({
          components: state.components.map((comp) =>
            comp.id === id ? { ...comp, ...updates } : comp
          ),
        })),
      removeComponent: (id) =>
        set((state) => ({
          components: state.components.filter((comp) => comp.id !== id),
        })),

      // ========================================================================
      // VERSION CONTROL SLICE
      // ========================================================================
      undoStack: [],
      redoStack: [],
      showVersionHistory: false,

      setUndoStack: (stack) =>
        set((state) => ({
          undoStack:
            typeof stack === "function" ? stack(state.undoStack) : stack,
        })),
      setRedoStack: (stack) =>
        set((state) => ({
          redoStack:
            typeof stack === "function" ? stack(state.redoStack) : stack,
        })),
      setShowVersionHistory: (show) => set({ showVersionHistory: show }),
      pushToUndoStack: (version) =>
        set((state) => ({
          undoStack: [...state.undoStack, version],
        })),
      pushToRedoStack: (version) =>
        set((state) => ({
          redoStack: [...state.redoStack, version],
        })),
      clearRedoStack: () => set({ redoStack: [] }),

      // ========================================================================
      // UI SLICE
      // ========================================================================
      isClient: false,
      activeTab: "chat",
      activeView: "main",
      showLibrary: false,
      showDiffPreview: false,
      showApprovalModal: false,
      showDeploymentModal: false,
      showCompareModal: false,
      showNewAppStagingModal: false,
      showConversationalWizard: false,
      showLayoutBuilder: false,
      showSettings: false,
      showAdvancedPhasedBuild: false,
      showQualityReport: false,
      showPerformanceReport: false,
      showNameAppModal: false,
      searchQuery: "",
      // Preview mode (WebContainers support)
      previewMode: "sandpack",
      webContainerStatus: "idle",

      setIsClient: (isClient) => set({ isClient }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveView: (view) => set({ activeView: view }),
      setShowLibrary: (show) => set({ showLibrary: show }),
      setShowDiffPreview: (show) => set({ showDiffPreview: show }),
      setShowApprovalModal: (show) => set({ showApprovalModal: show }),
      setShowDeploymentModal: (show) => set({ showDeploymentModal: show }),
      setShowCompareModal: (show) => set({ showCompareModal: show }),
      setShowNewAppStagingModal: (show) =>
        set({ showNewAppStagingModal: show }),
      setShowConversationalWizard: (show) =>
        set({ showConversationalWizard: show }),
      setShowLayoutBuilder: (show) => set({ showLayoutBuilder: show }),
      setShowSettings: (show) => set({ showSettings: show }),
      setShowAdvancedPhasedBuild: (show) =>
        set({ showAdvancedPhasedBuild: show }),
      setShowQualityReport: (show) => set({ showQualityReport: show }),
      setShowPerformanceReport: (show) => set({ showPerformanceReport: show }),
      setShowNameAppModal: (show) => set({ showNameAppModal: show }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setWebContainerStatus: (status) => set({ webContainerStatus: status }),

      // ========================================================================
      // DATA SLICE
      // ========================================================================
      pendingChange: null,
      pendingDiff: null,
      pendingNewAppRequest: "",
      deploymentInstructions: null,
      exportingApp: null,
      compareVersions: { v1: null, v2: null },
      currentStagePlan: null,
      newAppStagePlan: null,
      appConcept: null,
      implementationPlan: null,
      qualityReport: null,
      performanceReport: null,
      selectedPhaseId: null,
      isValidating: false,
      uploadedImage: null,
      currentLayoutDesign: null,
      savedLayoutDesigns: [],

      setPendingChange: (change) => set({ pendingChange: change }),
      setPendingDiff: (diff) => set({ pendingDiff: diff }),
      setPendingNewAppRequest: (request) =>
        set({ pendingNewAppRequest: request }),
      setDeploymentInstructions: (instructions) =>
        set({ deploymentInstructions: instructions }),
      setExportingApp: (app) => set({ exportingApp: app }),
      setCompareVersions: (versions) => set({ compareVersions: versions }),
      setCurrentStagePlan: (plan) => set({ currentStagePlan: plan }),
      setNewAppStagePlan: (plan) =>
        set((state) => ({
          newAppStagePlan:
            typeof plan === "function" ? plan(state.newAppStagePlan) : plan,
        })),
      setAppConcept: (concept) => set({ appConcept: concept }),
      setImplementationPlan: (plan) => set({ implementationPlan: plan }),
      setQualityReport: (report) => set({ qualityReport: report }),
      setPerformanceReport: (report) => set({ performanceReport: report }),
      setSelectedPhaseId: (phaseId) => set({ selectedPhaseId: phaseId }),
      setIsValidating: (isValidating) => set({ isValidating }),
      setUploadedImage: (image) => set({ uploadedImage: image }),
      setCurrentLayoutDesign: (design) => set({ currentLayoutDesign: design }),
      setSavedLayoutDesigns: (designs) => set({ savedLayoutDesigns: designs }),
      addSavedLayoutDesign: (design) =>
        set((state) => ({
          savedLayoutDesigns: [...state.savedLayoutDesigns, design],
        })),
      removeSavedLayoutDesign: (id) =>
        set((state) => ({
          savedLayoutDesigns: state.savedLayoutDesigns.filter(
            (d) => d.id !== id
          ),
        })),

      // ========================================================================
      // DOCUMENTATION SLICE
      // ========================================================================
      currentDocumentation: null,
      isLoadingDocumentation: false,
      isSavingDocumentation: false,
      showDocumentationPanel: false,
      documentationPanelTab: "concept",

      setCurrentDocumentation: (doc) => set({ currentDocumentation: doc }),
      setIsLoadingDocumentation: (loading) =>
        set({ isLoadingDocumentation: loading }),
      setIsSavingDocumentation: (saving) =>
        set({ isSavingDocumentation: saving }),
      setShowDocumentationPanel: (show) =>
        set({ showDocumentationPanel: show }),
      setDocumentationPanelTab: (tab) => set({ documentationPanelTab: tab }),

      // ========================================================================
      // FILE STORAGE SLICE
      // ========================================================================
      contentTab: "apps",
      storageFiles: [],
      loadingFiles: false,
      selectedFiles: new Set<string>(),
      fileSearchQuery: "",
      fileTypeFilter: "all",
      fileSortBy: "created_at",
      fileSortOrder: "desc",
      storageStats: null,
      uploadingFiles: new Set<string>(),
      deletingFiles: new Set<string>(),

      setContentTab: (tab) => set({ contentTab: tab }),
      setStorageFiles: (files) => set({ storageFiles: files }),
      setLoadingFiles: (loading) => set({ loadingFiles: loading }),
      setSelectedFiles: (files) => set({ selectedFiles: files }),
      setFileSearchQuery: (query) => set({ fileSearchQuery: query }),
      setFileTypeFilter: (filter) => set({ fileTypeFilter: filter }),
      setFileSortBy: (sortBy) => set({ fileSortBy: sortBy }),
      setFileSortOrder: (order) => set({ fileSortOrder: order }),
      setStorageStats: (stats) => set({ storageStats: stats }),
      setUploadingFiles: (files) => set({ uploadingFiles: files }),
      setDeletingFiles: (files) => set({ deletingFiles: files }),
      toggleFileSelection: (fileId) =>
        set((state) => {
          const newSelection = new Set(state.selectedFiles);
          if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
          } else {
            newSelection.add(fileId);
          }
          return { selectedFiles: newSelection };
        }),
      clearFileSelection: () => set({ selectedFiles: new Set<string>() }),

      // ========================================================================
      // COLLABORATION SLICE
      // ========================================================================
      currentTeamId: null,
      currentTeam: null,
      teams: [],
      teamsLoading: false,
      currentAppAccess: null,
      currentAppCollaborators: [],
      onlineTeamMembers: [],
      showTeamSettings: false,
      showInviteModal: false,
      showAccessModal: false,
      showTeamChat: false,

      setCurrentTeamId: (teamId) => set({ currentTeamId: teamId }),
      setCurrentTeam: (team) => set({ currentTeam: team }),
      setTeams: (teams) => set({ teams }),
      setTeamsLoading: (loading) => set({ teamsLoading: loading }),
      setCurrentAppAccess: (access) => set({ currentAppAccess: access }),
      setCurrentAppCollaborators: (collaborators) =>
        set({ currentAppCollaborators: collaborators }),
      setOnlineTeamMembers: (members) => set({ onlineTeamMembers: members }),
      setShowTeamSettings: (show) => set({ showTeamSettings: show }),
      setShowInviteModal: (show) => set({ showInviteModal: show }),
      setShowAccessModal: (show) => set({ showAccessModal: show }),
      setShowTeamChat: (show) => set({ showTeamChat: show }),
      addTeam: (team) =>
        set((state) => ({
          teams: [...state.teams, team],
        })),
      updateTeam: (teamId, updates) =>
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId ? { ...t, ...updates } : t
          ),
          currentTeam:
            state.currentTeam?.id === teamId
              ? { ...state.currentTeam, ...updates }
              : state.currentTeam,
        })),
      removeTeam: (teamId) =>
        set((state) => ({
          teams: state.teams.filter((t) => t.id !== teamId),
          currentTeam:
            state.currentTeam?.id === teamId ? null : state.currentTeam,
          currentTeamId:
            state.currentTeamId === teamId ? null : state.currentTeamId,
        })),

      // ========================================================================
      // TASK SLICE
      // ========================================================================
      tasks: [],
      tasksLoading: false,
      taskFilters: {},
      selectedTask: null,
      taskComments: [],
      showTaskBoard: false,
      showTaskDetail: false,
      showTaskCreate: false,

      setTasks: (tasks) => set({ tasks }),
      addTask: (task) =>
        set((state) => ({
          tasks: [...state.tasks, task],
        })),
      updateTask: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
          selectedTask:
            state.selectedTask?.id === taskId
              ? { ...state.selectedTask, ...updates }
              : state.selectedTask,
        })),
      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          selectedTask:
            state.selectedTask?.id === taskId ? null : state.selectedTask,
        })),
      setTasksLoading: (loading) => set({ tasksLoading: loading }),
      setTaskFilters: (filters) => set({ taskFilters: filters }),
      setSelectedTask: (task) => set({ selectedTask: task }),
      setTaskComments: (comments) => set({ taskComments: comments }),
      setShowTaskBoard: (show) => set({ showTaskBoard: show }),
      setShowTaskDetail: (show) => set({ showTaskDetail: show }),
      setShowTaskCreate: (show) => set({ showTaskCreate: show }),

      // ========================================================================
      // ACTIVITY SLICE
      // ========================================================================
      activityFeed: [],
      activityLoading: false,
      activityHasMore: true,
      activityFilters: {},

      setActivityFeed: (activities) => set({ activityFeed: activities }),
      appendActivities: (activities) =>
        set((state) => ({
          activityFeed: [...state.activityFeed, ...activities],
        })),
      prependActivity: (activity) =>
        set((state) => ({
          activityFeed: [activity, ...state.activityFeed],
        })),
      setActivityLoading: (loading) => set({ activityLoading: loading }),
      setActivityHasMore: (hasMore) => set({ activityHasMore: hasMore }),
      setActivityFilters: (filters) => set({ activityFilters: filters }),
      clearActivityFeed: () => set({ activityFeed: [], activityHasMore: true }),

      // ========================================================================
      // DEBATE SLICE (Collaborative Multi-AI)
      // ========================================================================
      activeDebate: null,
      isDebating: false,
      debateMessages: [],
      currentSpeaker: null,
      debateCost: null,
      debateHistory: [],
      debateHistoryLoading: false,
      showDebatePanel: false,
      showDebateHistory: false,
      debateMode: false,

      setActiveDebate: (debate) => set({ activeDebate: debate }),
      setIsDebating: (isDebating) => set({ isDebating }),
      addDebateMessage: (message) =>
        set((state) => ({
          debateMessages: [...state.debateMessages, message],
        })),
      setDebateMessages: (messages) => set({ debateMessages: messages }),
      setCurrentSpeaker: (modelId) => set({ currentSpeaker: modelId }),
      setDebateCost: (cost) => set({ debateCost: cost }),
      setDebateHistory: (debates) => set({ debateHistory: debates }),
      addDebateToHistory: (debate) =>
        set((state) => ({
          debateHistory: [debate, ...state.debateHistory],
        })),
      updateDebateInHistory: (debateId, updates) =>
        set((state) => ({
          debateHistory: state.debateHistory.map((d) =>
            d.id === debateId ? { ...d, ...updates } : d
          ),
        })),
      setDebateHistoryLoading: (loading) =>
        set({ debateHistoryLoading: loading }),
      setShowDebatePanel: (show) => set({ showDebatePanel: show }),
      setShowDebateHistory: (show) => set({ showDebateHistory: show }),
      setDebateMode: (enabled) => set({ debateMode: enabled }),
      clearActiveDebate: () =>
        set({
          activeDebate: null,
          isDebating: false,
          debateMessages: [],
          currentSpeaker: null,
          debateCost: null,
        }),
    })),
    {
      name: "app-store",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);

// ============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================================================

/**
 * Select chat-related state (uses shallow comparison to prevent unnecessary re-renders)
 */
export const useChatState = () =>
  useAppStore(
    useShallow((state) => ({
      chatMessages: state.chatMessages,
      userInput: state.userInput,
      isGenerating: state.isGenerating,
      generationProgress: state.generationProgress,
    }))
  );

/**
 * Select mode-related state
 */
export const useModeState = () =>
  useAppStore(
    useShallow((state) => ({
      currentMode: state.currentMode,
      lastUserRequest: state.lastUserRequest,
    }))
  );

/**
 * Select component-related state
 */
export const useComponentsState = () =>
  useAppStore(
    useShallow((state) => ({
      components: state.components,
      currentComponent: state.currentComponent,
      loadingApps: state.loadingApps,
      dbSyncError: state.dbSyncError,
    }))
  );

/**
 * Select version control state
 */
export const useVersionControlState = () =>
  useAppStore(
    useShallow((state) => ({
      undoStack: state.undoStack,
      redoStack: state.redoStack,
      showVersionHistory: state.showVersionHistory,
    }))
  );

/**
 * Select UI state
 */
export const useUIState = () =>
  useAppStore(
    useShallow((state) => ({
      isClient: state.isClient,
      activeTab: state.activeTab,
      activeView: state.activeView,
      showLibrary: state.showLibrary,
      showDiffPreview: state.showDiffPreview,
      showApprovalModal: state.showApprovalModal,
      showDeploymentModal: state.showDeploymentModal,
      showCompareModal: state.showCompareModal,
      showNewAppStagingModal: state.showNewAppStagingModal,
      showConversationalWizard: state.showConversationalWizard,
      showLayoutBuilder: state.showLayoutBuilder,
      showSettings: state.showSettings,
      showAdvancedPhasedBuild: state.showAdvancedPhasedBuild,
      showQualityReport: state.showQualityReport,
      showPerformanceReport: state.showPerformanceReport,
      showNameAppModal: state.showNameAppModal,
      searchQuery: state.searchQuery,
    }))
  );

/**
 * Select layout builder state
 */
export const useLayoutBuilderState = () =>
  useAppStore(
    useShallow((state) => ({
      showLayoutBuilder: state.showLayoutBuilder,
      currentLayoutDesign: state.currentLayoutDesign,
      savedLayoutDesigns: state.savedLayoutDesigns,
    }))
  );

/**
 * Select file storage state
 */
export const useFileStorageState = () =>
  useAppStore(
    useShallow((state) => ({
      contentTab: state.contentTab,
      storageFiles: state.storageFiles,
      loadingFiles: state.loadingFiles,
      selectedFiles: state.selectedFiles,
      fileSearchQuery: state.fileSearchQuery,
      fileTypeFilter: state.fileTypeFilter,
      fileSortBy: state.fileSortBy,
      fileSortOrder: state.fileSortOrder,
      storageStats: state.storageStats,
      uploadingFiles: state.uploadingFiles,
      deletingFiles: state.deletingFiles,
    }))
  );

/**
 * Select documentation state
 */
export const useDocumentationState = () =>
  useAppStore(
    useShallow((state) => ({
      currentDocumentation: state.currentDocumentation,
      isLoadingDocumentation: state.isLoadingDocumentation,
      isSavingDocumentation: state.isSavingDocumentation,
      showDocumentationPanel: state.showDocumentationPanel,
      documentationPanelTab: state.documentationPanelTab,
    }))
  );

/**
 * Select collaboration state
 */
export const useCollaborationState = () =>
  useAppStore(
    useShallow((state) => ({
      currentTeamId: state.currentTeamId,
      currentTeam: state.currentTeam,
      teams: state.teams,
      teamsLoading: state.teamsLoading,
      currentAppAccess: state.currentAppAccess,
      currentAppCollaborators: state.currentAppCollaborators,
      onlineTeamMembers: state.onlineTeamMembers,
      showTeamSettings: state.showTeamSettings,
      showInviteModal: state.showInviteModal,
      showAccessModal: state.showAccessModal,
      showTeamChat: state.showTeamChat,
    }))
  );

/**
 * Select task state
 */
export const useTaskState = () =>
  useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      tasksLoading: state.tasksLoading,
      taskFilters: state.taskFilters,
      selectedTask: state.selectedTask,
      taskComments: state.taskComments,
      showTaskBoard: state.showTaskBoard,
      showTaskDetail: state.showTaskDetail,
      showTaskCreate: state.showTaskCreate,
    }))
  );

/**
 * Select activity state
 */
export const useActivityState = () =>
  useAppStore(
    useShallow((state) => ({
      activityFeed: state.activityFeed,
      activityLoading: state.activityLoading,
      activityHasMore: state.activityHasMore,
      activityFilters: state.activityFilters,
    }))
  );

/**
 * Select debate state (collaborative multi-AI)
 */
export const useDebateState = () =>
  useAppStore(
    useShallow((state) => ({
      activeDebate: state.activeDebate,
      isDebating: state.isDebating,
      debateMessages: state.debateMessages,
      currentSpeaker: state.currentSpeaker,
      debateCost: state.debateCost,
      debateHistory: state.debateHistory,
      debateHistoryLoading: state.debateHistoryLoading,
      showDebatePanel: state.showDebatePanel,
      showDebateHistory: state.showDebateHistory,
      debateMode: state.debateMode,
    }))
  );

export default useAppStore;
