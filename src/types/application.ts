export type Task = {
  name: string;
  status: string;
  assignee: string;
  daysActive: number;
  required: boolean;
};

export type Stage = {
  status: string;
  progress: number;
  tasks: Task[];
};

export type Applicant = {
  id: number;
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
