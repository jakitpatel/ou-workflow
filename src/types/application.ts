export type ApplicantFile = {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: string; // e.g. "245 KB"
  fileType: "APP" | "ING" | "PROD"; // restrict to known types
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

export interface Plant { id:number; plantId:string; name:string; address:any; contact:any; manufacturing:any; otherProducts?:boolean; otherProductsList?:string }

export interface UploadedFile { name:string; type:string; size:string; uploaded:string; tag?:string; processed?:boolean; recordCount?:number }

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
  uploadedFiles?: UploadedFile[];
  ingredients?: any[];
  // ...extend as needed
}
