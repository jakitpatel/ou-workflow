export type ApplicantFile = {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: string; // e.g. "245 KB"
  fileType: "APP" | "ING" | "PROD" | "PDF" | "JPEG"; // restrict to known types
};
// Single application message
export type WFApplicationMessage = {
  id: number;
  fromUser: string;
  toUser: string;
  text: string;
  messageType: "USER" | "SYSTEM";
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW" | "MEDIUM";
  sentDate: string;
  isSystemMessage: boolean;
};

export type Task = {
  name: string;
  status: 'completed' | 'in_progress' | 'overdue' | 'blocked' | 'pending';
  assignee: string;
  daysActive: number;
  required: boolean;
  overdue: number;
  taskRoles?: { taskRole: string }[]
};

export type Stage = {
  status: string;
  progress: number;
  tasks: Task[];
};

export type Applicant = {
  id: number;
  applicationId: number;
  company: string;
  plant: string;
  region: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'MEDIUM';
  status: string; // e.g. 'contract_sent'
  assignedRC: string;
  daysInStage: number;
  overdue: boolean;
  lastUpdate: string;
  nextAction: string;
  documents: number;
  notes: number;
  stages: Record<string, Stage>;
  /** 👇 Matches API response */
  application_messages?: WFApplicationMessage[];
  /** If API sends extra stuff (like aiSuggestions), allow it */
  aiSuggestions?: Record<string, any>;
   /** 👇 New property for applicant files */
  files?: ApplicantFile[];
};

export interface Company {
  name: string;
  category?: string;
  currentlyCertified?: string;
  everCertified?: string;
  address: { street: string; line2?: string; city:string; state:string; country:string; zip:string };
  website?: string;
}

export interface Contact { type:string; name:string; phone?:string; email?:string; title?:string; designated?:boolean }

export interface Plant { id:number; plantId:string; name:string; address:any; contact:any; manufacturing:any; otherProducts?:boolean; otherProductsList?:string, otherPlantsProducing?:boolean, otherPlantsLocation?:string }

export interface UploadedFile { 
  fileId:number; 
  fileType:string; 
  filePath:string; 
  uploadedDate:string; 
  tag?:string; 
  processed?:boolean; 
  recordCount?:number; 
  description?:string;
  fileName?:string | undefined;
  size?:string | undefined;
}

export interface QuoteItem {
  Description: string;
  Amount: string;
  itemId?: number;
}

export interface QuoteData {
  QuoteNumber: string;
  TotalAmount: string;
  validUntil: string;
  Status: 'pending_acceptance' | 'accepted' | 'rejected' | 'expired' | string;
  items: QuoteItem[];
  quoteId?: number;
}

export interface ApplicationDetail {
  applicationId: string;
  status: string;
  submissionDate?: string;
  kashrusCompanyId?: string;
  kashrusStatus?: string;
  primaryContact?: string;
  company: Company;
  contacts: Contact[];
  plants: Plant[];
  products: any[];
  preferences?: any;
  files?: UploadedFile[];
  ingredients?: any[];
  quotes?: QuoteData[]; // <-- added here
}

export interface ApplicationTask {
  TaskCategory: string;          // e.g., "CONFIRMATION"
  applicationId: number;
  id: number;
  assignee: string;              // e.g., "admin"
  assigneeRole: string;          // e.g., "LEGAL", "RFR", "PROD"
  companyId: number;
  companyName: string;
  completedDate: string | null;
  laneName: string;              // e.g., "NDA", "Inspection"
  plantId: number;
  plantName: string;
  processInstanceId: number;
  stageInstanceId: number;
  startedDate: string | null;
  status: "PENDING" | "COMPLETED" | string; // can extend as needed
  taskInstanceId: number;
  taskName: string;              // e.g., "Send NDA"
  taskType: string;              // e.g., "CONFIRM"
  daysActive: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'MEDIUM';
  stageName: string;              // e.g., "Send NDA"
  overdue: number;
}

export interface ApplicationTasksResponse {
  data: ApplicationTask[];
  status: string; // e.g., "ok"
}